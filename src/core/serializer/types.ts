import type { EditableDocument } from "@/core/document-model/types";

/**
 * Rebuilds PDF bytes from the Editable Document Model (+ optional overlays).
 * Official Stage 4 export path — UI must not call bakeEditsIntoPdf directly.
 */

export type SerializeOptions = {
  /** Prefer object streams when writing. */
  useObjectStreams?: boolean;
};

export type PageSerializeMeta = {
  width: number;
  height: number;
  rotation: number;
};

/** Additive overlays still used by legacy tools (highlight / addText). */
export type SerializeOverlay =
  | {
      kind: "highlight";
      pageIndex: number;
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }
  | {
      kind: "addText";
      pageIndex: number;
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      fontSize: number;
      color: string;
    }
  | {
      kind: "draw";
      pageIndex: number;
      points: { x: number; y: number }[];
      color: string;
      strokeWidth: number;
    }
  | {
      kind: "image";
      pageIndex: number;
      x: number;
      y: number;
      width: number;
      height: number;
      dataUrl: string;
    };

export type SerializeInput = {
  sourceBytes: Uint8Array;
  /** Live Editable Document Model (source of truth). */
  document: EditableDocument;
  /** Model snapshot from open — used to detect structural text diffs. */
  baseline: EditableDocument;
  pageOrder: number[];
  pageMeta: PageSerializeMeta[];
  overlays?: SerializeOverlay[];
  options?: SerializeOptions;
};

export interface DocumentSerializer {
  serialize(input: SerializeInput): Promise<Uint8Array>;
}

/**
 * @deprecated Stage 0 stub — use FolioPdfLibSerializer.
 */
export class NotImplementedSerializer implements DocumentSerializer {
  async serialize(_input: SerializeInput): Promise<Uint8Array> {
    throw new Error("NotImplementedSerializer: use FolioPdfLibSerializer");
  }
}
