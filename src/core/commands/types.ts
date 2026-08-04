/**
 * Command Engine contracts.
 * All mutations to the Editable Document Model go through commands.
 * Direct assignment (e.g. text.content = "Maria") is not the supported path.
 */

import type { EditableDocument } from "@/core/document-model/types";

export type CommandResult = {
  /** Document after applying the command. */
  document: EditableDocument;
  /** Human-readable label for history UI. */
  label: string;
};

export type FolioCommand = {
  readonly type: string;
  /** Apply against the current document; must not mutate the input in place. */
  execute(document: EditableDocument): CommandResult;
  /** Inverse of execute, using state captured at execute time if needed. */
  undo(document: EditableDocument): CommandResult;
};

export type HistoryEntry = {
  command: FolioCommand;
  label: string;
  revisionBefore: number;
  revisionAfter: number;
};

export type CommandEngineOptions = {
  /** Max undo stack depth. */
  maxHistory?: number;
};
