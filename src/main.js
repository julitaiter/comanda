import "./styles.css";
import { inject } from "@vercel/analytics";
import { loadState } from "./state.js";
import { mountApp } from "./ui.js";

let state = loadState();

mountApp(state, nextState => {
  state = nextState;
});

inject();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // La app funciona igual sin service worker.
    });
  });
}