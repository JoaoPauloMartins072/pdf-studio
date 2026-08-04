import type { EditableDocument } from "@/core/document-model/types";
import type {
  CommandEngineOptions,
  FolioCommand,
  HistoryEntry,
} from "@/core/commands/types";

const DEFAULT_MAX_HISTORY = 100;

/**
 * Dispatches commands against an EditableDocument and maintains undo/redo stacks.
 * UI layers must call `dispatch` — never mutate the document directly.
 */
export class CommandEngine {
  private document: EditableDocument;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private readonly maxHistory: number;
  private listeners = new Set<(doc: EditableDocument) => void>();

  constructor(document: EditableDocument, options: CommandEngineOptions = {}) {
    this.document = document;
    this.maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
  }

  getDocument(): EditableDocument {
    return this.document;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null;
  }

  getRedoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null;
  }

  subscribe(listener: (doc: EditableDocument) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(command: FolioCommand): EditableDocument {
    const revisionBefore = this.document.revision;
    const result = command.execute(this.document);
    this.document = bumpRevision(result.document, revisionBefore);
    this.undoStack.push({
      command,
      label: result.label,
      revisionBefore,
      revisionAfter: this.document.revision,
    });
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
    return this.document;
  }

  undo(): EditableDocument | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    const result = entry.command.undo(this.document);
    this.document = bumpRevision(result.document, this.document.revision);
    this.redoStack.push(entry);
    this.notify();
    return this.document;
  }

  redo(): EditableDocument | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    const result = entry.command.execute(this.document);
    this.document = bumpRevision(result.document, this.document.revision);
    this.undoStack.push({
      ...entry,
      revisionBefore: entry.revisionAfter,
      revisionAfter: this.document.revision,
    });
    this.notify();
    return this.document;
  }

  /** Replace document without history (e.g. after open/parse). */
  reset(document: EditableDocument): void {
    this.document = document;
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.document);
  }
}

function bumpRevision(doc: EditableDocument, from: number): EditableDocument {
  if (doc.revision > from) return doc;
  return { ...doc, revision: from + 1 };
}
