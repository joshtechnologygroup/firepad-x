import { FirebaseOptions, initializeApp } from "firebase/app";
import { DatabaseReference, child, getDatabase, push, ref } from "firebase/database";

import { Ace, edit } from "ace-builds";

import * as Firepad from "../src";

const getExampleRef = function (): DatabaseReference {
  const database = getDatabase();
  let firebaseRef = ref(database);

  const hash = window.location.hash.replace(/#/g, "");
  if (hash) {
    firebaseRef = child(firebaseRef, hash);
  } else {
    firebaseRef = push(firebaseRef); // generate unique location.
    window.location.replace(window.location + "#" + firebaseRef.key); // add it as a hash to the URL.
  }
  return firebaseRef;
};

const init = function (): void {
  // Initialize Firebase.
  initializeApp(process.env.FIREBASE_CONFIG! as FirebaseOptions);

  // Get Firebase Database reference.
  const firebaseRef = getExampleRef();

  const editor = edit(document.getElementById("firepad")!, {
    maxLines: 50,
    minLines: 10,
    value: "",
    mode: "ace/mode/javascript",
  });

  const firepad = Firepad.fromAceWithFirebase(firebaseRef, editor, {
      userName: `Anonymous ${Math.floor(Math.random() * 100)}`,
      defaultText: 'this is the default text'
    }
  );

  window["firepad"] = firepad;
  window["editor"] = editor;
};

// Initialize the editor in non-blocking way
setTimeout(init);

// Hot Module Replacement Logic
declare var module: NodeModule & {
  hot: { accept(path: string, callback: Function): void };
};

if (module.hot) {
  const onHotReload = function (): void {
    console.clear();
    console.log("Changes detected, recreating Firepad!");

    const Firepad = require("../src/index.ts");

    // Get Editor and Firepad instance
    const editor: Ace.Editor = window["editor"];
    const firepad: Firepad.Firepad = window["firepad"];

    // Get Constructor Options
    const firepadRef = getExampleRef();
    const userId: string | number = firepad.getConfiguration("userId");
    const userName: string = firepad.getConfiguration("userName");

    // Dispose previous connection
    firepad.dispose();

    // Create new connection
    window["firepad"] = Firepad.fromAceWithFirebase(firepadRef, editor, {
      userId,
      userName,
    });
  };

  module.hot.accept("../src/index.ts", onHotReload);
}
