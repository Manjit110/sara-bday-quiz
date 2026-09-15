import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import PlayerPage from "./pages/PlayerPage";
import AdminPage from "./pages/AdminPage";
import WishesPage from "./pages/WishesPage";
import Background from "./components/Background";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Background />
    <HashRouter>
      <Routes>
        <Route path="/" element={<PlayerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/wishes" element={<WishesPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
