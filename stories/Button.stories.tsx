import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Adicionar' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Cancelar' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Excluir' },
}

export const Small: Story = {
  args: { variant: 'primary', size: 'sm', children: 'Salvar' },
}

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Aguarde...', disabled: true },
}
