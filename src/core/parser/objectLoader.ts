import type { ByteReader } from "@/core/parser/byteReader";
import type { XRefTable } from "@/core/parser/xrefParser";

/**
 * Resolves indirect objects (obj/endobj) and object streams.
 */

export type PdfObject =
  | { type: "null" }
  | { type: "bool"; value: boolean }
  | { type: "number"; value: number }
  | { type: "string"; value: string; hex: boolean }
  | { type: "name"; value: string }
  | { type: "array"; value: PdfObject[] }
  | { type: "dict"; value: Record<string, PdfObject> }
  | { type: "stream"; dict: Record<string, PdfObject>; raw: Uint8Array }
  | { type: "ref"; objectNumber: number; generation: number };

export type LoadedObjects = {
  byNumber: Map<number, PdfObject>;
};

export interface ObjectLoader {
  load(reader: ByteReader, xref: XRefTable): LoadedObjects;
}

/** Stage 0 stub. */
export class StubObjectLoader implements ObjectLoader {
  load(_reader: ByteReader, _xref: XRefTable): LoadedObjects {
    return { byNumber: new Map() };
  }
}
