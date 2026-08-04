import type {
  EditableDocument,
  ObjectId,
  PageObject,
} from "@/core/document-model/types";
import { identityMatrix } from "@/core/document-model/types";
import type { CommandResult, FolioCommand } from "@/core/commands/types";
import { findObject, mapObjects, shiftObject } from "@/core/commands/objectCommands";

export type AlignMode =
  | "left"
  | "right"
  | "centerX"
  | "top"
  | "bottom"
  | "centerY";

export type ZOrderMode = "front" | "back" | "forward" | "backward";

/** Run several commands as one undo step. */
export class CompositeCommand implements FolioCommand {
  readonly type = "Composite";

  constructor(
    private readonly commands: FolioCommand[],
    private readonly label: string,
  ) {}

  execute(document: EditableDocument): CommandResult {
    let doc = document;
    for (const cmd of this.commands) {
      doc = cmd.execute(doc).document;
    }
    return { document: doc, label: this.label };
  }

  undo(document: EditableDocument): CommandResult {
    let doc = document;
    for (let i = this.commands.length - 1; i >= 0; i--) {
      doc = this.commands[i]!.undo(doc).document;
    }
    return { document: doc, label: `Undo ${this.label}` };
  }
}

export class MoveObjectsCommand implements FolioCommand {
  readonly type = "MoveObjects";

  constructor(
    private readonly objectIds: ObjectId[],
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  execute(document: EditableDocument): CommandResult {
    const ids = new Set(this.objectIds);
    return {
      document: mapObjects(document, (obj) =>
        ids.has(obj.id) ? shiftObject(obj, this.dx, this.dy) : obj,
      ),
      label: this.objectIds.length > 1 ? "Move objects" : "Move object",
    };
  }

  undo(document: EditableDocument): CommandResult {
    const ids = new Set(this.objectIds);
    return {
      document: mapObjects(document, (obj) =>
        ids.has(obj.id) ? shiftObject(obj, -this.dx, -this.dy) : obj,
      ),
      label: "Undo move",
    };
  }
}

export class DeleteObjectsCommand implements FolioCommand {
  readonly type = "DeleteObjects";
  private removed: Array<{ pageId: string; index: number; object: PageObject }> = [];

  constructor(private readonly objectIds: ObjectId[]) {}

  execute(document: EditableDocument): CommandResult {
    const ids = new Set(this.objectIds);
    this.removed = [];
    for (const page of document.pages) {
      page.objects.forEach((obj, index) => {
        if (ids.has(obj.id)) {
          this.removed.push({ pageId: page.id, index, object: obj });
        }
      });
    }
    if (this.removed.length === 0) {
      throw new Error("DeleteObjectsCommand: nothing to delete");
    }
    return {
      document: {
        ...document,
        pages: document.pages.map((page) => ({
          ...page,
          objects: page.objects.filter((o) => !ids.has(o.id)),
        })),
      },
      label: this.removed.length > 1 ? "Delete objects" : "Delete object",
    };
  }

  undo(document: EditableDocument): CommandResult {
    const byPage = new Map<string, Array<{ index: number; object: PageObject }>>();
    for (const item of this.removed) {
      const list = byPage.get(item.pageId) ?? [];
      list.push({ index: item.index, object: item.object });
      byPage.set(item.pageId, list);
    }
    return {
      document: {
        ...document,
        pages: document.pages.map((page) => {
          const inserts = byPage.get(page.id);
          if (!inserts) return page;
          const objects = [...page.objects];
          for (const { index, object } of [...inserts].sort((a, b) => a.index - b.index)) {
            objects.splice(Math.min(index, objects.length), 0, object);
          }
          return { ...page, objects };
        }),
      },
      label: "Undo delete",
    };
  }
}

export class AlignObjectsCommand implements FolioCommand {
  readonly type = "AlignObjects";
  private previous = new Map<ObjectId, PageObject>();

  constructor(
    private readonly objectIds: ObjectId[],
    private readonly mode: AlignMode,
  ) {}

  execute(document: EditableDocument): CommandResult {
    const objs = this.objectIds
      .map((id) => findObject(document, id)?.object)
      .filter((o): o is PageObject => !!o && "bbox" in o);
    if (objs.length < 2) {
      throw new Error("AlignObjectsCommand: need at least 2 objects");
    }

    this.previous.clear();
    for (const obj of objs) this.previous.set(obj.id, structuredClone(obj));

    const left = Math.min(...objs.map((o) => o.bbox.x));
    const right = Math.max(...objs.map((o) => o.bbox.x + o.bbox.width));
    const top = Math.min(...objs.map((o) => o.bbox.y));
    const bottom = Math.max(...objs.map((o) => o.bbox.y + o.bbox.height));
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;

    const ids = new Set(this.objectIds);
    return {
      document: mapObjects(document, (obj) => {
        if (!ids.has(obj.id) || !("bbox" in obj)) return obj;
        let dx = 0;
        let dy = 0;
        switch (this.mode) {
          case "left":
            dx = left - obj.bbox.x;
            break;
          case "right":
            dx = right - (obj.bbox.x + obj.bbox.width);
            break;
          case "centerX":
            dx = centerX - (obj.bbox.x + obj.bbox.width / 2);
            break;
          case "top":
            dy = top - obj.bbox.y;
            break;
          case "bottom":
            dy = bottom - (obj.bbox.y + obj.bbox.height);
            break;
          case "centerY":
            dy = centerY - (obj.bbox.y + obj.bbox.height / 2);
            break;
        }
        return shiftObject(obj, dx, dy);
      }),
      label: `Align ${this.mode}`,
    };
  }

  undo(document: EditableDocument): CommandResult {
    return {
      document: mapObjects(document, (obj) => this.previous.get(obj.id) ?? obj),
      label: "Undo align",
    };
  }
}

export class DuplicateObjectsCommand implements FolioCommand {
  readonly type = "DuplicateObjects";
  private createdIds: ObjectId[] = [];

  constructor(
    private readonly objectIds: ObjectId[],
    private readonly offset = 0.02,
  ) {}

  getCreatedIds(): ObjectId[] {
    return this.createdIds;
  }

  execute(document: EditableDocument): CommandResult {
    this.createdIds = [];
    const clones: Array<{ pageId: string; object: PageObject }> = [];

    for (const id of this.objectIds) {
      const found = findObject(document, id);
      if (!found) continue;
      const newId = `${found.object.id}_copy_${Math.random().toString(36).slice(2, 7)}`;
      this.createdIds.push(newId);
      const shifted = shiftObject(found.object, this.offset, this.offset);
      clones.push({
        pageId: found.pageId,
        object: {
          ...shifted,
          id: newId,
          zIndex: shifted.zIndex + 1,
          transform: shifted.transform ?? identityMatrix(),
        },
      });
    }

    if (clones.length === 0) {
      throw new Error("DuplicateObjectsCommand: nothing to duplicate");
    }

    return {
      document: {
        ...document,
        pages: document.pages.map((page) => {
          const pageClones = clones.filter((c) => c.pageId === page.id).map((c) => c.object);
          if (pageClones.length === 0) return page;
          return { ...page, objects: [...page.objects, ...pageClones] };
        }),
      },
      label: clones.length > 1 ? "Duplicate objects" : "Duplicate object",
    };
  }

  undo(document: EditableDocument): CommandResult {
    const ids = new Set(this.createdIds);
    return {
      document: mapObjects(document, (obj) => (ids.has(obj.id) ? null : obj)),
      label: "Undo duplicate",
    };
  }
}

export class ReorderObjectCommand implements FolioCommand {
  readonly type = "ReorderObject";
  private previousOrder: ObjectId[] | null = null;
  private pageId: string | null = null;

  constructor(
    private readonly objectId: ObjectId,
    private readonly mode: ZOrderMode,
  ) {}

  execute(document: EditableDocument): CommandResult {
    const found = findObject(document, this.objectId);
    if (!found) throw new Error(`ReorderObjectCommand: ${this.objectId} not found`);
    this.pageId = found.pageId;

    return {
      document: {
        ...document,
        pages: document.pages.map((page) => {
          if (page.id !== found.pageId) return page;
          const objects = [...page.objects];
          this.previousOrder = objects.map((o) => o.id);
          const index = objects.findIndex((o) => o.id === this.objectId);
          if (index < 0) return page;
          const [item] = objects.splice(index, 1);
          if (!item) return page;

          switch (this.mode) {
            case "front":
              objects.push(item);
              break;
            case "back":
              objects.unshift(item);
              break;
            case "forward":
              objects.splice(Math.min(index + 1, objects.length), 0, item);
              break;
            case "backward":
              objects.splice(Math.max(index - 1, 0), 0, item);
              break;
          }

          return {
            ...page,
            objects: objects.map((o, z) => ({ ...o, zIndex: z })),
          };
        }),
      },
      label: `Bring ${this.mode}`,
    };
  }

  undo(document: EditableDocument): CommandResult {
    if (!this.previousOrder || !this.pageId) {
      throw new Error("ReorderObjectCommand: nothing to undo");
    }
    const order = this.previousOrder;
    const pageId = this.pageId;
    return {
      document: {
        ...document,
        pages: document.pages.map((page) => {
          if (page.id !== pageId) return page;
          const byId = new Map(page.objects.map((o) => [o.id, o]));
          const objects = order
            .map((id) => byId.get(id))
            .filter((o): o is PageObject => !!o)
            .map((o, z) => ({ ...o, zIndex: z }));
          return { ...page, objects };
        }),
      },
      label: "Undo reorder",
    };
  }
}
