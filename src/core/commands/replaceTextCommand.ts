import type { EditableDocument, ObjectId, TextObject } from "@/core/document-model/types";
import type { CommandResult, FolioCommand } from "@/core/commands/types";

/**
 * Structural text replacement — updates the TextObject in the model.
 * Does not draw white rectangles or overlays; serialization rebuilds content later.
 */
export class ReplaceTextCommand implements FolioCommand {
  readonly type = "ReplaceText";
  private previousContent: string | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly nextContent: string,
  ) {}

  execute(document: EditableDocument): CommandResult {
    const found = findTextObject(document, this.objectId);
    if (!found) {
      throw new Error(`ReplaceTextCommand: text object ${this.objectId} not found`);
    }
    if (found.object.editability !== "structural" && found.object.editability !== "ocr-assisted") {
      throw new Error(
        `ReplaceTextCommand: object ${this.objectId} is ${found.object.editability}, not structurally editable`,
      );
    }
    this.previousContent = found.object.content;
    const nextWidth = Math.max(
      found.object.bbox.width,
      this.nextContent.length * 0.008,
    );
    return {
      document: updateTextContent(document, this.objectId, this.nextContent, nextWidth),
      label: `Replace text`,
    };
  }

  undo(document: EditableDocument): CommandResult {
    if (this.previousContent == null) {
      throw new Error("ReplaceTextCommand: nothing to undo");
    }
    const found = findTextObject(document, this.objectId);
    const width = found
      ? Math.max(found.object.bbox.width, this.previousContent.length * 0.008)
      : undefined;
    return {
      document: updateTextContent(
        document,
        this.objectId,
        this.previousContent,
        width,
      ),
      label: `Undo replace text`,
    };
  }
}

function findTextObject(
  document: EditableDocument,
  objectId: ObjectId,
): { pageIndex: number; objectIndex: number; object: TextObject } | null {
  for (let pageIndex = 0; pageIndex < document.pages.length; pageIndex++) {
    const page = document.pages[pageIndex];
    const objectIndex = page.objects.findIndex((o) => o.id === objectId);
    if (objectIndex < 0) continue;
    const object = page.objects[objectIndex];
    if (object.kind !== "text") return null;
    return { pageIndex, objectIndex, object };
  }
  return null;
}

function updateTextContent(
  document: EditableDocument,
  objectId: ObjectId,
  content: string,
  width?: number,
): EditableDocument {
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      objects: page.objects.map((obj) => {
        if (obj.id !== objectId || obj.kind !== "text") return obj;
        return {
          ...obj,
          content,
          bbox: width != null ? { ...obj.bbox, width } : obj.bbox,
        };
      }),
    })),
  };
}
