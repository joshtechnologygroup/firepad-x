import { DatabaseReference } from "firebase/database";

import { Ace } from "ace-builds";
import { v4 as uuid } from "uuid";

import { Firepad, IFirepad, IFirepadConstructorOptions } from "./firepad";
import { IDatabaseAdapter, UserIDType } from "./database-adapter";
import { FirebaseAdapter } from "./firebase-adapter";
import { ACEAdapter } from "./ace-adapter";
import * as Utils from "./utils";

/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firebase database Reference path.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
export function fromAceWithFirebase(
  databaseRef: string | DatabaseReference,
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

// TODO: Add support for Firestore
/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firestore database document Reference.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
// export function fromAceWithFirestore(
//   databaseRef: DocumentReference, //TODO should we support path : string
//   editor: Ace.Editor,
//   options: Partial<IFirepadConstructorOptions> = {}
// ): IFirepad {
//   // Initialize constructor options with their default values
//   const userId: UserIDType = options.userId || uuid();
//   const userColor: string =
//     options.userColor || Utils.colorFromUserId(userId.toString());
//   const userName: string = options.userName || userId.toString();
//   const defaultText: string = options.defaultText || editor.getValue();

//   let databaseAdapter: IDatabaseAdapter = new FirestoreAdapter(
//     databaseRef,
//     userId,
//     userColor,
//     userName
//   );

//   const editorAdapter = new ACEAdapter(editor);
//   return new Firepad(databaseAdapter, editorAdapter, {
//     userId,
//     userName,
//     userColor,
//     defaultText,
//   });
// }

/**
 * Creates a modern Firepad from Ace editor.
 * @param databaseRef - Firebase database Reference path.
 * @param editor - Ace Editor instance.
 * @param options - Firepad constructor options (optional).
 */
export function fromAce(
  databaseRef: DatabaseReference,
  editor: Ace.Editor,
  options: Partial<IFirepadConstructorOptions> = {}
): IFirepad {
  return fromAceWithFirebase(databaseRef, editor, options);
}
