"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder } from "../actions";

export function NewWorkOrderForm({ contracts }: { contracts: { id: string; code: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createWorkOrder(fd);
      if (r.error) setError(r.error);
      else if (r.id) router.push(`/admin/work-orders/${r.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: 700 }}>
      {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="form-grid two">
        <label className="field">
          <span>Tipo</span>
          <select name="type" required defaultValue="">
            <option value="" disabled>Selecione...</option>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
            <option value="corretiva_programada">Corretiva programada</option>
            <option value="preditiva">Preditiva</option>
            <option value="inspecao">Inspeção</option>
            <option value="ronda">Ronda</option>
            <option value="melhoria">Melhoria</option>
            <option value="instalacao">Instalação</option>
            <option value="emergencia">Emergência</option>
            <option value="avulsa">Avulsa</option>
          </select>
        </label>

        <label className="field">
          <span>Prioridade</span>
          <select name="priority" required defaultValue="">
            <option value="" disabled>Selecione...</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </label>

        <label className="field">
          <span>Contrato</span>
          <select name="contract_id" defaultValue="">
            <option value="">Nenhum</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>{c.code}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Prazo</span>
          <input name="due_at" type="date" />
        </label>

        <label className="field full">
          <span>Descrição</span>
          <textarea name="description" required rows={4} placeholder="Descreva o escopo da OS..."></textarea>
        </label>
      </div>

      <div className="form-actions" style={{ marginTop: 16 }}>
        <a href="/admin/work-orders" className="ghost-button">Cancelar</a>
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "Criando..." : "Criar OS"}
        </button>
      </div>
    </form>
  );
}
