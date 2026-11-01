import React from "react";
import ReactDOM from "react-dom/client";
// Fonts ship with the app (no Google Fonts request), so they work offline and nobody else sees visits.
import "@fontsource-variable/figtree";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
