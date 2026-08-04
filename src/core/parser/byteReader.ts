/**
 * Lowest parsing layer: random-access bytes and low-level tokens.
 * Future: linearized PDF, incremental updates, damaged-file recovery.
 */

export type ByteSource = Uint8Array;

export class ByteReader {
  constructor(private readonly bytes: ByteSource) {}

  get length(): number {
    return this.bytes.length;
  }

  getBytes(): ByteSource {
    return this.bytes;
  }

  slice(start: number, end?: number): Uint8Array {
    return this.bytes.slice(start, end);
  }

  u8(offset: number): number {
    if (offset < 0 || offset >= this.bytes.length) {
      throw new RangeError(`ByteReader.u8: offset ${offset} out of range`);
    }
    return this.bytes[offset]!;
  }

  /**
   * Find the last occurrence of ASCII needle (e.g. "startxref").
   * Stub helper for XRef discovery.
   */
  lastIndexOfAscii(needle: string): number {
    const n = new TextEncoder().encode(needle);
    outer: for (let i = this.bytes.length - n.length; i >= 0; i--) {
      for (let j = 0; j < n.length; j++) {
        if (this.bytes[i + j] !== n[j]) continue outer;
      }
      return i;
    }
    return -1;
  }
}
