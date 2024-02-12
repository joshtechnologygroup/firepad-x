import { Ace, Range } from 'ace-builds';

import {
  ClientIDType,
  EditorAdapterEvent,
  EditorEventCallbackType,
  IEditorAdapter,
  IEditorAdapterEvent,
  UndoRedoCallbackType,
} from "./editor-adapter";
import { EventListenerType } from './emitter';
import { Cursor, ICursor } from './cursor';
import { IDisposable } from './utils';
import { ITextOperation, TextOperation } from './text-operation';

export class ACEAdapter implements IEditorAdapter {
  ignoreChanges = false;
  private ace: Ace.Editor;
  private aceSession: Ace.EditSession;
  private aceDoc: Ace.Document;
  private lastDocLines: string[];
  private lastCursorRange: Ace.Range;
  private otherCursors: object;
  private addedStyleRules: Record<string, boolean>;
  private addedStyleSheet: CSSStyleSheet | null;
  private callbacks: EditorEventCallbackType;
  private aceRange;

  constructor(aceInstance: Ace.Editor) {
    this.ace = aceInstance;
    this.aceSession = this.ace.getSession();
    this.aceDoc = this.aceSession.getDocument();
    this.aceDoc.setNewLineMode("unix");
    this.grabDocumentState();
    this.ace.on("change", this.onChange);
    this.ace.on("blur", this.onBlur);
    this.ace.on("focus", this.onFocus);
    this.aceSession.selection.on("changeCursor", this.onCursorActivity);
    this.aceRange = Range;
  }

  detach(): void {
    this.ace.removeListener("change", this.onChange);
    this.ace.removeListener("blur", this.onBlur);
    this.ace.removeListener("focus", this.onFocus);
    this.aceSession.selection.removeListener(
      "changeCursor",
      this.onCursorActivity
    );
  }

  getValue(): string {
    return this.aceDoc.getValue();
  }

  getCursor(): Cursor {
    try {
      let start = this.indexFromPos(
        this.aceSession.selection.getRange().start,
        this.aceDoc.getAllLines()
      );
      let end = this.indexFromPos(
        this.aceSession.selection.getRange().end,
        this.aceDoc.getAllLines()
      );
      if (start > end) {
        [start, end] = [end, start];
      }
      return new Cursor(start, end);
    } catch (e) {
      try {
        let start = this.indexFromPos(this.lastCursorRange.start);
        let end = this.indexFromPos(this.lastCursorRange.end);
        if (start > end) {
          [start, end] = [end, start];
        }
        return new Cursor(start, end);
      } catch (e2) {
        console.log(
          "Couldn't figure out the cursor range:",
          e2,
          "-- setting it to 0:0."
        );
        return new Cursor(0, 0);
      }
    }
  }

  setCursor(cursor: ICursor): void {
    const { position, selectionEnd } = cursor.toJSON();
    let start = this.posFromIndex(position);
    let end = this.posFromIndex(selectionEnd);
    if (position > selectionEnd) {
      [start, end] = [end, start];
    }
    this.aceSession.selection.setSelectionRange(
      new this.aceRange(start.row, start.column, end.row, end.column)
    );
  }

  setOtherCursor(
    clientID: ClientIDType,
    cursor: ICursor,
    userColor: string,
    userName?: string
  ): IDisposable {
    const { position, selectionEnd } = cursor.toJSON();
    this.otherCursors = this.otherCursors || {};
    let cursorRange = this.otherCursors[clientID];
    if (cursorRange) {
      cursorRange.start.detach();
      cursorRange.end.detach();
      this.aceSession.removeMarker(cursorRange.id);
    }
    let start = this.posFromIndex(position);
    let end = this.posFromIndex(selectionEnd);
    if (selectionEnd < position) {
      [start, end] = [end, start];
    }
    let clazz = `other-client-selection-${userColor?.replace("#", "")}`;
    const justCursor = position === selectionEnd;
    if (justCursor) {
      clazz = clazz.replace("selection", "cursor");
    }
    const css = `.${clazz} {
      position: absolute;
      background-color: ${justCursor ? "transparent" : userColor};
      border-left: 2px solid ${userColor};
    }`;
    this.addStyleRule(css);
    this.otherCursors[clientID] = cursorRange = new this.aceRange(
      start.row,
      start.column,
      end.row,
      end.column
    );
    cursorRange.start = this.aceDoc.createAnchor(cursorRange.start, 0);
    cursorRange.end = this.aceDoc.createAnchor(cursorRange.end, 0);
    cursorRange.id = this.aceSession.addMarker(cursorRange, clazz, "text");
    return {
      dispose: () => {
        cursorRange.start.detach();
        cursorRange.end.detach();
        this.aceSession.removeMarker(cursorRange.id);
      },
    };
  }

  registerCallbacks(callbacks: EditorEventCallbackType): void {
    this.callbacks = callbacks;
  }

  applyOperation(operation: ITextOperation): void {
    this.ignoreChanges = !operation.isNoop();
    this.applyOperationToACE(operation);
    this.ignoreChanges = false;
  }

  registerUndo(undoFn: UndoRedoCallbackType): void {
    this.ace.undo = undoFn;
  }

  registerRedo(redoFn: UndoRedoCallbackType): void {
    this.ace.redo = redoFn;
  }

  invertOperation(operation: ITextOperation): ITextOperation {
    return operation.invert(this.getValue());
  }

  getText(): string {
    return this.aceDoc.getValue();
  }

  setText(text: string): void {
    this.aceDoc.setValue(text);
  }

  setInitiated(init: boolean): void {}

  on(
    event: EditorAdapterEvent,
    listener: EventListenerType<IEditorAdapterEvent>
  ): void {}

  off(
    event: EditorAdapterEvent,
    listener: EventListenerType<IEditorAdapterEvent>
  ): void {}

  dispose(): void {
    console.log('DISPOSE CALLED');
    this.detach();
    // this.ace.destroy();
  }

  private grabDocumentState(): void {
    this.lastDocLines = this.aceDoc.getAllLines();
    this.lastCursorRange = this.aceSession.selection.getRange();
  }

  private onChange = (change): void => {
    if (!this.ignoreChanges) {
      const pair = this.operationFromACEChange(change);
      this.trigger("change", ...pair);
      this.grabDocumentState();
    }
  };

  private onBlur = (): void => {
    if (this.ace.selection.isEmpty()) {
      this.trigger("blur");
    }
  };

  private onFocus = (): void => {
    this.trigger("focus");
  };

  private onCursorActivity = (): void => {
    setTimeout(() => {
      this.trigger("cursorActivity");
    }, 0);
  };

  private operationFromACEChange(change): TextOperation[] {
    let text: string;
    let start: number;
    if (change.data) {
      const delta = change.data;
      if (delta.action === "insertLines" || delta.action === "removeLines") {
        text = delta.lines.join("\n") + "\n";
      } else {
        text = delta.text.replace(this.aceDoc.getNewLineCharacter(), "\n");
      }
      start = this.indexFromPos(delta.range.start);
    } else {
      text = change.lines.join("\n");
      start = this.indexFromPos(change.start);
    }
    let restLength = this.lastDocLines.join("\n").length - start;
    if (change.action === "remove") {
      restLength -= text.length;
    }
    const insert_op = new TextOperation()
      .retain(start, null)
      .insert(text, null)
      .retain(restLength, null);
    const delete_op = new TextOperation()
      .retain(start, null)
      .delete(text)
      .retain(restLength, null);
    if (change.action === "remove") {
      return [delete_op, insert_op];
    } else {
      return [insert_op, delete_op];
    }
  }

  private applyOperationToACE(operation: ITextOperation): void {
    let index = 0;
    for (const op of operation.getOps()) {
      if (op.isRetain()) {
        index += op.chars ?? 0;
      } else if (op.isInsert()) {
        this.aceDoc.insert(this.posFromIndex(index), op.text ?? "");
        index += op.text?.length ?? 0;
      } else if (op.isDelete()) {
        const from = this.posFromIndex(index);
        const to = this.posFromIndex(index + (op.chars ?? 0));
        const range = this.aceRange.fromPoints(from, to);
        this.aceDoc.remove(range);
      }
    }
    this.grabDocumentState();
  }

  private posFromIndex(index: number): Ace.Position {
    for (const [row, line] of this.aceDoc.getAllLines().entries()) {
      if (index <= line.length) {
        return { row: row, column: index };
      }
      index -= line.length + 1;
    }
    return { row: 0, column: index };
  }

  private indexFromPos(pos: Ace.Position, lines?: string[]): number {
    lines = lines || this.lastDocLines;
    let index = 0;
    for (let i = 0; i < pos.row; i++) {
      index += this.lastDocLines[i].length + 1;
    }
    index += pos.column;
    return index;
  }

  private addStyleRule(css: string): void {
    if (!document) {
      return;
    }
    if (!this.addedStyleRules) {
      this.addedStyleRules = {};
      const styleElement = document.createElement("style");
      document.documentElement
        .getElementsByTagName("head")[0]
        .appendChild(styleElement);
      this.addedStyleSheet = styleElement.sheet;
    }
    if (this.addedStyleRules[css]) {
      return;
    }
    this.addedStyleRules[css] = true;
    this.addedStyleSheet?.insertRule(css, 0);
  }

  private trigger(event: string, ...args: TextOperation[]): void {
    if (this.callbacks && this.callbacks[event]) {
      this.callbacks[event].apply(this, args);
    }
  }
}
