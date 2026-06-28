import { createSupabaseServer } from "@/lib/supabase-server";
import { createSite } from "../actions";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";

export default async function NewSitePage() {
  const supabase = await createSupabaseServer();
  const [{ data: customers }, { data: contracts }] = await Promise.all([
    supabase.from("customers").select("id, name").order("name"),
    supabase.from("contracts").select("id, code, customer_id").order("code")
  ]);

  const customerOptions = (customers ?? []).map((c) => ({ value: c.id, label: c.name }));
  const contractOptions = (contracts ?? []).map((c) => ({ value: c.id, label: c.code }));

  return (
    <main className="page-shell narrow">
      <header className="page-header">
        <p className="eyebrow">EAM</p>
        <h1>Nova unidade.</h1>
        <p>Registre o local físico que agrupa ambientes, ativos e cronogramas do contrato.</p>
      </header>

      <form action={async (formData) => {
        "use server";
        await createSite(formData);
      }} className="form-card">
        <Select
          name="customer_id"
          label="Cliente"
          required
          placeholder="Selecione..."
          options={customerOptions}
        />
        <Select
          name="contract_id"
          label="Contrato (opcional)"
          placeholder="Sem vínculo direto"
          options={contractOptions}
        />
        <Field name="name" label="Nome do site" required placeholder="Torre A" />
        <Field name="address" label="Endereço" placeholder="Av. Paulista, 1000" />
        <Field name="timezone" label="Timezone" defaultValue="America/Sao_Paulo" />
        <div className="form-actions">
          <button type="submit" className="primary-button">Cadastrar site</button>
        </div>
      </form>
    </main>
  );
}