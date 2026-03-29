import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const prompt = `Você é um especialista em análise de faturas bancárias brasileiras. Analise esta fatura do cartão de crédito C6 Bank e extraia todas as transações de compra.

OBJETIVO: Retornar APENAS um JSON válido com todas as compras encontradas. Sem explicações, sem markdown, sem texto adicional.

FORMATO DE SAÍDA (siga exatamente):
{
  "transactions": [
    {
      "date": "2025-03-15",
      "description": "NOME DO ESTABELECIMENTO",
      "amount": 99.90,
      "installment_current": null,
      "installment_total": null
    }
  ]
}

REGRAS PARA CADA CAMPO:

date:
- Formato obrigatório: YYYY-MM-DD
- A fatura C6 Bank mostra datas como "15 MAR" ou "15/03" — converta para YYYY-MM-DD
- Use o mês/ano de referência da fatura para completar datas incompletas
- Se não tiver ano, use o ano do mês de vencimento da fatura

description:
- Nome do estabelecimento exatamente como aparece na fatura
- Mantenha letras maiúsculas, não traduza nem abrevie
- Para transações internacionais, inclua o nome como está (ex: "NETFLIX.COM", "SPOTIFY")
- NÃO inclua o número de parcela no description

amount:
- Sempre número positivo com ponto decimal (ex: 49.90, não 49,90)
- Converta valores em moeda estrangeira se aparecer o valor em reais na fatura

installment_current e installment_total:
- Se a compra for parcelada (ex: "02/06" ou "Parcela 2 de 6"), preencha: installment_current: 2, installment_total: 6
- Se NÃO for parcelada, use null para ambos

O QUE INCLUIR:
- Todas as compras e débitos do titular
- Compras internacionais
- Compras de cartão adicional (se houver)
- Assinaturas e serviços recorrentes

O QUE IGNORAR (NÃO incluir):
- Pagamento de fatura anterior
- Crédito de estorno ou reembolso (valores negativos ou com sinal de crédito)
- IOF
- Encargos, juros, multas
- Limite disponível, saldo, totais da fatura
- Linhas de cabeçalho ou rodapé

Retorne SOMENTE o JSON válido, começando com { e terminando com }.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "application/pdf", data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Remove markdown code blocks se o modelo retornar com eles
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return NextResponse.json(JSON.parse(match[0]));
      return NextResponse.json({ error: "Não foi possível interpretar a resposta", raw: text }, { status: 500 });
    }
  } catch (err) {
    console.error("import-pdf error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
