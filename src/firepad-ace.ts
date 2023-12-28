import { v4 as uuid } from "uuid";
import firebase from "firebase/app";

import { IDatabaseAdapter, UserIDType } from "./database-adapter";
import { FirebaseAdapter } from "./firebase-adapter";
import { Firepad, IFirepad, IFirepadConstructorOptions } from "./firepad";
import * as Utils from "./utils";
import { FirestoreAdapter } from "./firestore-adapter";
import { Ace } from "ace-builds";
import { ACEAdapter } from "./ace-adapter";

/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firebase database Reference path.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
export function fromAceWithFirebase(
  databaseRef: string | firebase.database.Reference,
  editor: Ace.Editor,
  options: Partial<IFirepadConstructorOptions> = {}
): IFirepad {
  // Initialize constructor options with their default values
  const userId: UserIDType = options.userId || uuid();
  const userColor: string =
    options.userColor || Utils.colorFromUserId(userId.toString());
  const userName: string = options.userName || userId.toString();
  const defaultText: string = options.defaultText || editor.getValue();

  let databaseAdapter: IDatabaseAdapter = new FirebaseAdapter(
    databaseRef,
    userId,
    userColor,
    userName
  );

  const editorAdapter = new ACEAdapter(editor);
  return new Firepad(databaseAdapter, editorAdapter, {
    userId,
    userName,
    userColor,
    defaultText,
  });
}

/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firestore database document Reference.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
export function fromAceWithFirestore(
  databaseRef: firebase.firestore.DocumentReference, //TODO should we support path : string
  editor: Ace.Editor,
  options: Partial<IFirepadConstructorOptions> = {}
): IFirepad {
  // Initialize constructor options with their default values
  const userId: UserIDType = options.userId || uuid();
  const userColor: string =
    options.userColor || Utils.colorFromUserId(userId.toString());
  const userName: string = options.userName || userId.toString();
  const defaultText: string = options.defaultText || editor.getValue();

  let databaseAdapter: IDatabaseAdapter = new FirestoreAdapter(
    databaseRef,
    userId,
    userColor,
    userName
  );

  const editorAdapter = new ACEAdapter(editor);
  return new Firepad(databaseAdapter, editorAdapter, {
    userId,
    userName,
    userColor,
    defaultText,
  });
}

/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firebase database Reference path.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
export function fromAce(
  databaseRef: string | firebase.database.Reference,
  editor: Ace.Editor,
  options: Partial<IFirepadConstructorOptions> = {}
): IFirepad {
  return fromAceWithFirebase(databaseRef, editor, options);
}
