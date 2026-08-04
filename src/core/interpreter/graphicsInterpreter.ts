import type { DecodedStream } from "@/core/parser/streamDecoder";
import type { PageDisplayList } from "@/core/display-list/types";

/**
 * Executes content stream operators into a PageDisplayList.
 */

export type GraphicsInterpreterInput = {
  content: DecodedStream;
  pageIndex: number;
  width: number;
  height: number;
};

export interface GraphicsInterpreter {
  interpret(input: GraphicsInterpreterInput): PageDisplayList;
}

/** Stage 0 stub — empty display list. */
export class StubGraphicsInterpreter implements GraphicsInterpreter {
  interpret(input: GraphicsInterpreterInput): PageDisplayList {
    return {
      pageIndex: input.pageIndex,
      width: input.width,
      height: input.height,
      ops: [],
    };
  }
}
