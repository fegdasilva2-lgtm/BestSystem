// Validadores puros do importador Excel/CSV.
// Sem dependencias de Dexie/browser, para permitir testes em Node.

const CRIT = new Set(["baixa", "media", "alta", "critica"]);
const FREQ = new Set(["D", "S", "Q", "M", "B", "T", "S", "A", "custom"]);

export function validateAtivos(rows) {
  const valid = [];
  const rejected = [];
  rows.forEach((row, idx) => {
    const errs = [];
    const code = str(row.code ?? row.CODIGO ?? row.tag);
    const name = str(row.name ?? row.NOME ?? row.descricao);
    const locationPath = str(row.location_path ?? row.LOCAL ?? row.hierarchy);
    const criticality = str(row.criticality ?? row.CRITICIDADE ?? "media").toLowerCase();

    if (!code) errs.push("code obrigatorio");
    if (!name) errs.push("name obrigatorio");
    if (!locationPath) errs.push("location_path obrigatorio");
    if (!CRIT.has(criticality)) errs.push(`criticality invalida (${criticality})`);

    if (errs.length) {
      rejected.push({ row: idx + 2, raw: row, errors: errs });
    } else {
      valid.push({
        code,
        name,
        location_path: locationPath,
        criticality,
        manufacturer: str(row.manufacturer ?? row.FABRICANTE) || null,
        model:        str(row.model ?? row.MODELO) || null,
        serial:       str(row.serial ?? row.SERIE) || null,
        install_date: parseDate(row.install_date ?? row.INSTALACAO) || null,
        warranty_until: parseDate(row.warranty_until ?? row.GARANTIA) || null
      });
    }
  });
  return { valid, rejected };
}

export function validatePlanos(rows) {
  const valid = [];
  const rejected = [];
  rows.forEach((row, idx) => {
    const errs = [];
    const code = str(row.code ?? row.CODIGO);
    const name = str(row.name ?? row.NOME);
    const assetCode = str(row.asset_code ?? row.ATIVO);
    const frequency = str(row.frequency ?? row.FREQUENCIA).toUpperCase();
    const duration = Number(row.duration_minutes ?? row.DURACAO ?? 60);

    if (!code) errs.push("code obrigatorio");
    if (!name) errs.push("name obrigatorio");
    if (!assetCode) errs.push("asset_code obrigatorio");
    if (!FREQ.has(frequency)) errs.push(`frequency invalida (${frequency})`);
    if (!Number.isFinite(duration) || duration <= 0) errs.push("duration_minutes invalido");

    if (errs.length) {
      rejected.push({ row: idx + 2, raw: row, errors: errs });
    } else {
      valid.push({
        code, name, asset_code: assetCode, frequency, duration_minutes: duration,
        checklist: parseList(row.checklist ?? row.CHECKLIST)
      });
    }
  });
  return { valid, rejected };
}

function str(v) { return (v == null ? "" : String(v)).trim(); }

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseList(v) {
  if (!v) return [];
  return String(v).split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
}
