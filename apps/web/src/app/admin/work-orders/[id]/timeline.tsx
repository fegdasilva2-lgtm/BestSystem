"use client";

import { useState, useTransition } from "react";
import { updateWorkOrderStatus } from "../actions";

const STATUS_FLOW: { status: string; label: string }[] = [
  { status: "rascunho", label: "Rascunho" },
  { status: "planejada", label: "Planejada" },
  { status: "liberada", label: "Liberada" },
  { status: "atribuida", label: "Atribuída" },
  { status: "aceita", label: "Aceita" },
  { status: "em_deslocamento", label: "Deslocamento" },
  { status: "em_execucao", label: "Execução" },
  { status: "concluida_tecnico", label: "Concluída" },
  { status: "em_validacao", label: "Validação" },
  { status: "aprovada", label: "Aprovada" },
  { status: "encerrada", label: "Encerrada" },
];

const TRANSITIONS: Record<string, { to: string; label: string }[]> = {
  rascunho: [
    { to: "planejada", label: "Planejar" },
    { to: "cancelada", label: "Cancelar" },
  ],
  planejada: [
    { to: "liberada", label: "Liberar" },
    { to: "cancelada", label: "Cancelar" },
  ],
  liberada: [
    { to: "atribuida", label: "Atribuir" },
    { to: "cancelada", label: "Cancelar" },
  ],
  atribuida: [
    { to: "aceita", label: "Aceitar" },
    { to: "cancelada", label: "Cancelar" },
  ],
  aceita: [
    { to: "em_deslocamento", label: "Iniciar deslocamento" },
    { to: "cancelada", label: "Cancelar" },
  ],
  em_deslocamento: [
    { to: "em_execucao", label: "Iniciar execução" },
    { to: "pausada", label: "Pausar" },
  ],
  em_execucao: [
    { to: "concluida_tecnico", label: "Concluir" },
    { to: "pausada", label: "Pausar" },
    { to: "aguardando_material", label: "Aguardar material" },
    { to: "aguardando_cliente", label: "Aguardar cliente" },
  ],
  pausada: [
    { to: "em_execucao", label: "Retomar" },
    { to: "cancelada", label: "Cancelar" },
  ],
  aguardando_material: [
    { to: "em_execucao", label: "Retomar" },
    { to: "cancelada", label: "Cancelar" },
  ],
  aguardando_cliente: [
    { to: "em_execucao", label: "Retomar" },
    { to: "cancelada", label: "Cancelar" },
  ],
  concluida_tecnico: [
    { to: "em_validacao", label: "Enviar para validação" },
    { to: "em_execucao", label: "Retornar" },
  ],
  em_validacao: [
    { to: "aprovada", label: "Aprovar" },
    { to: "concluida_tecnico", label: "Rejeitar" },
  ],
  aprovada: [{ to: "encerrada", label: "Encerrar" }],
};

interface Props {
  woId: string;
  currentStatus: string;
}

export function WorkOrderTimeline({ woId, currentStatus }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentIdx = STATUS_FLOW.findIndex((s) => s.status === currentStatus);
  const availableTransitions = TRANSITIONS[currentStatus] || [];

  function handleTransition(to: string) {
    setFeedback(null);
    startTransition(async () => {
      const r = await updateWorkOrderStatus(woId, to);
      if (r.error) setFeedback(r.error);
    });
  }

  return (
    <section className="glass-card" style={{ marginTop: 14 }}>
      <p className="eyebrow">Fluxo de status</p>

      {feedback ? <p className="form-error" style={{ marginBottom: 10 }}>{feedback}</p> : null}

      {/* Timeline steps */}
      <div className="wo-timeline">
        {STATUS_FLOW.map((s, i) => {
          const done = i <= currentIdx && currentStatus !== "cancelada";
          const isCurrent = s.status === currentStatus;
          const isCanceled = currentStatus === "cancelada" && i <= STATUS_FLOW.findIndex((x) => x.status === "cancelada");
          return (
            <div
              key={s.status}
              className={`wo-timeline-step ${done ? "done" : ""} ${isCurrent ? "current" : ""} ${isCanceled ? "canceled" : ""}`}
            >
              <div className="wo-step-dot" />
              <span className="wo-step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Ações de transição */}
      {availableTransitions.length > 0 && (
        <div className="wo-actions" style={{ marginTop: 16 }}>
          <p className="muted" style={{ marginBottom: 8 }}>Ações disponíveis:</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {availableTransitions.map((t) => (
              <button
                key={t.to}
                className={t.to === "cancelada" ? "ghost-button" : "primary-button"}
                type="button"
                disabled={isPending}
                onClick={() => handleTransition(t.to)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
