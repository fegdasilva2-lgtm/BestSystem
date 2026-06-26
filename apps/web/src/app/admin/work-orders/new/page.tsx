import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewWorkOrderForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage() {
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
        <p className="eyebrow">Nova ordem de serviço</p>
        <h1>Criar OS.</h1>
        <p>Preencha os dados básicos. A OS começa como rascunho e pode ser editada até ser liberada.</p>
      </header>

      <NewWorkOrderForm contracts={contracts ?? []} />
    </main>
  );
}
