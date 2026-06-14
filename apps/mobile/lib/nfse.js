// Integracao com NFS-e via PlugNotas (ou Focus NFe, ou eNotas).
// IMPORTANTE: este modulo roda no SUPABASE, nao no PWA. Eh um stub
// de integracao com mock para o sandbox; em producao, o servico
// real do PlugNotas e chamado.
//
// Em conformidade com o estudo:
//   - Jamais integracao direta com prefeitura (milhares de layouts)
//   - Sempre via integrador (1 unica API para centenas de municipios)
//   - Idempotente (numero da NFS-e do integrador)
//   - Com retry e fila

const INTEGRADORES_SUPORTADOS = ["plugnotas", "focusnfe", "enotas"];

/**
 * @typedef {Object} NfseEmitirInput
 * @property {string} measurementId
 * @property {string} contractId
 * @property {string} tenantId
 * @property {number} valor
 * @property {string} descricao
 * @property {string} tomadorCnpj
 * @property {string} tomadorRazao
 * @property {string} [tomadorEmail]
 * @property {string} [tomadorEndereco]
 * @property {string} [municipioPrestacao]   codigo IBGE
 * @property {string} [codigoServico]         ex.: 1.06 / 7.02
 *
 * @typedef {Object} NfseEmitirResult
 * @property {string} id
 * @property {string} status                "autorizada" | "rejeitada" | "processando" | "erro"
 * @property {string} numero
 * @property {string} [protocolo]
 * @property {string} [pdfUrl]
 * @property {string} [xmlUrl]
 * @property {string} [motivoRejeicao]
 * @property {string} emitidaEm
 */

const MOCK = process.env.PREDIALOPS_NFSE_MOCK !== "false"; // default true em sandbox

/**
 * Emite uma NFS-e atraves do integrador configurado.
 * Em sandbox (PREDIALOPS_NFSE_MOCK=true), retorna um resultado
 * simulado sem chamar nenhum servico externo.
 *
 * @param {NfseEmitirInput} input
 * @returns {Promise<NfseEmitirResult>}
 */
export async function emitirNfse(input) {
  if (!input?.measurementId) throw new Error("measurementId obrigatorio");
  if (!input?.valor || input.valor <= 0) throw new Error("valor deve ser > 0");
  if (!input?.tomadorCnpj) throw new Error("CNPJ do tomador obrigatorio");

  const provider = process.env.PREDIALOPS_NFSE_PROVIDER ?? "plugnotas";
  if (!INTEGRADORES_SUPORTADOS.includes(provider)) {
    throw new Error(`Provedor de NFS-e nao suportado: ${provider}`);
  }

  if (MOCK) {
    return emitirNfseMock(input, provider);
  }
  return emitirNfseReal(input, provider);
}

async function emitirNfseMock(input, provider) {
  // Simula latencia do integrador
  await new Promise((r) => setTimeout(r, 250));
  const numero = String(Math.floor(Math.random() * 9_000_000) + 1_000_000);
  return {
    id: `nfse-${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: "autorizada",
    numero,
    protocolo: `PROT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    pdfUrl: `https://mock.${provider}.com.br/nfse/${numero}.pdf`,
    xmlUrl: `https://mock.${provider}.com.br/nfse/${numero}.xml`,
    emitidaEm: new Date().toISOString(),
    provider,
    mock: true
  };
}

async function emitirNfseReal(input, provider) {
  // Em producao, chamar a API do integrador escolhido.
  // Stub proposital; cada integrador tem contrato proprio.
  throw new Error(`integracao real com ${provider} nao implementada neste piloto; use MOCK=true`);
}

/**
 * Cancela uma NFS-e emitida (somente se ainda nao foi autorizada).
 * @param {string} nfseId
 * @param {string} motivo
 * @returns {Promise<NfseEmitirResult>}
 */
export async function cancelarNfse(nfseId, motivo) {
  if (!nfseId) throw new Error("nfseId obrigatorio");
  if (!motivo) throw new Error("motivo do cancelamento obrigatorio");

  if (MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      id: nfseId,
      status: "cancelada",
      numero: nfseId.split("-").pop(),
      emitidaEm: new Date().toISOString(),
      motivoCancelamento: motivo
    };
  }
  throw new Error("cancelamento real nao implementado");
}

/**
 * Consulta o status de uma NFS-e no integrador.
 * @param {string} nfseId
 * @returns {Promise<NfseEmitirResult>}
 */
export async function consultarNfse(nfseId) {
  if (MOCK) {
    return {
      id: nfseId,
      status: "autorizada",
      numero: nfseId.split("-").pop(),
      emitidaEm: new Date().toISOString()
    };
  }
  throw new Error("consulta real nao implementada");
}

/**
 * Constroi a URL do PDF da NFS-e para o frontend.
 * @param {string} nfseId
 * @returns {string|null}
 */
export function pdfUrlNfse(nfseId) {
  if (!nfseId) return null;
  return `https://mock.plugnotas.com.br/nfse/${nfseId.split("-").pop()}.pdf`;
}

export const __test = { INTEGRADORES_SUPORTADOS, MOCK };
