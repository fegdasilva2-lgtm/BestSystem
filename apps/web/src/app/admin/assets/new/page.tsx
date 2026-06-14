import { createSupabaseServer } from "@/lib/supabase-server";
import { createAsset } from "../actions";

export default async function NewAssetPage() {
  const supabase = await createSupabaseServer();
  const [{ data: sites }, { data: locations }] = await Promise.all([
    supabase.from("sites").select("id, name").order("name"),
    supabase.from("locations").select("id, name, site_id, type").order("name")
  ]);

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
          <legend>Identificacao</legend>
          <div className="form-grid">
            <Field name="code" label="TAG / Codigo" required placeholder="AT-AC-0007" />
            <Field name="name" label="Nome" required placeholder="Fancoil FC-A3-07" />
            <Field name="type" label="Tipo" placeholder="fancoil, chiller, bomba..." />
            <Select name="criticality" label="Criticidade" required defaultValue="media">
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </Select>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Fabricante</legend>
          <div className="form-grid">
            <Field name="manufacturer" label="Fabricante" />
            <Field name="model" label="Modelo" />
            <Field name="serial" label="Numero de serie" />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Localizacao</legend>
          <div className="form-grid">
            <Select name="site_id" label="Site" required>
              <option value="">Selecione...</option>
              {(sites ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select name="location_id" label="Localizacao existente">
              <option value="">-- criar nova --</option>
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id} data-site={l.site_id}>{l.name} ({l.type})</option>
              ))}
            </Select>
            <Field name="new_location" label="Ou nova localizacao" placeholder="Sala 304" />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Garantia</legend>
          <div className="form-grid">
            <Field name="install_date" label="Data de instalacao" type="date" />
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

function Field({ name, label, type = "text", required, placeholder }: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} />
    </label>
  );
}

function Select({ name, label, required, children, defaultValue }: {
  name: string; label: string; required?: boolean; children: React.ReactNode; defaultValue?: string;
}) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <select name={name} required={required} defaultValue={defaultValue}>{children}</select>
    </label>
  );
}
