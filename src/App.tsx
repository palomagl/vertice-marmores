import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Configurador } from "@/components/Configurador";
import { OrdemServico } from "@/pages/OrdemServico";
import { Precos } from "@/pages/Precos";
import { Projetos } from "@/pages/Projetos";
import { Proposta } from "@/pages/Proposta";
import { useProjectStore } from "@/store/projectStore";

export default function App() {
  const carregado = useProjectStore((s) => s.carregado);
  const hidratar = useProjectStore((s) => s.hidratar);

  useEffect(() => {
    void hidratar();
  }, [hidratar]);

  if (!carregado) {
    return <div className="boot">Carregando…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Projetos />} />
        <Route path="/editor" element={<Configurador />} />
        <Route path="/proposta" element={<Proposta />} />
        <Route path="/ordem-servico" element={<OrdemServico />} />
        <Route path="/precos" element={<Precos />} />
      </Routes>
    </BrowserRouter>
  );
}
