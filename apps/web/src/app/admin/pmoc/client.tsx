"use client";

import { useState, useTransition } from "react";
import { criarPmoc, registrarExecucaoPmoc, listarAlertasPmoc } from "./actions";

interface Plan { id: string; code: string; contract_id: string; site_id: string; starts_on: string; ends_on: string; rt_name: string; rt_crea: string; rt_email: string | null; rt_phone: string | null; art_number: string; art_url: string | null; min_cleaning_frequency: string; active: boolean; }
interface Contract { id: string; code: string; }
interface Site { id: string; name: string; }
interface Activity { id: string; pmoc_plan_id: string; asset_id: string; code: string; name: string; frequency: string; priority: string; }
interface Execution { id: string; pmoc_plan_id: string; pmoc_activity_id: string; asset_id: string; executed_at: string; result: string; photo_count: number; observations: string | null; next_due_at: string; }
interface HvacAsset { id: string; code: string; name: string; type: string; site_id: string; }

interface Props {
  plans: Plan[];
  contracts: Contract[];
  sites: Site[];
  activities: Activity[];
  executions: Execution[];
  hvacAssets: HvacAsset[];
  role: string;
}

const fmtDate = (s: string | null) => s ? new Date(s).toISOString().slice(0, 10) : "-";

export default function PmocClient({ plans, contracts, sites, activities, executions, hvacAssets, role }: Props) {
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const canManage = ["admin_org", "gestor_facilities"].includes(role);
  const canExecute = ["admin_org", "gestor_facilities", "supervisor", "tecnico"].includes(role);

  const planActs = (pid: string) => activities.filter((a) => a.pmoc_plan_id === pid);
  const planExes = (pid: string) => executions.filter((e) => e.pmoc_plan_id === pid);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await criarPmoc(fd);
      if (r.error) setFeedback({ type: "err", msg: r.error });
      else {
        setFeedback({ type: "ok", msg: `PMOC criado. ${r.activityCount} atividade(s) geradas.` });
        setCreating(false);
        e.currentTarget.reset();
      }
    });
  }

  function onExecute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await registrarExecucaoPmoc(fd);
      if (r.error) setFeedback({ type: "err", msg: r.error });
      else setFeedback({ type: "ok", msg: "Execucao PMOC registrada." });
    });
  }

  async function onListAlerts() {
    setFeedback(null);
    const fd = new FormData();
    const r = await listarAlertasPmoc(fd);
    if (r.error) setFeedback({ type: "err", msg: r.error });
    else {
      const arr = r.data as Array<{ planId: string; code: string; alerts: Array<{ kind: string; severity: string; message: string }> }>;
      const total = arr.reduce((s, p) => s + p.alerts.length, 0);
      const critical = arr.flatMap((p) => p.alerts).filter((a) => a.severity === "critica").length;
      setFeedback({ type: "ok", msg: `Recalculado: ${total} alerta(s), ${critical} critico(s).` });
    }
  }

  return (
    <>
      {feedback ? (
        <p className={`form-${feedback.type === "ok" ? "status" : "error"}`}>{feedback.msg}</p>
      ) : null}

      <section className="callout-band">
        <div>
          <p className="eyebrow" style={{ color: "#ffe3d4" }}>Conformidade regulatoria</p>
          <strong>
            O PMOC e gerado a partir de <code>templateAtividadesHVAC</code> (Lei 13.589 + ABNT NBR 16434),
            customizado por tipo de ativo, e as execucoes sao imutaveis para fins de fiscalizacao.
          </strong>
        </div>
        {canManage ? (
          <button type="button" className="button-link" style={{ background: "#fffdf5" }} onClick={() => setCreating((s) => !s)}>
            {creating ? "Cancelar" : "Criar PMOC"}
          </button>
        ) : null}
      </section>

      {creating && canManage ? (
        <section className="form-card">
          <h2>Novo PMOC</h2>
          <form onSubmit={onCreate} className="form-grid">
            <label className="field">
              <span>Codigo</span>
              <input name="code" required placeholder="PMOC-2026-001" />
            </label>
            <label className="field">
              <span>Contrato</span>
              <select name="contractId" required>
                <option value="">Selecione...</option>
                {contracts.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Site</span>
              <select name="siteId" required>
                <option value="">Selecione...</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Inicio</span>
              <input name="startsOn" type="date" required />
            </label>
            <label className="field">
              <span>Termo</span>
              <input name="endsOn" type="date" required />
            </label>
            <label className="field">
              <span>RT (nome)</span>
              <input name="rtName" required placeholder="Eng. Joao Silva" />
            </label>
            <label className="field">
              <span>RT CREA</span>
              <input name="rtCrea" required placeholder="SP-12345/D" />
            </label>
            <label className="field">
              <span>RT e-mail</span>
              <input name="rtEmail" type="email" placeholder="joao@empresa.com.br" />
            </label>
            <label className="field">
              <span>RT telefone</span>
              <input name="rtPhone" placeholder="(11) 90000-0000" />
            </label>
            <label className="field">
              <span>Numero da ART</span>
              <input name="artNumber" required placeholder="ART-2026-001" />
            </label>
            <label className="field">
              <span>URL da ART (opcional)</span>
              <input name="artUrl" type="url" placeholder="https://..." />
            </label>
            <label className="field">
              <span>Frequencia minima limpeza</span>
              <select name="minCleaningFrequency" defaultValue="M">
                <option value="M">Mensal</option>
                <option value="B">Bimestral</option>
                <option value="T">Trimestral</option>
              </select>
            </label>
            <label className="field">
              <span>Dias min. troca filtro</span>
              <input name="minFilterChangeDays" type="number" min="30" defaultValue="90" />
            </label>
            <label className="field">
              <span>Dias min. inspecao HVAC</span>
              <input name="minHvacInspectionDays" type="number" min="90" defaultValue="180" />
            </label>
            <div className="form-actions field full">
              <button className="primary-button" type="submit" disabled={isPending}>Criar PMOC</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="form-card">
        <div className="form-grid two">
          <div>
            <p className="eyebrow">Planos vigentes</p>
            <h2>{plans.length} PMOC(s)</h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            {plans.length > 0 ? (
              <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} style={{ padding: 8 }}>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.starts_on} a {p.ends_on}</option>)}
              </select>
            ) : null}
            <button type="button" className="ghost-button" onClick={onListAlerts} disabled={isPending}>Recalcular alertas</button>
          </div>
        </div>
        <ul>
          {plans.map((p) => (
            <li key={p.id} className="profile-row">
              <span>
                <strong>{p.code}</strong>
                <small className="muted">
                  {p.starts_on} a {p.ends_on} - {p.rt_name} (CREA {p.rt_crea}) - ART {p.art_number}
                </small>
              </span>
              <span className="status-pill">{p.active ? "ativo" : "inativo"}</span>
            </li>
          ))}
          {plans.length === 0 ? <li className="muted">Nenhum PMOC cadastrado.</li> : null}
        </ul>
      </section>

      {selectedPlanId ? (
        <section className="form-card">
          <h2>Atividades do PMOC {plans.find((p) => p.id === selectedPlanId)?.code}</h2>
          <p className="muted">{planActs(selectedPlanId).length} atividades (template HVAC + customizadas).</p>
          <table>
            <thead><tr><th>Codigo</th><th>Ativo</th><th>Frequencia</th><th>Prioridade</th></tr></thead>
            <tbody>
              {planActs(selectedPlanId).slice(0, 30).map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.code}</strong><br /><small>{a.name}</small></td>
                  <td>{hvacAssets.find((h) => h.id === a.asset_id)?.code ?? a.asset_id}</td>
                  <td>{a.frequency}</td>
                  <td>{a.priority}</td>
                </tr>
              ))}
              {planActs(selectedPlanId).length === 0 ? <tr><td colSpan={4} className="muted">Nenhuma atividade.</td></tr> : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {selectedPlanId && canExecute ? (
        <section className="form-card">
          <h2>Registrar execucao de uma atividade</h2>
          <form onSubmit={onExecute} className="form-grid">
            <label className="field full">
              <span>Atividade</span>
              <select name="pmocActivityId" required>
                <option value="">Selecione...</option>
                {planActs(selectedPlanId).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {hvacAssets.find((h) => h.id === a.asset_id)?.code ?? a.asset_id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ativo</span>
              <select name="assetId" required>
                <option value="">Selecione...</option>
                {hvacAssets.filter((h) => h.site_id === plans.find((p) => p.id === selectedPlanId)?.site_id).map((h) => (
                  <option key={h.id} value={h.id}>{h.code} - {h.type}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Resultado</span>
              <select name="result" required defaultValue="conforme">
                <option value="conforme">Conforme</option>
                <option value="parcialmente_conforme">Parcialmente conforme</option>
                <option value="nao_conforme">Nao conforme</option>
              </select>
            </label>
            <label className="field">
              <span>Fotos</span>
              <input name="photoCount" type="number" min="0" defaultValue="0" />
            </label>
            <label className="field full">
              <span>Leituras (JSON)</span>
              <input name="readings" placeholder='{"temperatura": 22.5, "pressao": 1.2}' />
            </label>
            <label className="field full">
              <span>Observacoes</span>
              <textarea name="observations" rows={2}></textarea>
            </label>
            <div className="form-actions field full">
              <button className="primary-button" type="submit" disabled={isPending}>Registrar</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="form-card">
        <h2>Ultimas execucoes</h2>
        <table>
          <thead><tr><th>Data</th><th>Ativo</th><th>Resultado</th><th>Proxima</th><th>Fotos</th></tr></thead>
          <tbody>
            {executions.slice(0, 15).map((e) => (
              <tr key={e.id}>
                <td>{fmtDate(e.executed_at)}</td>
                <td>{hvacAssets.find((h) => h.id === e.asset_id)?.code ?? e.asset_id}</td>
                <td><span className="status-pill">{e.result}</span></td>
                <td>{fmtDate(e.next_due_at)}</td>
                <td>{e.photo_count}</td>
              </tr>
            ))}
            {executions.length === 0 ? <tr><td colSpan={5} className="muted">Nenhuma execucao.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
