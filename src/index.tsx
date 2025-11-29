import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./presentation/App";
import { ApiConfigProvider } from "./presentation/providers/ApiConfigProvider";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ApiConfigProvider>
      <App />
    </ApiConfigProvider>
  </React.StrictMode>
);
