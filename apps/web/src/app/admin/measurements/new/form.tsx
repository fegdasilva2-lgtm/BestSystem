"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeasurement } from "../actions";

export function NewMeasurementForm({ contracts }: { contracts: { id: string; code: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createMeasurement(fd);
      if (r.error) setError(r.error);
      else if (r.id) router.push(`/admin/measurements/${r.id}`);
    });
  }

  // Gerar período atual (YYYY-MM)
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: 700 }}>
      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="form-grid two">
        <label className="field">
          <span>Contrato</span>
          <select name="contract_id" required defaultValue="">
            <option value="" disabled>Selecione...</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Período (YYYY-MM)</span>
          <input name="period" type="month" required defaultValue={currentPeriod} />
        </label>

        <label className="field">
          <span>Valor bruto (R$)</span>
          <input name="gross_amount" type="number" min="0" step="0.01" defaultValue="0" />
        </label>

        <label className="field full">
          <span>Observações</span>
          <textarea name="notes" rows={3} placeholder="Notas internas sobre esta medição..."></textarea>
        </label>
      </div>

      <div className="form-actions" style={{ marginTop: 16 }}>
        <a href="/admin/measurements" className="ghost-button">Cancelar</a>
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "Criando..." : "Criar medição"}
        </button>
      </div>
    </form>
  );
}
