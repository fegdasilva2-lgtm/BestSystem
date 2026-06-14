import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { defaultBlocks } from "./actions";
import RgmForm from "./form";

export default async function RgmPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Sessao invalida&next=/admin/rgm");
  }

  const supabase = await createSupabaseServer();
  const [{ data: contracts }, { data: tpl }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, code, customer_id, monthly_value, billing_rule, rgm_periodicity")
      .order("code"),
    supabase
      .from("rgm_templates")
      .select("blocks")
      .eq("contract_id", "placeholder")
      .maybeSingle()
  ]);

  const blocks = tpl?.blocks ?? defaultBlocks();

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">RGM configuravel</p>
        <h1>Relatorio de Gestao Mensal.</h1>
        <p>
          O RGM e o entregavel recorrente mais importante para o cliente. Configure os blocos por
          contrato, gere a previa do mes e arquive a versao imutavel apos o aceite.
        </p>
      </header>

      <RgmForm
        contracts={contracts ?? []}
        initialBlocks={blocks}
        canArchive={["cliente_gestor", "admin_org"].includes(profile.role)}
      />

      <section className="callout-band">
        <div>
          <p className="eyebrow" style={{ color: "#ffe3d4" }}>Diferencial brasileiro</p>
          <strong>
            No Fracttal e Infraspeak o RGM e montado a mao por cliente. Aqui ele vira um report
            builder configuravel por contrato, com identidade visual aplicada e versao imutavel
            apos aceite.
          </strong>
        </div>
      </section>
    </main>
  );
}
