"use client";

import { useState, useTransition } from "react";
import { submitMeasurement, approveMeasurement, rejectMeasurement } from "../actions";

interface Props {
  measId: string;
  status: string;
}

export function MeasurementActions({ measId, status }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const r = await submitMeasurement(measId);
      if (r.error) setError(r.error);
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const r = await approveMeasurement(measId);
      if (r.error) setError(r.error);
    });
  }

  function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await rejectMeasurement(measId, reason);
      if (r.error) setError(r.error);
      else setShowReject(false);
    });
  }

  return (
    <section className="glass-card" style={{ marginTop: 14 }}>
      <p className="eyebrow">Ações</p>
      {error && <p className="form-error" style={{ marginBottom: 10 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {status === "rascunho" && (
          <button className="primary-button" type="button" disabled={isPending} onClick={handleSubmit}>
            Enviar para aceite
          </button>
        )}
        {["pre_enviada", "em_aceite", "contestada"].includes(status) && (
          <>
            <button className="primary-button" type="button" disabled={isPending} onClick={handleApprove}>
              Aprovar
            </button>
            {!showReject && (
              <button className="ghost-button" type="button" disabled={isPending} onClick={() => setShowReject(true)}>
                Contestar
              </button>
            )}
          </>
        )}
      </div>

      {showReject && (
        <form onSubmit={handleReject} style={{ marginTop: 12 }}>
          <label className="field" style={{ maxWidth: 500 }}>
            <span>Motivo da contestação</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Ex: valor divergente do contrato, item duplicado..."
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" className="ghost-button" disabled={isPending || !reason.trim()}>
              Confirmar contestação
            </button>
            <button type="button" className="button-link" onClick={() => setShowReject(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
