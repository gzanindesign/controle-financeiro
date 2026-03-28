"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Thead, Tbody, Th, Td, TotalRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface Config { id: string; label: string; percentage: number }

export function PlanejamentoClient({ configs: initial }: { configs: Config[] }) {
  const [configs, setConfigs] = useState(initial);
  const [income, setIncome] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const incomeValue = parseFloat(income) || 0;
  const total = configs.reduce((s, c) => s + c.percentage, 0);

  async function save() {
    setSaving(true);
    await fetch("/api/planning", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configs),
    });
    setSaving(false); setEditing(false);
  }

  const nextMonth = (() => {
    const now = new Date();
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(new Date(now.getFullYear(), now.getMonth() + 1));
  })();

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Receita de Referência</CardTitle>
        </CardHeader>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Renda do mês atual (R$)</Label>
            <Input
              type="number" step="0.01" value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="ex: 8000,00"
            />
          </div>
        </div>
        {incomeValue > 0 && (
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Os valores calculados abaixo são os <strong style={{ color: "var(--color-text)" }}>tetos para {nextMonth}</strong> (lógica de defasagem).
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição Percentual</CardTitle>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>Editar Percentuais</Button>
            )}
          </div>
        </CardHeader>

        <Table>
          <Thead>
            <tr>
              <Th>Área</Th>
              <Th className="text-right">%</Th>
              {incomeValue > 0 && <Th className="text-right">Valor (R$)</Th>}
            </tr>
          </Thead>
          <Tbody>
            {configs.map((c, i) => (
              <tr key={c.id}>
                <Td>
                  {editing ? (
                    <Input value={c.label} onChange={(e) => setConfigs((p) => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  ) : c.label}
                </Td>
                <Td className="text-right">
                  {editing ? (
                    <Input type="number" step="0.5" className="w-24 ml-auto" value={c.percentage}
                      onChange={(e) => setConfigs((p) => p.map((x, j) => j === i ? { ...x, percentage: parseFloat(e.target.value) || 0 } : x))} />
                  ) : `${c.percentage}%`}
                </Td>
                {incomeValue > 0 && (
                  <Td className="text-right font-medium">{formatCurrency(incomeValue * c.percentage / 100)}</Td>
                )}
              </tr>
            ))}
          </Tbody>
          <tfoot>
            <TotalRow>
              <Td className="font-semibold">Total</Td>
              <Td className="text-right font-semibold" style={{ color: Math.abs(total - 100) > 0.1 ? "var(--color-danger)" : "var(--color-success)" }}>
                {total.toFixed(1)}%
              </Td>
              {incomeValue > 0 && <Td className="text-right font-semibold">{formatCurrency(incomeValue * total / 100)}</Td>}
            </TotalRow>
          </tfoot>
        </Table>

        {Math.abs(total - 100) > 0.1 && (
          <p className="mt-3 text-xs" style={{ color: "var(--color-danger)" }}>
            A soma dos percentuais deve ser 100%. Atual: {total.toFixed(1)}%
          </p>
        )}
      </Card>
    </>
  );
}
