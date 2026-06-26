import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewMeasurementForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewMeasurementPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, code")
    .eq("tenant_id", profile.tenant.id)
    .order("code");

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Nova medição</p>
        <h1>Criar medição mensal.</h1>
        <p>Informe o contrato, período e valor bruto. A medição começa como rascunho.</p>
      </header>
      <NewMeasurementForm contracts={contracts ?? []} />
    </main>
  );
}
