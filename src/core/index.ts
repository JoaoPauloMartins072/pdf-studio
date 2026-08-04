/**
 * folio-core — PDF engine independent of React / Next.js UI.
 *
 * Layer map:
 *   parser/          Byte Reader → XRef → Object Loader → Stream Decoder
 *   interpreter/     Graphics Interpreter
 *   display-list/    Paint ops (not the edit surface)
 *   document-model/  Editable Document Model (source of truth)
 *   hit-testing/     Coordinate → object
 *   commands/        Only mutation path (undo/redo)
 *   renderer/        Preview without React
 *   serializer/      Model → PDF bytes (structural)
 *   pipeline/        Wires open flow
 *
 * Future extract target: packages/folio-core
 */

export type {
  EditableDocument,
  DocumentPage,
  PageObject,
  TextObject,
  ImageObject,
  PathObject,
  ShapeObject,
  AnnotationObject,
  DocumentResource,
  Editability,
  ObjectId,
  PageId,
  BBox,
  Matrix2D,
  RgbColor,
} from "@/core/document-model/types";

export {
  createEmptyDocument,
  identityMatrix,
} from "@/core/document-model/types";

export type { DocumentModelBuilder } from "@/core/document-model/builder";
export {
  StubDocumentModelBuilder,
  DisplayListDocumentModelBuilder,
} from "@/core/document-model/builder";

export type {
  DisplayListOp,
  PageDisplayList,
  DocumentDisplayList,
} from "@/core/display-list/types";

export type { FolioCommand, CommandResult, HistoryEntry } from "@/core/commands/types";
export { CommandEngine } from "@/core/commands/engine";
export { ReplaceTextCommand } from "@/core/commands/replaceTextCommand";
export {
  DeleteObjectCommand,
  InsertImageObjectCommand,
  InsertPathObjectCommand,
  MoveObjectCommand,
} from "@/core/commands/objectCommands";
export {
  AlignObjectsCommand,
  CompositeCommand,
  DeleteObjectsCommand,
  DuplicateObjectsCommand,
  MoveObjectsCommand,
  ReorderObjectCommand,
} from "@/core/commands/selectionCommands";
export type { AlignMode, ZOrderMode } from "@/core/commands/selectionCommands";

export { ByteReader } from "@/core/parser/byteReader";
export type { XRefParser, XRefTable } from "@/core/parser/xrefParser";
export { StubXRefParser } from "@/core/parser/xrefParser";
export type { ObjectLoader, PdfObject, LoadedObjects } from "@/core/parser/objectLoader";
export { StubObjectLoader } from "@/core/parser/objectLoader";
export type { StreamDecoder, DecodedStream } from "@/core/parser/streamDecoder";
export { StubStreamDecoder } from "@/core/parser/streamDecoder";

export type { GraphicsInterpreter } from "@/core/interpreter/graphicsInterpreter";
export { StubGraphicsInterpreter } from "@/core/interpreter/graphicsInterpreter";

export type { HitTester, HitResult, HitTestPoint } from "@/core/hit-testing/hitTester";
export { BBoxHitTester } from "@/core/hit-testing/hitTester";
export {
  pageIdForIndex,
  findPageObject,
  findTextObject,
  objectsOnPage,
} from "@/core/hit-testing/queries";

export type {
  DocumentSerializer,
  SerializeOptions,
  SerializeInput,
  SerializeOverlay,
  PageSerializeMeta,
} from "@/core/serializer/types";
export { NotImplementedSerializer } from "@/core/serializer/types";
export { FolioPdfLibSerializer } from "@/core/serializer/pdfLibSerializer";

export {
  dirtyTextObjects,
  isTextObjectDirty,
  dirtyPageObjects,
  removedPageObjects,
  dirtyObjectIdSet,
} from "@/core/document-model/diff";

export type {
  DocumentRenderer,
  RenderTarget,
  RenderPageOptions,
  Rgba,
} from "@/core/renderer/types";
export { StubDocumentRenderer, rgbToRgba } from "@/core/renderer/types";
export { Canvas2DRenderTarget } from "@/core/renderer/canvas2dTarget";
export type { Canvas2DLike } from "@/core/renderer/canvas2dTarget";
export { FolioModelRenderer } from "@/core/renderer/modelRenderer";
export { RecordingRenderTarget } from "@/core/renderer/recordingTarget";
export type { RecordedOp } from "@/core/renderer/recordingTarget";

export {
  openDocumentFromBytes,
  openDocumentFromDisplayList,
  type OpenDocumentResult,
  type OpenPipelineDeps,
} from "@/core/pipeline/openDocument";
