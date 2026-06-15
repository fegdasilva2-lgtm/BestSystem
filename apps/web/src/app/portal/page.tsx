import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalClient from "./client";

export default async function PortalPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Sessão inválida&next=/portal");
  }
  if (!["cliente_gestor", "admin_org"].includes(profile.role)) {
    redirect("/admin?error=Portal restrito a cliente_gestor");
  }

  const supabase = await createSupabaseServer();

  const [{ data: contracts }, { data: measurements }, { data: workOrders }, { data: rgmVersions }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, code, scope, starts_on, ends_on, monthly_value, billing_rule, rgm_periodicity")
      .order("code"),
    supabase
      .from("measurements")
      .select("id, contract_id, period, status, gross_amount, discount_amount, net_amount, approved_at")
      .in("status", ["pre_enviada", "em_aceite", "aprovada", "contestada", "faturada"])
      .order("period", { ascending: false })
      .limit(12),
    supabase
      .from("work_orders")
      .select("id, type, priority, status, description, due_at, completed_at, contract_id")
      .in("status", ["em_execucao", "concluida_tecnico", "em_validacao", "aprovada", "encerrada"])
      .order("due_at", { ascending: true })
      .limit(20),
    supabase
      .from("rgm_versions")
      .select("id, contract_id, period, approved_at, approved_by, file_url")
      .order("approved_at", { ascending: false })
      .limit(6)
  ]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Portal do cliente</p>
        <h1>Bem-vindo, {profile.name}.</h1>
        <p>
          Tenant {profile.tenant.name} - contrato(s) ativos, medições pendentes de aceite,
          OS em andamento e RGM arquivados.
        </p>
      </header>

      <PortalClient
        contracts={contracts ?? []}
        measurements={measurements ?? []}
        workOrders={workOrders ?? []}
        rgmVersions={rgmVersions ?? []}
        role={profile.role}
      />
    </main>
  );
}
