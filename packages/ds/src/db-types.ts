// Tipos compartilhados com o backend (espelham supabase/migrations/0001_base_schema.sql).
// Quando o Supabase estiver provisionado, rodar:
//   supabase gen types typescript --linked > packages/ds/src/db-types.ts
// e este arquivo sera sobrescrito. Os tipos manuais abaixo cobrem o piloto
// ate a geracao automatica ficar disponivel.

export type Priority = "baixa" | "media" | "alta" | "critica";

export type WorkOrderStatus =
  | "rascunho" | "planejada" | "liberada" | "atribuida" | "aceita"
  | "em_deslocamento" | "em_execucao" | "pausada" | "aguardando_material"
  | "aguardando_cliente" | "concluida_tecnico" | "em_validacao"
  | "aprovada" | "encerrada" | "cancelada";

export type WorkOrderType =
  | "preventiva" | "corretiva" | "corretiva_programada" | "preditiva"
  | "inspecao" | "ronda" | "melhoria" | "instalacao" | "emergencia" | "avulsa";

export type Role =
  | "super_admin_saas" | "admin_org" | "gestor_facilities" | "planejador"
  | "supervisor" | "tecnico" | "auxiliar" | "almoxarife" | "comercial"
  | "financeiro" | "cliente_gestor" | "solicitante" | "auditor" | "fornecedor";

export type TenantPlan = "starter" | "professional" | "business" | "enterprise";
export type TenantStatus = "piloto" | "ativo" | "implantacao" | "suspenso";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  brand_primary?: string;
  brand_secondary?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface UserProfile {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  document?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Contract {
  id: string;
  tenant_id: string;
  customer_id: string;
  code: string;
  scope: string;
  exclusions?: string;
  starts_on: string;
  ends_on?: string;
  monthly_value: number;
  index_name?: string;
  index_date?: string;
  billing_rule: string;
  rgm_periodicity: string;
  brand_logo_url?: string;
  cost_center?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Site {
  id: string;
  tenant_id: string;
  customer_id: string;
  contract_id?: string;
  name: string;
  address?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Location {
  id: string;
  tenant_id: string;
  site_id: string;
  parent_id?: string;
  name: string;
  type: "predio" | "pavimento" | "ambiente" | "sala" | "area_tecnica";
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Asset {
  id: string;
  tenant_id: string;
  location_id: string;
  code: string;
  name: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  criticality: "baixa" | "media" | "alta" | "critica";
  status: "operacional" | "parado" | "manutencao" | "desativado";
  qr_code?: string;
  warranty_until?: string;
  install_date?: string;
  hourly_meter: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface WorkOrder {
  id: string;
  tenant_id: string;
  request_id?: string;
  contract_id?: string;
  site_id?: string;
  location_id?: string;
  asset_id?: string;
  type: WorkOrderType;
  priority: Priority;
  status: WorkOrderStatus;
  description: string;
  assigned_to?: string;
  due_at?: string;
  started_at?: string;
  completed_at?: string;
  approved_at?: string;
  cost: number;
  contract_item?: string;
  idempotency_key?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: string;
  tenant_id: string;
  customer_id?: string;
  site_id?: string;
  location_id?: string;
  requester_name: string;
  requester_contact?: string;
  category: string;
  description: string;
  status: "triagem" | "convertido" | "cancelado";
  created_at: string;
  updated_at: string;
  version: number;
}

export interface Measurement {
  id: string;
  tenant_id: string;
  contract_id: string;
  period: string;
  status: "rascunho" | "pre_enviada" | "em_aceite" | "aprovada" | "contestada" | "faturada" | "paga";
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  actor_id?: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  before_data?: unknown;
  after_data?: unknown;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface OutboxEvent {
  id: string;
  tenant_id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: unknown;
  idempotency_key: string;
  processed_at?: string;
  failed_at?: string;
  attempts: number;
  created_at: string;
}
