import React from "react";

import ReactDOM from "react-dom/client";

import App from "./App";

import { BrowserRouter }
from "react-router-dom";

import "./index.css";

import {
  applyTheme
} from "./utils/theme";

applyTheme();

ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <React.StrictMode>

    <BrowserRouter>

      <App />

    </BrowserRouter>

  </React.StrictMode>
);
