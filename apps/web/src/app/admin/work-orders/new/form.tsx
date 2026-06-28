"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder } from "../actions";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";

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
        <Select
          name="type"
          label="Tipo"
          required
          placeholder="Selecione..."
          options={[
            { value: "preventiva", label: "Preventiva" },
            { value: "corretiva", label: "Corretiva" },
            { value: "corretiva_programada", label: "Corretiva programada" },
            { value: "preditiva", label: "Preditiva" },
            { value: "inspecao", label: "Inspeção" },
            { value: "ronda", label: "Ronda" },
            { value: "melhoria", label: "Melhoria" },
            { value: "instalacao", label: "Instalação" },
            { value: "emergencia", label: "Emergência" },
            { value: "avulsa", label: "Avulsa" },
          ]}
        />

        <Select
          name="priority"
          label="Prioridade"
          required
          placeholder="Selecione..."
          options={[
            { value: "baixa", label: "Baixa" },
            { value: "media", label: "Média" },
            { value: "alta", label: "Alta" },
            { value: "critica", label: "Crítica" },
          ]}
        />

        <Select
          name="contract_id"
          label="Contrato"
          placeholder="Nenhum"
          options={contracts.map((c) => ({ value: c.id, label: c.code }))}
        />

        <Field name="due_at" label="Prazo" type="date" />

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