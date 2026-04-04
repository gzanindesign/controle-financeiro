import type { Meta, StoryObj } from '@storybook/react'
import { Input, Select, Label } from '../components/ui/Input'

const meta: Meta = {
  title: 'UI/Input',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta

export const TextInput: StoryObj = {
  render: () => (
    <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Label>Descrição</Label>
        <Input placeholder="Ex: Salário" />
      </div>
      <div>
        <Label>Valor</Label>
        <Input type="number" placeholder="0,00" />
      </div>
    </div>
  ),
}

export const SelectInput: StoryObj = {
  render: () => (
    <div style={{ width: 320 }}>
      <Label>Categoria</Label>
      <Select>
        <option>Moradia</option>
        <option>Alimentação</option>
        <option>Transporte</option>
        <option>Educação</option>
      </Select>
    </div>
  ),
}

export const Disabled: StoryObj = {
  render: () => (
    <div style={{ width: 320 }}>
      <Label>Campo desabilitado</Label>
      <Input placeholder="Não editável" disabled />
    </div>
  ),
}
