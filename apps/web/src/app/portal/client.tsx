"use client";

import { useState, useTransition } from "react";
import { aceitarMedicaoPortal, contestarMedicaoPortal, comentarOSPortal } from "./actions";

interface Contract { id: string; code: string; scope: string; monthly_value: number; billing_rule: string; }
interface Measurement { id: string; contract_id: string; period: string; status: string; gross_amount: number; discount_amount: number; net_amount: number; approved_at: string | null; }
interface WorkOrder { id: string; type: string; priority: string; status: string; description: string; due_at: string | null; completed_at: string | null; contract_id: string; }
interface RgmVersion { id: string; contract_id: string; period: string; approved_at: string; approved_by: string; file_url: string | null; }

interface Props {
  contracts: Contract[];
  measurements: Measurement[];
  workOrders: WorkOrder[];
  rgmVersions: RgmVersion[];
  role: string;
}

const fmtBRL = (n: number) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR") : "-";

export default function PortalClient({ contracts, measurements, workOrders, rgmVersions, role }: Props) {
  const [contestId, setContestId] = useState<string | null>(null);
  const [commentWoId, setCommentWoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAccept(med: Measurement) {
    if (!confirm(`Aceitar medicao ${med.id} (${fmtBRL(med.net_amount)})?`)) return;
    setFeedback(null);
    const fd = new FormData();
    fd.set("measurementId", med.id);
    fd.set("contractId", med.contract_id);
    fd.set("period", med.period);
    startTransition(async () => {
      const r = await aceitarMedicaoPortal(fd);
      setFeedback(r.error ? { type: "err", msg: r.error } : { type: "ok", msg: `Medicao ${med.id} aceita.` });
    });
  }

  function runContest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contestId) return;
    const fd = new FormData(e.currentTarget);
    fd.set("measurementId", contestId);
    startTransition(async () => {
      const r = await contestarMedicaoPortal(fd);
      if (r.error) setFeedback({ type: "err", msg: r.error });
      else {
        setFeedback({ type: "ok", msg: `Contestacao registrada.` });
        setContestId(null);
        e.currentTarget.reset();
      }
    });
  }

  function runComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!commentWoId) return;
    const fd = new FormData(e.currentTarget);
    fd.set("workOrderId", commentWoId);
    startTransition(async () => {
      const r = await comentarOSPortal(fd);
      if (r.error) setFeedback({ type: "err", msg: r.error });
      else {
        setFeedback({ type: "ok", msg: `Comentario registrado.` });
        setCommentWoId(null);
        e.currentTarget.reset();
      }
    });
  }

  const contractLabel = (id: string) => contracts.find((c) => c.id === id)?.code ?? id;
  const medToContest = measurements.find((m) => m.id === contestId);

  return (
    <>
      {feedback ? (
        <p className={`form-${feedback.type === "ok" ? "status" : "error"}`}>{feedback.msg}</p>
      ) : null}

      <section className="section-grid two">
        <article className="glass-card">
          <p className="eyebrow">Medicoes</p>
          <h2>{measurements.length} recentes</h2>
          {measurements.length === 0 ? (
            <p className="muted">Sem medicoes para exibir.</p>
          ) : (
            <ul>
              {measurements.map((m) => (
                <li key={m.id} className="profile-row">
                  <span>
                    <strong>{contractLabel(m.contract_id)} - {m.period}</strong>
                    <small className="muted">{fmtBRL(m.net_amount)} ({m.status})</small>
                  </span>
                  <span className="status-pill">{m.status}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-card">
          <p className="eyebrow">RGMs arquivados</p>
          <h2>{rgmVersions.length} no historico</h2>
          {rgmVersions.length === 0 ? (
            <p className="muted">Sem RGMs arquivados ainda.</p>
          ) : (
            <ul>
              {rgmVersions.map((r) => (
                <li key={r.id} className="profile-row">
                  <span>
                    <strong>{contractLabel(r.contract_id)} - {r.period}</strong>
                    <small className="muted">Por {r.approved_by} em {fmtDate(r.approved_at)}</small>
                  </span>
                  {r.file_url ? (
                    <a className="button-link" href={r.file_url} target="_blank" rel="noreferrer">PDF</a>
                  ) : (
                    <span className="muted">sem PDF</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="form-card">
        <div className="form-grid two">
          <div>
            <p className="eyebrow">Em andamento</p>
            <h2>Ordens de servico</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>OS</th><th>Contrato</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Vencimento</th><th>Acoes</th></tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td><strong>{wo.id}</strong><br /><small>{wo.description?.slice(0, 50)}</small></td>
                  <td>{contractLabel(wo.contract_id)}</td>
                  <td>{wo.type}</td>
                  <td>{wo.priority}</td>
                  <td><span className="status-pill">{wo.status}</span></td>
                  <td>{fmtDate(wo.due_at)}</td>
                  <td>
                    <button className="ghost-button" type="button" onClick={() => setCommentWoId(wo.id)}>Comentar</button>
                  </td>
                </tr>
              ))}
              {workOrders.length === 0 ? (
                <tr><td colSpan={7} className="muted">Nenhuma OS visivel.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {(role === "cliente_gestor" || role === "admin_org") && measurements.some((m) => ["pre_enviada", "em_aceite", "contestada"].includes(m.status)) ? (
        <section className="form-card">
          <h2>Acoes de aceite e contestacao</h2>
          <p className="muted">Aprove ou conteste as medicoes em aberto para o seu tenant.</p>
          <ul>
            {measurements.filter((m) => ["pre_enviada", "em_aceite", "contestada"].includes(m.status)).map((m) => (
              <li key={m.id} className="profile-row">
                <span>
                  <strong>{contractLabel(m.contract_id)} - {m.period}</strong>
                  <small className="muted">{fmtBRL(m.net_amount)} ({m.status})</small>
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button className="primary-button" type="button" onClick={() => runAccept(m)} disabled={isPending}>Aceitar</button>
                  <button className="ghost-button" type="button" onClick={() => setContestId(m.id)} disabled={isPending}>Contestar</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {medToContest ? (
        <section className="form-card">
          <h2>Contestar medicao {medToContest.id}</h2>
          <form onSubmit={runContest} className="form-grid">
            <label className="field">
              <span>Valor contestado (R$)</span>
              <input name="amount" type="number" min="0.01" step="0.01" required />
            </label>
            <label className="field full">
              <span>Motivo</span>
              <textarea name="reason" required rows={3} placeholder="Ex: item em duplicidade, valor acima do combinado..."></textarea>
            </label>
            <div className="form-actions field full">
              <button type="button" className="ghost-button" onClick={() => setContestId(null)}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={isPending}>Registrar contestacao</button>
            </div>
          </form>
        </section>
      ) : null}

      {commentWoId ? (
        <section className="form-card">
          <h2>Comentar OS {commentWoId}</h2>
          <form onSubmit={runComment} className="form-grid">
            <label className="field full">
              <span>Comentario</span>
              <textarea name="comment" required rows={3} placeholder="Observacao, pedido de informacao, satisfacao..."></textarea>
            </label>
            <div className="form-actions field full">
              <button type="button" className="ghost-button" onClick={() => setCommentWoId(null)}>Cancelar</button>
              <button type="submit" className="primary-button" disabled={isPending}>Enviar comentario</button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
