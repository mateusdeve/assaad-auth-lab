import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Assaad · Auth Lab",
  description:
    "A aula não pode cair. Laboratório do deslogamento aleatório: Next.js App Router + Supabase SSR — bug reproduzido, medido e corrigido.",
};

const REPO = "https://github.com/mateusdeve/assaad-auth-lab";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
          <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/brand.png"
                alt=""
                width={28}
                height={28}
                className="rounded-md"
              />
              <span className="text-sm font-semibold tracking-tight">
                Assaad <span className="text-mist">· Auth Lab</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium text-mist">
              <Link
                href="/demo"
                className="rounded-lg px-3 py-2 transition-colors hover:text-snow"
              >
                Demo
              </Link>
              <a
                href={REPO}
                className="hidden rounded-lg px-3 py-2 transition-colors hover:text-snow sm:block"
              >
                GitHub
              </a>
              <Link
                href="/dashboard"
                className="hidden rounded-lg px-3 py-2 transition-colors hover:text-snow sm:block"
              >
                Dashboard
              </Link>
              <Link
                href="/login"
                className="ml-2 rounded-lg bg-blue px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-soft"
              >
                Entrar
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
