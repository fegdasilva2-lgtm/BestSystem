import type { InputHTMLAttributes } from "react";

/**
 * <Field> — input canonico do PredialOps (item C8 da Trilha C).
 *
 * Encapsula o pattern repetido em N page.tsx de criar <label.field>
 * + <input>, e infere automaticamente:
 *  - inputmode (teclado otimizado em mobile: numeric, tel, email, search)
 *  - autocomplete (preenchimento automatico correto)
 *  - enterKeyHint (botao Enter do teclado mobile: next, done, search)
 *  - spellCheck (false para emails, codigos, usernames)
 *
 * Suporta tambem prop explicita via `inputMode`/`autoComplete` para casos
 * nao cobertos pelo mapeamento automatico.
 *
 * Uso:
 *   <Field name="email" type="email" label="E-mail" required />
 *   <Field name="contact_phone" label="Telefone" type="tel" />
 *   <Field name="monthly_value" label="Valor mensal" type="number" inputMode="decimal" />
 */

interface FieldProps {
  name: string;
  label: string;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autoFocus?: boolean;
  /** Override explicito - senao inferido do name+type. */
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
}

interface FieldInference {
  inputMode: NonNullable<InputHTMLAttributes<HTMLInputElement>["inputMode"]>;
  autoComplete: string;
  enterKeyHint: NonNullable<InputHTMLAttributes<HTMLInputElement>["enterKeyHint"]>;
  spellCheck: boolean;
}

/**
 * Mapeamento deterministico name -> inferencia mobile-first.
 * Inspirado em docs/PERFIS.md (campos que o sistema coleta) + web-design-guidelines
 * secao "Forms" (autocomplete values canonicos da HTML spec).
 */
const FIELD_INFERENCE: Record<string, FieldInference> = {
  // Identificacao
  name: { inputMode: "text", autoComplete: "name", enterKeyHint: "next", spellCheck: false },
  document: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  cnpj: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  cpf: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },

  // Contato
  email: { inputMode: "email", autoComplete: "email", enterKeyHint: "next", spellCheck: false },
  contact_email: { inputMode: "email", autoComplete: "email", enterKeyHint: "next", spellCheck: false },
  phone: { inputMode: "tel", autoComplete: "tel", enterKeyHint: "next", spellCheck: false },
  contact_phone: { inputMode: "tel", autoComplete: "tel", enterKeyHint: "next", spellCheck: false },

  // Auth
  password: { inputMode: "text", autoComplete: "current-password", enterKeyHint: "done", spellCheck: false },
  new_password: { inputMode: "text", autoComplete: "new-password", enterKeyHint: "done", spellCheck: false },

  // Busca
  q: { inputMode: "search", autoComplete: "off", enterKeyHint: "search", spellCheck: false },
  search: { inputMode: "search", autoComplete: "off", enterKeyHint: "search", spellCheck: false },

  // Numericos com semantica especifica
  monthly_value: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  amount: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  gross_amount: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  net_amount: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  discount_amount: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  cost: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  code: { inputMode: "text", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  scope: { inputMode: "text", autoComplete: "off", enterKeyHint: "next", spellCheck: true },

  // Datas
  starts_on: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  ends_on: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  index_date: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  due_at: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
};

const TYPE_FALLBACK: Record<string, FieldInference> = {
  email: { inputMode: "email", autoComplete: "email", enterKeyHint: "next", spellCheck: false },
  tel: { inputMode: "tel", autoComplete: "tel", enterKeyHint: "next", spellCheck: false },
  url: { inputMode: "url", autoComplete: "url", enterKeyHint: "next", spellCheck: false },
  number: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  search: { inputMode: "search", autoComplete: "off", enterKeyHint: "search", spellCheck: false },
  date: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  month: { inputMode: "numeric", autoComplete: "off", enterKeyHint: "next", spellCheck: false },
  password: { inputMode: "text", autoComplete: "current-password", enterKeyHint: "done", spellCheck: false },
  text: { inputMode: "text", autoComplete: "off", enterKeyHint: "next", spellCheck: true },
};

const DEFAULT_INFERENCE: FieldInference = {
  inputMode: "text",
  autoComplete: "off",
  enterKeyHint: "next",
  spellCheck: true,
};

function inferField(
  name: string,
  type: string | undefined,
  override?: { inputMode?: string; autoComplete?: string }
): FieldInference {
  const byName = FIELD_INFERENCE[name];
  const base = byName ?? (type ? TYPE_FALLBACK[type] : undefined) ?? DEFAULT_INFERENCE;
  return {
    inputMode: (override?.inputMode as FieldInference["inputMode"]) ?? base.inputMode,
    autoComplete: override?.autoComplete ?? base.autoComplete,
    enterKeyHint: base.enterKeyHint,
    spellCheck: base.spellCheck,
  };
}

export function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
  min,
  max,
  step,
  autoFocus,
  inputMode,
  autoComplete,
  className,
  disabled,
}: FieldProps) {
  const inf = inferField(
    name,
    type,
    inputMode !== undefined || autoComplete !== undefined
      ? { inputMode, autoComplete }
      : undefined
  );

  return (
    <label className={`field ${className ?? ""}`}>
      <span>{label}{required ? " *" : ""}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        disabled={disabled}
        inputMode={inf.inputMode}
        autoComplete={inf.autoComplete}
        enterKeyHint={inf.enterKeyHint}
        spellCheck={inf.spellCheck}
      />
    </label>
  );
}

/** Exporta o helper para paginas que tem inputs custom (ex: hidden, file). */
export { inferField };
export type { FieldInference };