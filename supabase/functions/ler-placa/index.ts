// Edge Function: ler-placa
// Recebe uma imagem (base64) e usa o Gemini (visão) para extrair a placa.
// A chave do Gemini fica em segredo no servidor (GEMINI_API_KEY), nunca no front-end.
//
// Esta versão DESCOBRE automaticamente qual modelo a sua chave tem disponível
// (via ListModels), então não depende de um nome de modelo fixo.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE = "https://generativelanguage.googleapis.com/v1beta";

const PROMPT =
  "Você é um leitor de placas de veículos brasileiros. Extraia APENAS a placa que aparece na imagem. " +
  "Responda somente com a placa, em letras MAIÚSCULAS, sem espaços, sem traços e sem nenhum outro texto. " +
  "Formatos válidos: 3 letras + 4 números (ABC1234) ou Mercosul 3 letras + número + letra + 2 números (ABC1D23). " +
  "Se não houver nenhuma placa legível, responda exatamente: NAO_ENCONTRADA";

// Pontua os modelos para escolher o melhor para ler imagem (visão) de graça.
function pontuar(nome: string): number {
  const n = nome.toLowerCase();
  let s = 0;
  if (n.includes("flash")) s += 10;
  if (n.includes("lite")) s += 2;
  if (n.includes("pro")) s += 1;
  if (n.includes("image")) s -= 8;   // esses GERAM imagem, não leem
  if (n.includes("tts") || n.includes("audio")) s -= 8;
  if (n.includes("preview") || n.includes("exp")) s -= 4;
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY não configurada no servidor." }, 500);

    const { imagem, mime } = await req.json();
    if (!imagem) return json({ error: "Nenhuma imagem enviada." }, 400);
    const base64 = String(imagem).includes(",") ? String(imagem).split(",")[1] : String(imagem);
    const mimeType = mime || "image/jpeg";

    // 1) Descobre os modelos disponíveis para esta chave
    const listResp = await fetch(`${BASE}/models?key=${apiKey}`);
    if (!listResp.ok) {
      const t = await listResp.text();
      return json({ error: `Não foi possível listar os modelos (${listResp.status}): ${t.slice(0, 300)}` }, 502);
    }
    const listData = await listResp.json();
    const candidatos = (listData.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: any) => String(m.name).replace(/^models\//, ""))
      .sort((a: string, b: string) => pontuar(b) - pontuar(a));

    if (candidatos.length === 0) {
      return json({ error: "Nenhum modelo com generateContent disponível para esta chave." }, 502);
    }

    // 2) Tenta gerar, do melhor candidato para o pior
    const body = {
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 20 },
    };

    let ultimoErro = "";
    for (const modelo of candidatos.slice(0, 4)) {
      const resp = await fetch(`${BASE}/models/${modelo}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) { ultimoErro = `${modelo}: ${resp.status}`; continue; }
      const data = await resp.json();
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const placa = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!placa || placa.includes("NAOENCONTRADA")) {
        return json({ placa: null, aviso: "Placa não encontrada na imagem.", modelo });
      }
      return json({ placa, modelo });
    }

    return json({
      error: "Nenhum modelo aceitou a requisição. Último erro: " + ultimoErro +
             ". Modelos vistos: " + candidatos.slice(0, 6).join(", "),
    }, 502);
  } catch (e) {
    return json({ error: "Falha ao processar: " + ((e as any)?.message ?? String(e)) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}