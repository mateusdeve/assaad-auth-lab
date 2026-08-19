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
    <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 items-end gap-10 px-6 pb-[60px] pt-[120px] md:grid-cols-2 md:items-center md:px-16">
      <div>
        <p className="mb-5 text-sm font-medium">área do aluno</p>
        <h1 className="display text-magenta text-[clamp(64px,10vw,130px)]">
          Voltar
          <br />
          ao estudo.
        </h1>
        <p className="display text-blush text-[clamp(36px,5vw,64px)]">
          sem cair no caminho.
        </p>
      </div>

      <form className="w-full max-w-sm space-y-5 md:justify-self-end">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-[10px] border-2 border-blush bg-transparent px-4 py-3 text-base transition-colors focus:border-magenta focus:outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="w-full rounded-[10px] border-2 border-blush bg-transparent px-4 py-3 text-base transition-colors focus:border-magenta focus:outline-none"
          />
        </label>

        {message && (
          <p role="alert" className="text-sm font-bold text-magenta">
            {message}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            formAction={loginAction}
            disabled={pending}
            className="flex-1 rounded-[10px] bg-magenta px-4 py-3 text-base font-bold text-chalk transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {loginPending ? "Entrando…" : "Entrar"}
          </button>
          <button
            formAction={signupAction}
            disabled={pending}
            className="flex-1 rounded-[10px] border-2 border-ink px-4 py-3 text-base font-bold transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
          >
            {signupPending ? "Criando…" : "Criar conta"}
          </button>
        </div>
      </form>
    </main>
  );
}
