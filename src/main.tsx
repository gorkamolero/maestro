import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@xyflow/react/dist/style.css";
import "./index.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
