// Helpers de UI compartilhados (formatacao, classes, escape).

export function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pct(value) {
  return `${Number(value || 0).toFixed(1).replace(".", ",")}%`;
}

export function statusLabel(status) {
  return {
    open: "Aberta",
    progress: "Em execucao",
    done: "Concluida",
    measure: "Em medicao",
    triagem: "Triagem",
    convertido: "Convertido",
    cancelado: "Cancelado"
  }[status] || status;
}

export function priorityLabel(priority) {
  return {
    critical: "Critica",
    high: "Alta",
    medium: "Media"
  }[priority] || priority;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

export function calcKpis(workOrders) {
  const total = workOrders.length;
  const done = workOrders.filter((o) => ["done", "measure"].includes(o.status));
  const onTime = done.filter((o) => o.elapsedHours <= o.slaHours);
  const open = workOrders.filter((o) => ["open", "progress"].includes(o.status));
  const cost = workOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
  const compliance = done.length ? (onTime.length / done.length) * 100 : 0;
  const backlog = total ? (open.length / total) * 100 : 0;
  const preventive = workOrders.filter((o) => o.type === "Preventiva");
  const preventiveDone = preventive.filter((o) => ["done", "measure"].includes(o.status));
  return {
    compliance,
    backlog,
    mttr: done.length ? done.reduce((s, o) => s + o.elapsedHours, 0) / done.length : 0,
    cost,
    preventiveAdherence: preventive.length ? (preventiveDone.length / preventive.length) * 100 : 0
  };
}

export function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 3600);
}
