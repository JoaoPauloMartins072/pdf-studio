import type { PdfObject } from "@/core/parser/objectLoader";

/**
 * Applies PDF stream filters (FlateDecode, DCTDecode, etc.).
 * Isolated so compression / filter chains stay testable.
 */

export type DecodedStream = {
  bytes: Uint8Array;
  filter: string | null;
};

export interface StreamDecoder {
  decode(stream: Extract<PdfObject, { type: "stream" }>): DecodedStream;
}

/** Stage 0 stub — returns raw stream bytes unchanged. */
export class StubStreamDecoder implements StreamDecoder {
  decode(stream: Extract<PdfObject, { type: "stream" }>): DecodedStream {
    return { bytes: stream.raw, filter: null };
  }
}
