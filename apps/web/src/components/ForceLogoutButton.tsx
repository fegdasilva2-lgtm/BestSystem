"use client";

import { useTransition } from "react";

interface ForceLogoutButtonProps {
  /** Server action que recebe o userId via FormData. */
  action: (formData: FormData) => void | Promise<void>;
  /** userId passado como campo hidden do form. */
  userId: string;
  /** Nome exibido no confirm. */
  userName: string;
}

/**
 * Botao para invalidar todas as sessoes ativas de um usuario.
 * Renderiza um <form> pequeno com confirm nativo antes de submeter.
 * O confirm e client-side; se o usuario cancelar, o request nao sai.
 */
export function ForceLogoutButton({ action, userId, userName }: ForceLogoutButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = window.confirm(
      `Invalidar todas as sessoes ativas de ${userName}? O usuario tera que fazer login novamente.`
    );
    if (!ok) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "inline-flex", margin: 0 }}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="btn-link-danger"
        disabled={pending}
        title="Forçar logout em todas as sessoes ativas deste usuario"
      >
        {pending ? "Invalidando..." : "Invalidar sessoes"}
      </button>
    </form>
  );
}