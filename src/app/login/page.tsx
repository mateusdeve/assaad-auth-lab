"use client";

import { useActionState } from "react";
import { login, signup } from "./actions";

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    null
  );

  const pending = loginPending || signupPending;
  const message = loginState?.error ?? signupState?.error;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold">assaad-auth-lab</h1>
          <p className="text-sm text-neutral-500">
            Entre para acessar o dashboard.
          </p>
        </div>

        <form className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Senha</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>

          {message && (
            <p role="alert" className="text-sm text-red-600">
              {message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              formAction={loginAction}
              disabled={pending}
              className="flex-1 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {loginPending ? "Entrando…" : "Entrar"}
            </button>
            <button
              formAction={signupAction}
              disabled={pending}
              className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
            >
              {signupPending ? "Criando…" : "Criar conta"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
