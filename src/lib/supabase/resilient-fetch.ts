// Fetch resiliente para chamadas de auth server-side (proxy, Server
// Actions, Route Handlers).
//
// Diagnóstico que motivou isto (2026-08-19): da function da Vercel (iad1),
// conexões novas ao *.supabase.co ocasionalmente penduram — o host publica
// dois IPs e um deles fica inalcançável naquela rota; o connect só morre no
// timeout do runtime. Medido com /api/probe: 3 timeouts de 15s seguidos e a
// 4ª tentativa em 593ms. O login chegava a levar 120s+ e a function
// estourava os 300s.
//
// Estratégia: cortar rápido (3,5s) e retentar — a retentativa tende a cair
// no endereço são ou numa conexão já aberta do pool; a última tentativa
// ganha folga. Retentar um POST de grant é seguro aqui: o corpo é string
// (não stream) e um refresh duplicado cai na janela de graça do GoTrue
// (filho sem uso é devolvido de novo — docs/fase-2.md).
export function resilientFetch(): typeof fetch {
  return async (input, init) => {
    const tentativas = [3500, 3500, 12000];
    let ultimoErro: unknown;

    for (const timeout of tentativas) {
      const externo = init?.signal as AbortSignal | undefined;
      if (externo?.aborted) throw ultimoErro ?? new Error("aborted");
      try {
        const sinais = [AbortSignal.timeout(timeout)];
        if (externo) sinais.push(externo);
        return await fetch(input, { ...init, signal: AbortSignal.any(sinais) });
      } catch (erro) {
        ultimoErro = erro;
      }
    }

    throw ultimoErro;
  };
}
