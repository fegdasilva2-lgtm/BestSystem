"use client";

import { useActionState } from "react";
import { login } from "@/app/auth/actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction}>
      <input name="next" type="hidden" value={next} />
      <label className="field">
        <span>E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="seu@empresa.com.br"
          disabled={pending}
        />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="••••••••"
          disabled={pending}
        />
      </label>
      <div className="form-actions">
        <a className="button-link" href="/setup">
          Primeiro acesso
        </a>
        <button type="submit" className="primary-button" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </form>
  );
}
