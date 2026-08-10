/**
 * Core smoke — Stages 0–1.
 * Run: npm run core:smoke
 */
import { CommandEngine } from "../src/core/commands/engine.ts";
import { ReplaceTextCommand } from "../src/core/commands/replaceTextCommand.ts";
import { dirtyTextObjects } from "../src/core/document-model/diff.ts";
import { FolioPdfLibSerializer } from "../src/core/serializer/pdfLibSerializer.ts";
import {
  DeleteObjectCommand,
  InsertImageObjectCommand,
  InsertPathObjectCommand,
  MoveObjectCommand,
} from "../src/core/commands/objectCommands.ts";
import {
  AlignObjectsCommand,
  DeleteObjectsCommand,
  DuplicateObjectsCommand,
  MoveObjectsCommand,
  ReorderObjectCommand,
} from "../src/core/commands/selectionCommands.ts";
import { FolioModelRenderer } from "../src/core/renderer/modelRenderer.ts";
import { RecordingRenderTarget } from "../src/core/renderer/recordingTarget.ts";
import { createEmptyDocument, identityMatrix } from "../src/core/document-model/types.ts";
import { dirtyObjectIdSet, dirtyPageObjects } from "../src/core/document-model/diff.ts";
import { DisplayListDocumentModelBuilder } from "../src/core/document-model/builder.ts";
import { BBoxHitTester } from "../src/core/hit-testing/hitTester.ts";
import {
  openDocumentFromBytes,
  openDocumentFromDisplayList,
} from "../src/core/pipeline/openDocument.ts";
import { ByteReader } from "../src/core/parser/byteReader.ts";
import type { DocumentDisplayList } from "../src/core/display-list/types.ts";
import { PDFDocument, StandardFonts } from "pdf-lib";

// --- Stage 0: commands + hit test ---
const doc = createEmptyDocument("demo.pdf");
doc.pages.push({
  id: "page_0",
  index: 0,
  width: 612,
  height: 792,
  rotation: 0,
  resources: { fonts: {}, images: {}, extGStates: {} },
  objects: [
    {
      id: "text_1",
      kind: "text",
      pageId: "page_0",
      bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.03 },
      transform: identityMatrix(),
      editability: "structural",
      zIndex: 1,
      content: "Joao",
      fontResourceId: null,
      fontFamily: null,
      fontSize: 12,
      fillColor: { r: 0, g: 0, b: 0 },
      coverColor: null,
      hasUnicodeMap: true,
    },
  ],
});

const engine = new CommandEngine(doc);
engine.dispatch(new ReplaceTextCommand("text_1", "Maria"));
const after = engine.getDocument().pages[0]!.objects[0]!;
if (after.kind !== "text" || after.content !== "Maria") {
  throw new Error("ReplaceTextCommand failed");
}
engine.undo();
const undone = engine.getDocument().pages[0]!.objects[0]!;
if (undone.kind !== "text" || undone.content !== "Joao") {
  throw new Error("Undo failed");
}

const hit = new BBoxHitTester().hitTest(engine.getDocument(), "page_0", {
  x: 0.15,
  y: 0.11,
});
if (hit?.objectId !== "text_1") throw new Error("Hit test failed");

const opened = openDocumentFromBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "x.pdf");
if (opened.document.pages.length !== 0) throw new Error("Stub open should be empty");

const reader = new ByteReader(new TextEncoder().encode("%PDF-1.4\nstartxref\n"));
if (reader.lastIndexOfAscii("startxref") < 0) throw new Error("ByteReader failed");

// --- Stage 1: Display List → TextObjects ---
const displayList: DocumentDisplayList = {
  pages: [
    {
      pageIndex: 0,
      width: 612,
      height: 792,
      ops: [
        {
          op: "text",
          objectId: "text_dl_0",
          content: "Hello",
          matrix: [12, 0, 0, 12, 72, 720],
          fontSize: 12,
          fontName: "Helvetica",
          fillColor: { r: 0, g: 0, b: 0 },
          bboxNorm: { x: 0.12, y: 0.08, width: 0.1, height: 0.02 },
          hasUnicodeMap: true,
        },
        {
          op: "text",
          content: "World",
          matrix: [12, 0, 0, 12, 200, 720],
          fontSize: 12,
          fontName: "Helvetica",
          fillColor: null,
          bboxNorm: { x: 0.33, y: 0.08, width: 0.1, height: 0.02 },
          hasUnicodeMap: true,
        },
      ],
    },
  ],
};

const built = openDocumentFromDisplayList(
  displayList,
  "stage1.pdf",
  new DisplayListDocumentModelBuilder(),
);
if (built.document.pages.length !== 1) throw new Error("Expected 1 page");
const texts = built.document.pages[0]!.objects.filter((o) => o.kind === "text");
if (texts.length !== 2) throw new Error(`Expected 2 text objects, got ${texts.length}`);
if (texts[0]!.id !== "text_dl_0" || texts[0]!.content !== "Hello") {
  throw new Error("First text object mismatch");
}
if (texts[0]!.editability !== "structural") {
  throw new Error("Expected structural editability");
}
if (!built.document.pages[0]!.resources.fonts["font_Helvetica"]) {
  throw new Error("Expected Helvetica font resource");
}

const hit2 = new BBoxHitTester().hitTest(built.document, "page_0", {
  x: 0.14,
  y: 0.09,
});
if (hit2?.objectId !== "text_dl_0") throw new Error("Stage 1 hit test failed");

// --- Stage 2: z-order hit testing prefers top-most object ---
const stacked: DocumentDisplayList = {
  pages: [
    {
      pageIndex: 0,
      width: 100,
      height: 100,
      ops: [
        {
          op: "text",
          objectId: "under",
          content: "under",
          matrix: identityMatrix(),
          fontSize: 10,
          fontName: null,
          fillColor: null,
          bboxNorm: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
          hasUnicodeMap: true,
        },
        {
          op: "text",
          objectId: "over",
          content: "over",
          matrix: identityMatrix(),
          fontSize: 10,
          fontName: null,
          fillColor: null,
          bboxNorm: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
          hasUnicodeMap: true,
        },
      ],
    },
  ],
};
const stackedDoc = openDocumentFromDisplayList(
  stacked,
  "z.pdf",
  new DisplayListDocumentModelBuilder(),
);
const topHit = new BBoxHitTester().hitTest(stackedDoc.document, "page_0", {
  x: 0.3,
  y: 0.3,
});
if (topHit?.objectId !== "over") {
  throw new Error(`Stage 2 z-order hit expected 'over', got ${topHit?.objectId}`);
}

// --- Stage 3: structural replace + dirty tracking ---
{
  const baseline = openDocumentFromDisplayList(
    displayList,
    "stage3.pdf",
    new DisplayListDocumentModelBuilder(),
  ).document;
  const engine = new CommandEngine(structuredClone(baseline));
  engine.dispatch(new ReplaceTextCommand("text_dl_0", "Ciao"));
  const live = engine.getDocument();
  const dirty = dirtyTextObjects(baseline, live);
  if (dirty.length !== 1 || dirty[0]!.content !== "Ciao") {
    throw new Error("Stage 3 dirty tracking failed");
  }
  engine.undo();
  const undoneObj = engine.getDocument().pages[0]!.objects[0]!;
  if (undoneObj.kind !== "text" || undoneObj.content !== "Hello") {
    throw new Error("Stage 3 command undo failed");
  }
}

// --- Stage 4: FolioPdfLibSerializer is the export path ---
{
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Hello", { x: 72, y: 700, size: 14, font });
  const sourceBytes = await pdf.save();

  const baseline = openDocumentFromDisplayList(
    displayList,
    "stage4.pdf",
    new DisplayListDocumentModelBuilder(),
  ).document;
  const live = structuredClone(baseline);
  const text0 = live.pages[0]!.objects[0]!;
  if (text0.kind !== "text") throw new Error("expected text");
  text0.content = "Ciao";

  const out = await new FolioPdfLibSerializer().serialize({
    sourceBytes: new Uint8Array(sourceBytes),
    document: live,
    baseline,
    pageOrder: [0],
    pageMeta: [{ width: 612, height: 792, rotation: 0 }],
    overlays: [],
  });
  if (out.byteLength < 100) throw new Error("Stage 4 serializer produced empty PDF");
  const head = new TextDecoder().decode(out.slice(0, 5));
  if (head !== "%PDF-") throw new Error("Stage 4 output is not a PDF");
}

// --- Stage 5: FolioModelRenderer paints dirty text from the model ---
{
  const baseline = openDocumentFromDisplayList(
    displayList,
    "stage5.pdf",
    new DisplayListDocumentModelBuilder(),
  ).document;
  const live = structuredClone(baseline);
  const text0 = live.pages[0]!.objects[0]!;
  if (text0.kind !== "text") throw new Error("expected text");
  text0.content = "Rendered";

  const target = new RecordingRenderTarget(612, 792);
  new FolioModelRenderer().renderPage(live, displayList, 0, target, {
    mode: "dirty",
    baseline,
  });

  const texts = target.ops.filter((o) => o.op === "fillText");
  const covers = target.ops.filter((o) => o.op === "fillRect");
  if (covers.length < 1) throw new Error("Stage 5 dirty mode should cover background");
  if (!texts.some((o) => o.op === "fillText" && o.text === "Rendered")) {
    throw new Error("Stage 5 dirty renderer did not paint updated model text");
  }

  const full = new RecordingRenderTarget(200, 200);
  new FolioModelRenderer().renderPage(live, null, 0, full, { mode: "full" });
  if (!full.ops.some((o) => o.op === "fillText" && o.text === "Rendered")) {
    throw new Error("Stage 5 full renderer failed");
  }
  if (!full.ops.some((o) => o.op === "fillText" && o.text === "World")) {
    throw new Error("Stage 5 full renderer missing second text");
  }
}

// --- Stage 6: image / path objects + commands ---
{
  const baseline = openDocumentFromDisplayList(
    {
      pages: [
        {
          pageIndex: 0,
          width: 612,
          height: 792,
          ops: [
            {
              op: "image",
              objectId: "img_0",
              resourceName: "Im1",
              matrix: [100, 0, 0, 80, 72, 600],
              bboxNorm: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
              dataUrl: null,
            },
            {
              op: "drawPath",
              objectId: "path_0",
              pathOps: [
                { op: "moveTo", x: 0.2, y: 0.2 },
                { op: "lineTo", x: 0.4, y: 0.25 },
              ],
              bboxNorm: { x: 0.2, y: 0.2, width: 0.2, height: 0.05 },
              fillColor: null,
              strokeColor: { r: 1, g: 0, b: 0 },
              strokeWidth: 2,
            },
          ],
        },
      ],
    },
    "stage6.pdf",
    new DisplayListDocumentModelBuilder(),
  ).document;

  if (!baseline.pages[0]!.objects.some((o) => o.kind === "image")) {
    throw new Error("Stage 6 builder missing image");
  }
  if (!baseline.pages[0]!.objects.some((o) => o.kind === "path")) {
    throw new Error("Stage 6 builder missing path");
  }

  const engine = new CommandEngine(structuredClone(baseline));
  engine.dispatch(
    new InsertImageObjectCommand(
      0,
      { x: 0.5, y: 0.5, width: 0.2, height: 0.15 },
      "data:image/png;base64,aaa",
    ),
  );
  engine.dispatch(
    new InsertPathObjectCommand(
      0,
      [
        { x: 0.1, y: 0.8 },
        { x: 0.2, y: 0.85 },
      ],
      { r: 0, g: 0, b: 1 },
      2,
    ),
  );
  const live = engine.getDocument();
  const dirty = dirtyPageObjects(baseline, live);
  if (dirty.length < 2) throw new Error("Stage 6 expected inserted dirty objects");

  engine.dispatch(new MoveObjectCommand("img_0", 0.05, 0.02));
  const moved = engine.getDocument().pages[0]!.objects.find((o) => o.id === "img_0");
  if (!moved || Math.abs(moved.bbox.x - 0.15) > 0.0001) {
    throw new Error("Stage 6 MoveObjectCommand failed");
  }

  engine.dispatch(new DeleteObjectCommand("path_0"));
  if (engine.getDocument().pages[0]!.objects.some((o) => o.id === "path_0")) {
    throw new Error("Stage 6 DeleteObjectCommand failed");
  }

  const ids = dirtyObjectIdSet(baseline, engine.getDocument());
  if (!ids.has("img_0")) throw new Error("Stage 6 dirty set missing moved image");

  const target = new RecordingRenderTarget(200, 200);
  new FolioModelRenderer().renderPage(engine.getDocument(), null, 0, target, {
    mode: "full",
  });
  if (!target.ops.some((o) => o.op === "strokePolyline")) {
    throw new Error("Stage 6 renderer should stroke paths");
  }
}

// --- Stage 7: multi-object align / duplicate / z-order ---
{
  const baseline = openDocumentFromDisplayList(
    {
      pages: [
        {
          pageIndex: 0,
          width: 100,
          height: 100,
          ops: [
            {
              op: "text",
              objectId: "a",
              content: "A",
              matrix: identityMatrix(),
              fontSize: 10,
              fontName: null,
              fillColor: null,
              bboxNorm: { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
              hasUnicodeMap: true,
            },
            {
              op: "text",
              objectId: "b",
              content: "B",
              matrix: identityMatrix(),
              fontSize: 10,
              fontName: null,
              fillColor: null,
              bboxNorm: { x: 0.4, y: 0.3, width: 0.1, height: 0.05 },
              hasUnicodeMap: true,
            },
          ],
        },
      ],
    },
    "stage7.pdf",
    new DisplayListDocumentModelBuilder(),
  ).document;

  const engine = new CommandEngine(structuredClone(baseline));
  engine.dispatch(new AlignObjectsCommand(["a", "b"], "left"));
  const aligned = engine.getDocument().pages[0]!.objects;
  const ax = aligned.find((o) => o.id === "a")!.bbox.x;
  const bx = aligned.find((o) => o.id === "b")!.bbox.x;
  if (Math.abs(ax - bx) > 0.0001) throw new Error("Stage 7 align left failed");

  engine.dispatch(new DuplicateObjectsCommand(["a"]));
  if (engine.getDocument().pages[0]!.objects.length !== 3) {
    throw new Error("Stage 7 duplicate failed");
  }

  engine.dispatch(new MoveObjectsCommand(["a", "b"], 0.05, 0));
  engine.dispatch(new ReorderObjectCommand("b", "front"));
  const order = engine.getDocument().pages[0]!.objects.map((o) => o.id);
  if (order[order.length - 1] !== "b") throw new Error("Stage 7 bring to front failed");

  engine.dispatch(new DeleteObjectsCommand(["a", "b"]));
  const left = engine.getDocument().pages[0]!.objects;
  if (left.some((o) => o.id === "a" || o.id === "b")) {
    throw new Error("Stage 7 multi-delete failed");
  }
}

console.log("core-smoke OK (stages 0–7)");
