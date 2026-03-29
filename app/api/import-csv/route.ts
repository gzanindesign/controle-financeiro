import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("csv") as File | null;
    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    // Remove header
    const dataLines = lines.slice(1);

    const transactions = [];

    for (const line of dataLines) {
      // Split by semicolon, respecting quoted fields
      const cols = splitCSVLine(line);
      if (cols.length < 9) continue;

      const [dataBruta, nomeCartao, finalCartao, , descricao, parcela, , , valorBruto] = cols;

      // Converte valor
      const amount = parseFloat(valorBruto.replace(",", "."));

      // Ignora valores negativos (pagamentos, estornos) e zero
      if (isNaN(amount) || amount <= 0) continue;

      // Ignora linhas de pagamento e anuidade pelo nome
      const descLower = descricao.toLowerCase();
      if (
        descLower.includes("inclusao de pagamento") ||
        descLower.includes("pagamento de fatura") ||
        descLower.includes("estorno tarifa") ||
        descLower.includes("estorno de")
      ) continue;

      // Converte data de DD/MM/YYYY para YYYY-MM-DD
      const [dia, mes, ano] = dataBruta.split("/");
      if (!dia || !mes || !ano) continue;
      const date = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;

      // Parcela: "Única" → null, "2/6" → current=2, total=6
      let installment_current: number | null = null;
      let installment_total: number | null = null;
      if (parcela && parcela !== "Única" && parcela.includes("/")) {
        const [cur, tot] = parcela.split("/");
        installment_current = parseInt(cur);
        installment_total = parseInt(tot);
      }

      transactions.push({
        date,
        description: descricao.trim(),
        amount,
        installment_current,
        installment_total,
        card_name: nomeCartao?.trim() ?? null,
        card_last_digits: finalCartao?.trim() ?? null,
      });
    }

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("import-csv error:", err);
    return NextResponse.json({ error: "Erro ao processar CSV" }, { status: 500 });
  }
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
