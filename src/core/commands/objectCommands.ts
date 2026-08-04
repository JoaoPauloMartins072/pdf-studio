import type {
  BBox,
  EditableDocument,
  ImageObject,
  ObjectId,
  PageId,
  PageObject,
  PathObject,
  PathOp,
  Point,
} from "@/core/document-model/types";
import { identityMatrix } from "@/core/document-model/types";
import type { CommandResult, FolioCommand } from "@/core/commands/types";

function findObject(
  document: EditableDocument,
  objectId: ObjectId,
): { pageId: PageId; object: PageObject } | null {
  for (const page of document.pages) {
    const object = page.objects.find((o) => o.id === objectId);
    if (object) return { pageId: page.id, object };
  }
  return null;
}

function mapObjects(
  document: EditableDocument,
  fn: (obj: PageObject, pageId: PageId) => PageObject | null,
): EditableDocument {
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      objects: page.objects
        .map((obj) => fn(obj, page.id))
        .filter((o): o is PageObject => o != null),
    })),
  };
}

export class DeleteObjectCommand implements FolioCommand {
  readonly type = "DeleteObject";
  private removed: PageObject | null = null;
  private pageId: PageId | null = null;
  private index = -1;

  constructor(private readonly objectId: ObjectId) {}

  execute(document: EditableDocument): CommandResult {
    for (const page of document.pages) {
      const index = page.objects.findIndex((o) => o.id === this.objectId);
      if (index < 0) continue;
      this.removed = page.objects[index]!;
      this.pageId = page.id;
      this.index = index;
      return {
        document: {
          ...document,
          pages: document.pages.map((p) =>
            p.id === page.id
              ? { ...p, objects: p.objects.filter((o) => o.id !== this.objectId) }
              : p,
          ),
        },
        label: `Delete ${this.removed.kind}`,
      };
    }
    throw new Error(`DeleteObjectCommand: object ${this.objectId} not found`);
  }

  undo(document: EditableDocument): CommandResult {
    if (!this.removed || !this.pageId) {
      throw new Error("DeleteObjectCommand: nothing to undo");
    }
    const removed = this.removed;
    const pageId = this.pageId;
    const index = this.index;
    return {
      document: {
        ...document,
        pages: document.pages.map((page) => {
          if (page.id !== pageId) return page;
          const objects = [...page.objects];
          objects.splice(Math.min(index, objects.length), 0, removed);
          return { ...page, objects };
        }),
      },
      label: `Undo delete`,
    };
  }
}

export class MoveObjectCommand implements FolioCommand {
  readonly type = "MoveObject";

  constructor(
    private readonly objectId: ObjectId,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  execute(document: EditableDocument): CommandResult {
    return {
      document: mapObjects(document, (obj) => {
        if (obj.id !== this.objectId) return obj;
        if (!("bbox" in obj)) return obj;
        return shiftObject(obj, this.dx, this.dy);
      }),
      label: "Move object",
    };
  }

  undo(document: EditableDocument): CommandResult {
    return {
      document: mapObjects(document, (obj) => {
        if (obj.id !== this.objectId) return obj;
        if (!("bbox" in obj)) return obj;
        return shiftObject(obj, -this.dx, -this.dy);
      }),
      label: "Undo move",
    };
  }
}

export class InsertImageObjectCommand implements FolioCommand {
  readonly type = "InsertImage";
  private insertedId: ObjectId | null = null;

  constructor(
    private readonly pageIndex: number,
    private readonly bbox: BBox,
    private readonly dataUrl: string,
    private readonly opts?: { widthPx?: number; heightPx?: number; id?: ObjectId },
  ) {}

  execute(document: EditableDocument): CommandResult {
    const page = document.pages.find((p) => p.index === this.pageIndex);
    if (!page) throw new Error(`InsertImageObjectCommand: page ${this.pageIndex} missing`);

    const id = this.opts?.id ?? `img_ins_${Math.random().toString(36).slice(2, 10)}`;
    this.insertedId = id;
    const resourceId = `imgres_${id}`;
    const image: ImageObject = {
      id,
      kind: "image",
      pageId: page.id,
      bbox: this.bbox,
      transform: identityMatrix(),
      editability: "structural",
      zIndex: page.objects.length,
      resourceId,
      widthPx: this.opts?.widthPx ?? 0,
      heightPx: this.opts?.heightPx ?? 0,
      dataUrl: this.dataUrl,
    };

    return {
      document: {
        ...document,
        pages: document.pages.map((p) => {
          if (p.index !== this.pageIndex) return p;
          return {
            ...p,
            objects: [...p.objects, image],
            resources: {
              ...p.resources,
              images: {
                ...p.resources.images,
                [resourceId]: {
                  id: resourceId,
                  kind: "image",
                  width: image.widthPx,
                  height: image.heightPx,
                  data: null,
                  dataUrl: this.dataUrl,
                },
              },
            },
          };
        }),
      },
      label: "Insert image",
    };
  }

  undo(document: EditableDocument): CommandResult {
    if (!this.insertedId) throw new Error("InsertImageObjectCommand: nothing to undo");
    const id = this.insertedId;
    return {
      document: mapObjects(document, (obj) => (obj.id === id ? null : obj)),
      label: "Undo insert image",
    };
  }
}

export class InsertPathObjectCommand implements FolioCommand {
  readonly type = "InsertPath";
  private insertedId: ObjectId | null = null;

  constructor(
    private readonly pageIndex: number,
    private readonly points: Point[],
    private readonly strokeColor: { r: number; g: number; b: number },
    private readonly strokeWidth: number,
    private readonly opts?: { id?: ObjectId },
  ) {}

  execute(document: EditableDocument): CommandResult {
    const page = document.pages.find((p) => p.index === this.pageIndex);
    if (!page) throw new Error(`InsertPathObjectCommand: page ${this.pageIndex} missing`);
    if (this.points.length < 2) {
      throw new Error("InsertPathObjectCommand: need at least 2 points");
    }

    const id = this.opts?.id ?? `path_ins_${Math.random().toString(36).slice(2, 10)}`;
    this.insertedId = id;
    const xs = this.points.map((p) => p.x);
    const ys = this.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pathOps: PathOp[] = this.points.map((p, i) =>
      i === 0 ? { op: "moveTo", x: p.x, y: p.y } : { op: "lineTo", x: p.x, y: p.y },
    );

    const path: PathObject = {
      id,
      kind: "path",
      pageId: page.id,
      bbox: {
        x: minX,
        y: minY,
        width: Math.max(maxX - minX, 0.001),
        height: Math.max(maxY - minY, 0.001),
      },
      transform: identityMatrix(),
      editability: "structural",
      zIndex: page.objects.length,
      ops: pathOps,
      fillColor: null,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
    };

    return {
      document: {
        ...document,
        pages: document.pages.map((p) =>
          p.index === this.pageIndex ? { ...p, objects: [...p.objects, path] } : p,
        ),
      },
      label: "Insert path",
    };
  }

  undo(document: EditableDocument): CommandResult {
    if (!this.insertedId) throw new Error("InsertPathObjectCommand: nothing to undo");
    const id = this.insertedId;
    return {
      document: mapObjects(document, (obj) => (obj.id === id ? null : obj)),
      label: "Undo insert path",
    };
  }
}

function shiftObject<T extends PageObject>(obj: T, dx: number, dy: number): T {
  if (!("bbox" in obj)) return obj;
  const bbox = {
    ...obj.bbox,
    x: clamp01(obj.bbox.x + dx, obj.bbox.width),
    y: clamp01(obj.bbox.y + dy, obj.bbox.height),
  };

  if (obj.kind === "path") {
    return {
      ...obj,
      bbox,
      ops: obj.ops.map((op) => {
        if (op.op === "moveTo" || op.op === "lineTo") {
          return { ...op, x: op.x + dx, y: op.y + dy };
        }
        if (op.op === "curveTo") {
          return {
            ...op,
            x1: op.x1 + dx,
            y1: op.y1 + dy,
            x2: op.x2 + dx,
            y2: op.y2 + dy,
            x3: op.x3 + dx,
            y3: op.y3 + dy,
          };
        }
        return op;
      }),
    };
  }

  return { ...obj, bbox };
}

function clamp01(v: number, size: number): number {
  return Math.min(1 - size, Math.max(0, v));
}

export { findObject, mapObjects, shiftObject };
