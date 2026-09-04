import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { aplicarTema, lerTema } from "./lib/tema";
import "./styles.css";

// aplica o tema salvo antes da primeira pintura (evita piscar)
aplicarTema(lerTema());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
