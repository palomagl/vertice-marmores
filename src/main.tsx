// PRIMEIRO import de propósito: passa as chaves salvas com o nome antigo da
// empresa para os nomes novos antes de qualquer módulo ler o localStorage
// (o store lê o tema já na criação).
import "./lib/migracaoMarca";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { pedirPersistencia } from "./lib/persistencia";
import { aplicarTema, lerTema } from "./lib/tema";
import "./styles.css";

// aplica o tema salvo antes da primeira pintura (evita piscar)
aplicarTema(lerTema());

// pede armazenamento persistente (não bloqueia a renderização)
void pedirPersistencia();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
