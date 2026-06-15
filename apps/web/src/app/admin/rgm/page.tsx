import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { defaultBlocks } from "./defaults";
import RgmForm from "./form";

export default async function RgmPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Sessão inválida&next=/admin/rgm");
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
        <p className="eyebrow">RGM configurável</p>
        <h1>Relatório de Gestão Mensal.</h1>
        <p>
          O RGM é o entregável recorrente mais importante para o cliente. Configure os blocos por
          contrato, gere a prévia do mês e arquive a versão imutável após o aceite.
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
            No Fracttal e Infraspeak o RGM é montado à mão por cliente. Aqui ele vira um report
            builder configurável por contrato, com identidade visual aplicada e versão imutável
            após aceite.
          </strong>
        </div>
      </section>
    </main>
  );
}
