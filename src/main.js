import "./styles.css";
import { loadState } from "./state.js";
import { mountApp } from "./ui.js";

let state = loadState();

mountApp(state, nextState => {
  state = nextState;
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // La app funciona igual sin service worker.
    });
  });
}
