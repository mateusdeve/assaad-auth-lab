"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { login, signup } from "./actions";

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    null
  );
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const pending = loginPending || signupPending;
  const message = loginState?.error ?? signupState?.error;

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 md:p-10">
        <Image
          src="/brand.png"
          alt=""
          width={44}
          height={44}
          className="rounded-xl"
        />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Voltar ao estudo
        </h1>
        <p className="mt-1.5 text-sm text-mist">
          Entre para acessar o dashboard — e repare que a sessão não cai mais.
        </p>

        <form className="mt-8 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-base placeholder:text-mist/50 transition-colors focus:border-blue focus:outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Senha</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-base placeholder:text-mist/50 transition-colors focus:border-blue focus:outline-none"
            />
          </label>

          {message && (
            <p
              role="alert"
              className="rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm font-medium text-red"
            >
              {message}
            </p>
          )}

          <div className="space-y-3 pt-1">
            <button
              formAction={loginAction}
              disabled={pending}
              className="w-full rounded-xl bg-blue px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-soft disabled:opacity-50"
            >
              {loginPending ? "Entrando…" : "Entrar"}
            </button>
            <button
              formAction={signupAction}
              disabled={pending}
              className="w-full rounded-xl border border-line px-4 py-3.5 text-base font-semibold text-mist transition-colors hover:border-mist hover:text-snow disabled:opacity-50"
            >
              {signupPending ? "Criando…" : "Criar conta"}
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-ink px-4 py-3">
          <p className="text-xs leading-relaxed text-mist">
            Avaliando o teste? Use a conta demo:
            <br />
            <code className="text-blue-soft">demo@authlab.dev</code> ·{" "}
            <code className="text-blue-soft">assaad-demo-2026</code>
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail("demo@authlab.dev");
              setSenha("assaad-demo-2026");
            }}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold transition-colors hover:border-blue hover:text-blue-soft"
          >
            Preencher
          </button>
        </div>
      </div>
    </main>
  );
}
