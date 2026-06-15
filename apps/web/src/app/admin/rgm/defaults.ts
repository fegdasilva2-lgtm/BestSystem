import type { RgmBlock } from "./types";

export function defaultBlocks(): RgmBlock[] {
  return [
    { id: "capa", label: "Capa", enabled: true },
    { id: "resumo", label: "Resumo executivo", enabled: true },
    { id: "previsto_realizado", label: "Previsto x Realizado", enabled: true },
    { id: "sla", label: "SLA", enabled: true },
    { id: "chamados", label: "Chamados", enabled: true },
    { id: "medicao", label: "Medição", enabled: true },
    { id: "fotos", label: "Evidência fotográfica", enabled: true },
    { id: "recomendacoes", label: "Recomendações", enabled: true }
  ];
}
