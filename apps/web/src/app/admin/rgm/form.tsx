"use client";

import { useState, useTransition } from "react";
import { previewRgm, saveRgmTemplate, archiveRgm } from "./actions";
import type { RgmBlock } from "./actions";

interface Contract {
  id: string;
  code: string;
  customer_id: string;
  monthly_value: number;
  billing_rule: string;
  rgm_periodicity: string;
}

interface Props {
  contracts: Contract[];
  initialBlocks: RgmBlock[];
  canArchive: boolean;
}

const BLOCK_LABELS: Record<string, string> = {
  capa: "Capa",
  resumo: "Resumo executivo",
  previsto_realizado: "Previsto x Realizado",
  sla: "SLA",
  chamados: "Chamados",
  medicao: "Medicao",
  fotos: "Evidencia fotografica",
  recomendacoes: "Recomendacoes"
};

export default function RgmForm({ contracts, initialBlocks, canArchive }: Props) {
  const [contractId, setContractId] = useState(contracts[0]?.id ?? "");
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [blocks, setBlocks] = useState<RgmBlock[]>(initialBlocks);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewRgm>>["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [archivedId, setArchivedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleBlock(id: string) {
    setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, enabled: !b.enabled } : b));
  }

  function onPreview() {
    setError(null);
    setArchivedId(null);
    const fd = new FormData();
    fd.set("contractId", contractId);
    fd.set("period", period);
    startTransition(async () => {
      const r = await previewRgm(fd);
      if (r.error) setError(r.error);
      else setPreview(r.data ?? null);
    });
  }

  function onSaveTemplate() {
    setError(null);
    setSavedAt(null);
    const fd = new FormData();
    fd.set("contractId", contractId);
    blocks.forEach((b) => {
      fd.append("blockId", b.id);
      if (b.enabled) fd.set(`block-${b.id}-enabled`, "on");
    });
    startTransition(async () => {
      const r = await saveRgmTemplate(fd);
      if (r.error) setError(r.error);
      else setSavedAt(new Date().toLocaleString("pt-BR"));
    });
  }

  function onArchive() {
    if (!preview) return;
    if (!confirm("Arquivar o RGM como versao imutavel? Esta acao congela o relatorio.")) return;
    setError(null);
    const fd = new FormData();
    fd.set("contractId", contractId);
    fd.set("period", period);
    fd.set("previewJson", JSON.stringify(preview));
    startTransition(async () => {
      const r = await archiveRgm(fd);
      if (r.error) setError(r.error);
      else setArchivedId(r.id ?? null);
    });
  }

  const contract = contracts.find((c) => c.id === contractId);

  return (
    <>
      <section className="form-card">
        <div className="form-grid">
          <label className="field">
            <span>Contrato</span>
            <select value={contractId} onChange={(e) => { setContractId(e.target.value); setPreview(null); }}>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.billing_rule}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Periodo (YYYY-MM)</span>
            <input type="month" value={period} onChange={(e) => { setPeriod(e.target.value); setPreview(null); }} />
          </label>
        </div>

        <div className="block-toggle-grid">
          {blocks.map((b) => (
            <label key={b.id} className={`block-toggle ${b.enabled ? "active" : ""}`}>
              <input type="checkbox" checked={b.enabled} onChange={() => toggleBlock(b.id)} />
              <span>{BLOCK_LABELS[b.id] ?? b.id}</span>
            </label>
          ))}
        </div>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={onPreview} disabled={isPending}>
            {isPending ? "Gerando..." : "Gerar previa"}
          </button>
          <button className="ghost-button" type="button" onClick={onSaveTemplate} disabled={isPending}>
            Salvar template
          </button>
          {savedAt ? <span className="status-pill">Template salvo em {savedAt}</span> : null}
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      {preview ? (
        <section className="report-card">
          <header className="report-head">
            <div>
              <p className="eyebrow">RGM {preview.contractCode} - {preview.period}</p>
              <h2>Relatorio de Gestao Mensal</h2>
            </div>
            {contract ? (
              <div className="report-meta">
                <span><strong>Valor mensal</strong> R$ {Number(contract.monthly_value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span><strong>Regra</strong> {contract.billing_rule}</span>
                <span><strong>Periodicidade</strong> {contract.rgm_periodicity}</span>
              </div>
            ) : null}
          </header>

          {preview.blocks.find((b) => b.id === "resumo" && b.enabled) ? (
            <article className="report-block">
              <h3>Resumo executivo</h3>
              <p>{preview.data.executiveSummary}</p>
            </article>
          ) : null}

          {preview.blocks.find((b) => b.id === "previsto_realizado" && b.enabled) ? (
            <article className="report-block">
              <h3>Previsto x Realizado</h3>
              <ul>
                <li>OS previstas: {preview.data.scheduledWorkOrders}</li>
                <li>OS concluidas: {preview.data.completedWorkOrders}</li>
                <li>OS aprovadas: {preview.data.approvedWorkOrders}</li>
              </ul>
            </article>
          ) : null}

          {preview.blocks.find((b) => b.id === "sla" && b.enabled) ? (
            <article className="report-block">
              <h3>SLA</h3>
              <p>Cumprimento: <strong>{preview.data.onTimePct}%</strong></p>
            </article>
          ) : null}

          {preview.blocks.find((b) => b.id === "chamados" && b.enabled) ? (
            <article className="report-block">
              <h3>Chamados</h3>
              <p>Em triagem: {preview.data.openRequests}</p>
            </article>
          ) : null}

          {preview.blocks.find((b) => b.id === "medicao" && b.enabled) ? (
            <article className="report-block">
              <h3>Medicao</h3>
              {preview.data.measurement ? (
                <ul>
                  <li>Bruto: R$ {preview.data.measurement.gross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
                  <li>Glosa: R$ {preview.data.measurement.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
                  <li>Liquido: R$ {preview.data.measurement.net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
                </ul>
              ) : <p className="muted">Sem medicao aprovada para o periodo.</p>}
            </article>
          ) : null}

          {preview.blocks.find((b) => b.id === "recomendacoes" && b.enabled) ? (
            <article className="report-block">
              <h3>Recomendacoes</h3>
              <ul>
                <li>Reforcar plano de manutencao preventiva nos ativos de criticidade alta.</li>
                <li>Revisar SLA com foco em chamados de prioridade critica.</li>
                <li>Auditoria mensal de glosa para identificar padroes.</li>
              </ul>
            </article>
          ) : null}

          <footer className="report-foot">
            <span className="muted">Gerado em {new Date().toLocaleString("pt-BR")}</span>
            {canArchive ? (
              <button className="primary-button" type="button" onClick={onArchive} disabled={isPending}>
                Arquivar versao
              </button>
            ) : (
              <span className="muted">Apenas cliente_gestor ou admin_org pode arquivar.</span>
            )}
            {archivedId ? <span className="status-pill">Arquivado: {archivedId}</span> : null}
          </footer>
        </section>
      ) : null}
    </>
  );
}
