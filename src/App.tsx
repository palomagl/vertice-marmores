import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Configurador } from "@/components/Configurador";
import { Proposta } from "@/pages/Proposta";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Configurador />} />
        <Route path="/proposta" element={<Proposta />} />
      </Routes>
    </BrowserRouter>
  );
}
