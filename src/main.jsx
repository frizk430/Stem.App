import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Marketing from "./Marketing.jsx";
import MenuPage from "./MenuPage.jsx";

// Routing:
//   /menu, /menu/merc, /menu/daddyspipes, /menu/all → public password-gated live menu (no login)
//   demo.thestem.app or /app                        → the app login
//   everything else                                 → public marketing homepage
const isDemo = window.location.hostname.startsWith("demo.");
const isMenu = window.location.pathname.startsWith("/menu");
const isApp = isDemo || window.location.pathname.startsWith("/app");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isMenu ? <MenuPage /> : isApp ? <App /> : <Marketing />}
  </React.StrictMode>
);
