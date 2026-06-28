import { createSupabaseServer } from "@/lib/supabase-server";
import { createContract } from "../actions";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import type { ReactNode } from "react";

export default async function NewContractPage() {
  const supabase = await createSupabaseServer();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, document")
    .order("name");

  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: `${c.name}${c.document ? ` (${c.document})` : ""}`,
  }));

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
          <Select
            name="customer_id"
            label="Cliente"
            required
            placeholder="Selecione..."
            options={customerOptions}
          />
          <Field name="code" label="Código do contrato" placeholder="CT-2026-099" required />
          <Field name="scope" label="Escopo" placeholder="Manutenção predial e PMOC" required />
        </Section>

        <Section title="Vigência e valor">
          <Field name="starts_on" label="Início" type="date" required />
          <Field name="ends_on" label="Termo (opcional)" type="date" />
          <Field
            name="monthly_value"
            label="Valor mensal (R$)"
            type="number"
            defaultValue="0"
          />
        </Section>

        <Section title="Reajuste">
          <Select
            name="index_name"
            label="Índice"
            placeholder="Sem reajuste"
            options={[
              { value: "IPCA", label: "IPCA" },
              { value: "INPC", label: "INPC" },
              { value: "IGPM", label: "IGP-M" },
              { value: "CCT", label: "CCT (categoria)" },
            ]}
          />
          <Field name="index_date" label="Data do próximo reajuste" type="date" />
        </Section>

        <Section title="Medição e RGM">
          <Select
            name="billing_rule"
            label="Regra de medição"
            options={[
              { value: "Mensal por OS aprovada", label: "Mensal por OS aprovada" },
              { value: "Fixo + variável por evento", label: "Fixo + variável por evento" },
              { value: "Por item de contrato", label: "Por item de contrato" },
              { value: "Posto + extras aprovados", label: "Posto + extras aprovados" },
            ]}
          />
          <Select
            name="rgm_periodicity"
            label="Periodicidade do RGM"
            options={[
              { value: "mensal", label: "Mensal" },
              { value: "bimestral", label: "Bimestral" },
              { value: "trimestral", label: "Trimestral" },
            ]}
          />
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}