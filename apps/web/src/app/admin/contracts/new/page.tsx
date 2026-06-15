import { createSupabaseServer } from "@/lib/supabase-server";
import { createContract } from "../actions";

export default async function NewContractPage() {
  const supabase = await createSupabaseServer();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, document")
    .order("name");

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Contract Ops</p>
        <h1>Novo contrato.</h1>
        <p>
          Entidade central do PredialOps. Tudo (sites, ativos, OS, medição, RGM) se vincula a um contrato.
        </p>
      </header>

      <form
        action={async (formData) => {
          "use server";
          await createContract(formData);
        }}
        className="form-card"
      >
        <Section title="Identificação">
          <Select name="customer_id" label="Cliente" required>
            <option value="">Selecione...</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.document ? `(${c.document})` : ""}
              </option>
            ))}
          </Select>
          <Field name="code" label="Código do contrato" placeholder="CT-2026-099" required />
          <Field name="scope" label="Escopo" placeholder="Manutenção predial e PMOC" required />
          <TextArea name="exclusions" label="Exclusões" placeholder="Sistemas não cobertos, restrições, etc." />
        </Section>

        <Section title="Vigência e valor">
          <Field name="starts_on" label="Início" type="date" required />
          <Field name="ends_on" label="Termo (opcional)" type="date" />
          <Field name="monthly_value" label="Valor mensal (R$)" type="number" defaultValue="0" />
        </Section>

        <Section title="Reajuste">
          <Select name="index_name" label="Índice">
            <option value="">Sem reajuste</option>
            <option value="IPCA">IPCA</option>
            <option value="INPC">INPC</option>
            <option value="IGPM">IGP-M</option>
            <option value="CCT">CCT (categoria)</option>
          </Select>
          <Field name="index_date" label="Data do próximo reajuste" type="date" />
        </Section>

        <Section title="Medição e RGM">
          <Select name="billing_rule" label="Regra de medição">
            <option>Mensal por OS aprovada</option>
            <option>Fixo + variável por evento</option>
            <option>Por item de contrato</option>
            <option>Posto + extras aprovados</option>
          </Select>
          <Select name="rgm_periodicity" label="Periodicidade do RGM">
            <option value="mensal">Mensal</option>
            <option value="bimestral">Bimestral</option>
            <option value="trimestral">Trimestral</option>
          </Select>
        </Section>

        <div className="form-actions">
          <button type="submit" className="primary-button">
            Cadastrar contrato
          </button>
        </div>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}

function Field({ name, label, type = "text", required, defaultValue, placeholder }: {
  name: string; label: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

function Select({ name, label, required, children }: {
  name: string; label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <select name={name} required={required}>
        {children}
      </select>
    </label>
  );
}

function TextArea({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="field full">
      <span>{label}</span>
      <textarea name={name} placeholder={placeholder} rows={3} />
    </label>
  );
}
