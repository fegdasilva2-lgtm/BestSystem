import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * <Select> canonico do PredialOps (paralelo ao <Field>).
 *
 * Encapsula o pattern <label.field> + <select> espalhado em N page.tsx.
 * Herda mesma inferencia de autoComplete/inputMode do Field para o
 * atributo `name` quando aplicavel.
 *
 * Diferenca do Field: o tipo do input HTML e 'select' (nao 'text'),
 * entao a inferencia de inputMode/autocomplete vem do primeiro option
 * (heuristica simples) ou do `name`.
 */

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  name: string;
  label: string;
  options: Option[];
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Inferencia explicita - senao usa heuristica por name */
  autoComplete?: string;
}

const SELECT_INFERENCE: Record<string, { autoComplete: string }> = {
  customer_id: { autoComplete: "off" },
  contract_id: { autoComplete: "off" },
  billing_rule: { autoComplete: "off" },
  rgm_periodicity: { autoComplete: "off" },
  status: { autoComplete: "off" },
  type: { autoComplete: "off" },
  priority: { autoComplete: "off" },
  criticality: { autoComplete: "off" },
  index_name: { autoComplete: "off" },
  template_id: { autoComplete: "off" },
};

export function Select({
  name,
  label,
  options,
  required,
  defaultValue,
  placeholder,
  className,
  disabled,
  autoComplete,
}: SelectProps) {
  const inf = SELECT_INFERENCE[name];
  const ac = autoComplete ?? inf?.autoComplete ?? "off";

  return (
    <label className={`field ${className ?? ""}`}>
      <span>{label}{required ? " *" : ""}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        disabled={disabled}
        autoComplete={ac}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Tipo re-exportado para consumidores que precisam compor. */
export type { Option };