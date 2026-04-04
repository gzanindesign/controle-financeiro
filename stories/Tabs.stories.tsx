import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Tabs } from '../components/ui/Tabs'

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Tabs>

function Controlled(args: React.ComponentProps<typeof Tabs>) {
  const [value, setValue] = useState(args.value)
  return <Tabs {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    value: 'all',
    items: [
      { id: 'all', label: 'Todos' },
      { id: 'debit', label: 'Débito' },
    ],
  },
}

export const ComCartoes: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    value: 'all',
    items: [
      { id: 'all', label: 'Todos' },
      { id: 'debit', label: 'Débito' },
      { id: 'card-1', label: 'Nubank', color: '#8b5cf6' },
      { id: 'card-2', label: 'C6 Bank', color: '#111827' },
      { id: 'card-3', label: 'Inter', color: '#f97316' },
    ],
  },
}

export const AbaAtiva: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    value: 'card-1',
    items: [
      { id: 'all', label: 'Todos' },
      { id: 'debit', label: 'Débito' },
      { id: 'card-1', label: 'Nubank', color: '#8b5cf6' },
      { id: 'card-2', label: 'C6 Bank', color: '#111827' },
    ],
  },
}
