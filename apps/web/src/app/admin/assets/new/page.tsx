import { createSupabaseServer } from "@/lib/supabase-server";
import { createAsset } from "../actions";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";

export default async function NewAssetPage() {
  const supabase = await createSupabaseServer();
  const [{ data: sites }, { data: locations }] = await Promise.all([
    supabase.from("sites").select("id, name").order("name"),
    supabase.from("locations").select("id, name, site_id, type").order("name")
  ]);

  const siteOptions = (sites ?? []).map((s) => ({ value: s.id, label: s.name }));
  const locationOptions = (locations ?? []).map((l) => ({
    value: l.id,
    label: `${l.name} (${l.type})`,
  }));

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">EAM</p>
        <h1>Novo ativo.</h1>
        <p>
          Para muitos ativos, prefira o importador Excel/CSV (semana 3 do piloto).
        </p>
      </header>

      <form action={async (formData) => {
        "use server";
        await createAsset(formData);
      }} className="form-card">
        <fieldset className="form-section">
          <legend>Identificação</legend>
          <div className="form-grid">
            <Field name="code" label="TAG / Código" required placeholder="AT-AC-0007" />
            <Field name="name" label="Nome" required placeholder="Fancoil FC-A3-07" />
            <Field name="type" label="Tipo" placeholder="fancoil, chiller, bomba..." />
            <Select
              name="criticality"
              label="Criticidade"
              required
              defaultValue="media"
              options={[
                { value: "baixa", label: "Baixa" },
                { value: "media", label: "Média" },
                { value: "alta", label: "Alta" },
                { value: "critica", label: "Crítica" },
              ]}
            />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Fabricante</legend>
          <div className="form-grid">
            <Field name="manufacturer" label="Fabricante" />
            <Field name="model" label="Modelo" />
            <Field name="serial" label="Número de série" />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Localização</legend>
          <div className="form-grid">
            <Select
              name="site_id"
              label="Site"
              required
              placeholder="Selecione..."
              options={siteOptions}
            />
            <Select
              name="location_id"
              label="Localização existente"
              placeholder="-- criar nova --"
              options={locationOptions}
            />
            <Field name="new_location" label="Ou nova localização" placeholder="Sala 304" />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Garantia</legend>
          <div className="form-grid">
            <Field name="install_date" label="Data de instalação" type="date" />
            <Field name="warranty_until" label="Termo da garantia" type="date" />
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="primary-button">Cadastrar ativo</button>
        </div>
      </form>
    </main>
  );
}