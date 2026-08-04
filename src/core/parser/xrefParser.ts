import type { ByteReader } from "@/core/parser/byteReader";

/**
 * Cross-reference table / stream parser.
 * Must stay separate from Object Loader to support hybrid xrefs and incremental saves.
 */

export type XRefEntry = {
  objectNumber: number;
  generation: number;
  /** Byte offset for in-use objects; free objects use nextFree. */
  offset: number;
  inUse: boolean;
};

export type XRefTable = {
  entries: Map<number, XRefEntry>;
  trailerOffset: number | null;
  /** True when /XRef stream is used (PDF 1.5+). */
  isStream: boolean;
};

export interface XRefParser {
  parse(reader: ByteReader): XRefTable;
}

/**
 * Stage 0 stub — returns empty table.
 * Stage 1 implements classic xref + startxref discovery.
 */
export class StubXRefParser implements XRefParser {
  parse(_reader: ByteReader): XRefTable {
    return {
      entries: new Map(),
      trailerOffset: null,
      isStream: false,
    };
  }
}
