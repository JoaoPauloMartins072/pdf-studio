import { ByteReader } from "@/core/parser/byteReader";
import { StubXRefParser, type XRefParser } from "@/core/parser/xrefParser";
import { StubObjectLoader, type ObjectLoader } from "@/core/parser/objectLoader";
import { StubStreamDecoder, type StreamDecoder } from "@/core/parser/streamDecoder";
import {
  StubGraphicsInterpreter,
  type GraphicsInterpreter,
} from "@/core/interpreter/graphicsInterpreter";
import type { DocumentDisplayList } from "@/core/display-list/types";
import {
  DisplayListDocumentModelBuilder,
  StubDocumentModelBuilder,
  type DocumentModelBuilder,
} from "@/core/document-model/builder";
import type { EditableDocument } from "@/core/document-model/types";

/**
 * Official open pipeline:
 *
 * PDF bytes
 *  → Byte Reader
 *  → XRef Parser
 *  → Object Loader
 *  → Stream Decoder
 *  → Graphics Interpreter
 *  → Display List
 *  → Editable Document Model
 *
 * Stage 1: native parse layers remain stubs. Prefer
 * `openDocumentFromDisplayList` with a Display List from the pdf.js bridge
 * (or later from the real Graphics Interpreter).
 */

export type OpenPipelineDeps = {
  xrefParser?: XRefParser;
  objectLoader?: ObjectLoader;
  streamDecoder?: StreamDecoder;
  interpreter?: GraphicsInterpreter;
  modelBuilder?: DocumentModelBuilder;
};

export type OpenDocumentResult = {
  document: EditableDocument;
  displayList: DocumentDisplayList;
  reader: ByteReader | null;
};

/** Build the Editable Document Model from an already-produced Display List. */
export function openDocumentFromDisplayList(
  displayList: DocumentDisplayList,
  sourceName: string,
  modelBuilder: DocumentModelBuilder = new DisplayListDocumentModelBuilder(),
): OpenDocumentResult {
  const document = modelBuilder.build(displayList, sourceName);
  return { document, displayList, reader: null };
}

/**
 * Native byte pipeline (stubs until Stage 1B / full parser).
 * Returns an empty model unless a custom interpreter/builder is injected.
 */
export function openDocumentFromBytes(
  bytes: Uint8Array,
  sourceName: string,
  deps: OpenPipelineDeps = {},
): OpenDocumentResult {
  const reader = new ByteReader(bytes);
  const xrefParser = deps.xrefParser ?? new StubXRefParser();
  const objectLoader = deps.objectLoader ?? new StubObjectLoader();
  const streamDecoder = deps.streamDecoder ?? new StubStreamDecoder();
  const interpreter = deps.interpreter ?? new StubGraphicsInterpreter();
  const modelBuilder = deps.modelBuilder ?? new StubDocumentModelBuilder();

  const xref = xrefParser.parse(reader);
  const loaded = objectLoader.load(reader, xref);

  void streamDecoder;
  void interpreter;
  void loaded;

  const displayList: DocumentDisplayList = { pages: [] };
  const document = modelBuilder.build(displayList, sourceName);

  return { document, displayList, reader };
}
