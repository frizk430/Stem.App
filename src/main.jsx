import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Marketing from "./Marketing.jsx";

// The demo site goes straight to the login screen — no need to sell someone on Stem
// again if they're already testing the demo. Everywhere else, /app is the login,
// and everything else shows the public marketing homepage.
const isDemo = window.location.hostname.startsWith("demo.");
const isApp = isDemo || window.location.pathname.startsWith("/app");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isApp ? <App /> : <Marketing />}
  </React.StrictMode>
);
