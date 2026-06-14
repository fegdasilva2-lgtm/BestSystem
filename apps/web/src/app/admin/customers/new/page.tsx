import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <main className="page-shell narrow">
      <header className="page-header">
        <p className="eyebrow">Cadastro inicial</p>
        <h1>Novo cliente.</h1>
        <p>Comece pela entidade que agrupa contratos, unidades, usuarios e aceite de medicao.</p>
      </header>

      <form
        action={async (formData) => {
          "use server";
          const res = await createCustomer(formData);
          if (res.error) {
            return { error: res.error };
          }
          // redireciona apos sucesso
          return { id: res.id };
        }}
        className="form-card"
      >
        <Field name="name" label="Razao social" required />
        <Field name="document" label="CNPJ" placeholder="00.000.000/0000-00" />
        <Field name="contact_name" label="Nome do contato" />
        <Field name="contact_email" label="E-mail" type="email" />
        <Field name="contact_phone" label="Telefone" placeholder="(11) 90000-0000" />
        <div className="form-actions">
          <button type="submit" className="primary-button">
            Cadastrar cliente
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({ name, label, required, type = "text", placeholder }: {
  name: string; label: string; required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </label>
  );
}
