// Conformidade trabalhista para postos residentes (CCT por CNAE).
// Puro, sem Dexie/browser.
//
// Componentes do estudo:
//   - Vinculo do posto com a CCT aplicavel por CNAE
//   - Controle de piso salarial da categoria
//   - Registro de beneficios obrigatorios
//   - Alertas de divergencia entre praticado e piso
//   - Vinculo da equipe residente com a vigencia do contrato

// =====================================================================
// Tabelas de referencia (subset ilustrativo; em V1 vem de fonte oficial)
// =====================================================================

// CNAE -> categoria profissional predominante (simplificado)
const CNAE_CATEGORIA = {
  "8111-7":  { categoria: "Porteiro",     cct: "CCT-SINDICON-SP" },
  "8112-5":  { categoria: "Vigia",        cct: "CCT-SINDVIG-SP" },
  "8121-4":  { categoria: "Faxineiro",    cct: "CCT-SINDISERVICOS-SP" },
  "8122-2":  { categoria: "Zelador",      cct: "CCT-SINDISERVICOS-SP" },
  "4321-5":  { categoria: "Eletricista",  cct: "CCT-SINTRACON-SP" },
  "4322-3":  { categoria: "Bombeiro Hidraulico", cct: "CCT-SINTRACON-SP" }
};

// Pisos salariais por categoria (subset 2026; atualizar via API do integrador em V1)
const PISOS_2026 = {
  "Porteiro":              { piso: 1900.00, beneficios: ["VT", "VA_R$300", "CestaBasica_R$200"] },
  "Vigia":                 { piso: 1850.00, beneficios: ["VT", "VA_R$300", "AdicionalNoturno_20pct"] },
  "Faxineiro":             { piso: 1800.00, beneficios: ["VT", "VA_R$300", "Insalubridade_20pct"] },
  "Zelador":               { piso: 1850.00, beneficios: ["VT", "VA_R$300", "CestaBasica_R$200"] },
  "Eletricista":           { piso: 2600.00, beneficios: ["VT", "VA_R$400", "Periculosidade_30pct"] },
  "Bombeiro Hidraulico":   { piso: 2400.00, beneficios: ["VT", "VA_R$400"] }
};

const INCIDENCIAS = {
  VT: { nome: "Vale-transporte",   descontoMax: 6 },
  VA_R$300: { nome: "Vale-alimentacao R$300", descontoMax: 0 },
  VA_R$400: { nome: "Vale-alimentacao R$400", descontoMax: 0 },
  CestaBasica_R$200: { nome: "Cesta basica R$200", descontoMax: 0 },
  AdicionalNoturno_20pct: { nome: "Adicional noturno 20%", adicional: 0.20, sobre: "piso" },
  Insalubridade_20pct: { nome: "Insalubridade 20%", adicional: 0.20, sobre: "piso" },
  Periculosidade_30pct: { nome: "Periculosidade 30%", adicional: 0.30, sobre: "piso" }
};

/**
 * @typedef {Object} Posto
 * @property {string} id
 * @property {string} cnae
 * @property {string} [categoria]
 * @property {string} [cct]
 * @property {number} salarioPraticado
 * @property {string[]} [beneficiosConcedidos]
 * @property {string} contractId
 *
 * @typedef {Object} Divergencia
 * @property {"piso_abaixo"|"beneficio_ausente"|"cct_nao_aplicavel"|"adicional_incorreto"} kind
 * @property {"baixa"|"media"|"alta"|"critica"} severity
 * @property {string} message
 *
 * @typedef {Object} ConformidadeResult
 * @property {Divergencia[]} divergencias
 * @property {Object} calculo    piso, beneficiosObrigatorios, salarioLiquidoEstimado
 * @property {Object} meta      categoria, cct
 */

/**
 * Verifica a conformidade de um posto com a CCT aplicavel.
 * @param {Object} args
 * @param {Posto} args.posto
 * @param {string} args.cnae
 * @returns {ConformidadeResult}
 */
export function verificarConformidade({ posto, cnae }) {
  if (!posto?.id) throw new Error("posto.id obrigatorio");
  if (!cnae) throw new Error("cnae obrigatorio");

  const cat = CNAE_CATEGORIA[cnae];
  if (!cat) {
    return {
      divergencias: [{
        kind: "cct_nao_aplicavel",
        severity: "critica",
        message: `CNAE ${cnae} nao possui CCT cadastrada no sistema. Cadastre manualmente.`
      }],
      calculo: { piso: 0, beneficiosObrigatorios: [], salarioLiquidoEstimado: 0 },
      meta: { categoria: null, cct: null }
    };
  }

  const pisoRef = PISOS_2026[cat.categoria];
  if (!pisoRef) {
    return {
      divergencias: [{
        kind: "cct_nao_aplicavel",
        severity: "alta",
        message: `Piso para categoria ${cat.categoria} nao encontrado na tabela 2026.`
      }],
      calculo: { piso: 0, beneficiosObrigatorios: [], salarioLiquidoEstimado: 0 },
      meta: { categoria: cat.categoria, cct: cat.cct }
    };
  }

  const divergencias = [];

  // 1) Piso
  if (posto.salarioPraticado < pisoRef.piso) {
    const diff = pisoRef.piso - posto.salarioPraticado;
    divergencias.push({
      kind: "piso_abaixo",
      severity: "critica",
      message: `Salario praticado R$ ${posto.salarioPraticado.toFixed(2)} esta abaixo do piso da categoria (R$ ${pisoRef.piso.toFixed(2)}). Diferenca: R$ ${diff.toFixed(2)}.`
    });
  } else if (posto.salarioPraticado < pisoRef.piso * 1.05) {
    divergencias.push({
      kind: "piso_abaixo",
      severity: "media",
      message: `Salario praticado R$ ${posto.salarioPraticado.toFixed(2)} esta menos de 5% acima do piso (R$ ${pisoRef.piso.toFixed(2)}). Verifique se dissidio recente nao foi aplicado.`
    });
  }

  // 2) Beneficios
  const concedidos = new Set(posto.beneficiosConcedidos ?? []);
  const beneficiosFaltando = pisoRef.beneficios.filter((b) => !concedidos.has(b));
  for (const b of beneficiosFaltando) {
    const inc = INCIDENCIAS[b];
    divergencias.push({
      kind: "beneficio_ausente",
      severity: "alta",
      message: `Beneficio obrigatorio nao concedido: ${inc?.nome ?? b}.`
    });
  }

  // 3) Calculo de salario liquido estimado (considera VT)
  const vt = concedidos.has("VT") ? Math.min(posto.salarioPraticado * 0.06, posto.salarioPraticado * 0.06) : 0;
  const adicional = (pisoRef.beneficios ?? []).reduce((s, b) => {
    const inc = INCIDENCIAS[b];
    if (inc?.adicional && concedidos.has(b)) {
      return s + (inc.sobre === "piso" ? pisoRef.piso : posto.salarioPraticado) * inc.adicional;
    }
    return s;
  }, 0);
  const salarioLiquidoEstimado = posto.salarioPraticado + adicional - vt;

  return {
    divergencias,
    calculo: {
      piso: pisoRef.piso,
      beneficiosObrigatorios: pisoRef.beneficios,
      salarioLiquidoEstimado
    },
    meta: {
      categoria: cat.categoria,
      cct: cat.cct,
      cnae
    }
  };
}

/**
 * Lista os CNAEs suportados e a categoria profissional associada.
 */
export function listarCnaesSuportados() {
  return Object.entries(CNAE_CATEGORIA).map(([cnae, info]) => ({
    cnae,
    categoria: info.categoria,
    cct: info.cct,
    piso: PISOS_2026[info.categoria]?.piso ?? null
  }));
}

/**
 * Calcula o custo total mensal de um posto considerando piso +
 * beneficios obrigatorios + encargos trabalhistas.
 * @param {Object} args
 * @param {number} args.salarioBase
 * @param {string[]} args.beneficios
 * @returns {Object} breakdown
 */
export function calcularCustoPosto({ salarioBase, beneficios }) {
  const va = (beneficios ?? []).reduce((s, b) => {
    if (b === "VA_R$300") return s + 300;
    if (b === "VA_R$400") return s + 400;
    if (b === "CestaBasica_R$200") return s + 200;
    return s;
  }, 0);
  const adicional = (beneficios ?? []).reduce((s, b) => {
    const inc = INCIDENCIAS[b];
    if (inc?.adicional) return s + salarioBase * inc.adicional;
    return s;
  }, 0);
  const vt = beneficios?.includes("VT") ? salarioBase * 0.06 : 0;
  const fgts = salarioBase * 0.08;
  const inssPatronal = salarioBase * 0.20;
  const provisaoFerias = salarioBase / 12;
  const provisao13 = salarioBase / 12;
  const provisaoMultaFgts = fgts * 0.4;
  const total = salarioBase + adicional + va + vt + fgts + inssPatronal + provisaoFerias + provisao13 + provisaoMultaFgts;
  return {
    salarioBase,
    adicional,
    beneficiosMonetarios: va,
    descontoVT: vt,
    encargos: {
      fgts,
      inssPatronal,
      provisaoFerias,
      provisao13,
      provisaoMultaFgts
    },
    total
  };
}

export const __test = { CNAE_CATEGORIA, PISOS_2026, INCIDENCIAS };
