import firebase from "firebase/app";
import "firebase/database";
import "firebase/firestore";

import { Ace, edit } from "ace-builds";

import * as Firepad from "../src";

const getExampleRef = function (): firebase.database.Reference {
  let ref = firebase.database().ref();

  const hash = window.location.hash.replace(/#/g, "");
  if (hash) {
    ref = ref.child(hash);
  } else {
    ref = ref.push(); // generate unique location.
    window.location.replace(window.location + "#" + ref.key); // add it as a hash to the URL.
  }
  return ref;
};

const init = function (): void {
  // Initialize Firebase.
  firebase.initializeApp(process.env.FIREBASE_CONFIG!);

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
    const firepadRef: firebase.database.Reference = getExampleRef();
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
