import { createSupabaseServer } from "@/lib/supabase-server";
import { createSite } from "../actions";

export default async function NewSitePage() {
  const supabase = await createSupabaseServer();
  const [{ data: customers }, { data: contracts }] = await Promise.all([
    supabase.from("customers").select("id, name").order("name"),
    supabase.from("contracts").select("id, code, customer_id").order("code")
  ]);

  return (
    <main className="page-shell narrow">
      <header className="page-header">
        <p className="eyebrow">EAM</p>
        <h1>Nova unidade.</h1>
        <p>Registre o local fisico que agrupa ambientes, ativos e cronogramas do contrato.</p>
      </header>

      <form action={async (formData) => {
        "use server";
        await createSite(formData);
      }} className="form-card">
        <label className="field">
          <span>Cliente *</span>
          <select name="customer_id" required>
            <option value="">Selecione...</option>
            {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Contrato (opcional)</span>
          <select name="contract_id">
            <option value="">Sem vinculo direto</option>
            {(contracts ?? []).map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Nome do site *</span>
          <input name="name" required placeholder="Torre A" />
        </label>
        <label className="field">
          <span>Endereco</span>
          <input name="address" placeholder="Av. Paulista, 1000" />
        </label>
        <label className="field">
          <span>Timezone</span>
          <input name="timezone" defaultValue="America/Sao_Paulo" />
        </label>
        <div className="form-actions">
          <button type="submit" className="primary-button">Cadastrar site</button>
        </div>
      </form>
    </main>
  );
}
