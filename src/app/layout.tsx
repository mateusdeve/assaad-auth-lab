import type { Metadata } from "next";
import Link from "next/link";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "assaad auth lab",
  description:
    "A aula não pode cair. Laboratório do deslogamento aleatório: Next.js App Router + Supabase SSR — bug reproduzido, medido e corrigido.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${anton.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Os dois únicos pontos de UI que quebram o canvas (design system:
            exatamente dois círculos de 50px nos cantos absolutos). */}
        <Link
          href="/"
          aria-label="Início"
          className="fixed left-5 top-5 z-50 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-magenta text-xl text-chalk transition-transform hover:scale-105"
        >
          ⚡
        </Link>
        <Link
          href="/dashboard"
          aria-label="Ir para o dashboard"
          className="fixed right-5 top-5 z-50 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-magenta text-xl text-chalk transition-transform hover:scale-105"
        >
          ↗
        </Link>
        {children}
      </body>
    </html>
  );
}
