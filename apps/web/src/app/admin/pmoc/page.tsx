import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import PmocClient from "./client";

export default async function PmocPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Sessão inválida&next=/admin/pmoc");
  }
  if (!["admin_org", "gestor_facilities", "supervisor", "tecnico", "auditor"].includes(profile.role)) {
    redirect("/admin?error=PMOC restrito");
  }

  const supabase = await createSupabaseServer();
  const [{ data: plans }, { data: contracts }, { data: sites }, { data: activities }, { data: executions }, { data: hvacAssets }] = await Promise.all([
    supabase.from("pmoc_plans").select("*").order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, code").order("code"),
    supabase.from("sites").select("id, name").order("name"),
    supabase.from("pmoc_activities").select("*"),
    supabase.from("pmoc_executions").select("*").order("executed_at", { ascending: false }).limit(50),
    supabase.from("assets").select("id, code, name, type, location_id, site_id")
      .in("type", ["chiller","ahu","fancoil","vrf","vrv","split","rooftop","coolingtower"])
  ]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">PMOC</p>
        <h1>Plano de Manutenção, Operação e Controle.</h1>
        <p>
          Lei 13.589/2018 - obrigatório para sistemas de climatização.
          Cada plano vincula um responsável técnico (RT) com CREA + ART,
          gera automaticamente as atividades por ativo HVAC e monitora
          conformidade regulatória contínua.
        </p>
      </header>

      <PmocClient
        plans={plans ?? []}
        contracts={contracts ?? []}
        sites={sites ?? []}
        activities={activities ?? []}
        executions={executions ?? []}
        hvacAssets={hvacAssets ?? []}
        role={profile.role}
      />
    </main>
  );
}
