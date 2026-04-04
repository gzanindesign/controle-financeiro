import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>Saldo Total</CardTitle>
        <Button variant="primary" size="sm">Adicionar</Button>
      </CardHeader>
      <p style={{ color: 'var(--color-text)', fontSize: 28, fontWeight: 700, margin: 0 }}>
        R$ 12.540,00
      </p>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <p style={{ color: 'var(--color-text)', margin: 0 }}>Conteúdo simples dentro do card.</p>
    </Card>
  ),
}
