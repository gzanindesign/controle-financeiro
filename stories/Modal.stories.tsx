'use client'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
}

export default meta

export const Default: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button variant="primary" onClick={() => setOpen(true)}>Abrir Modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Adicionar Receita">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Descrição</Label>
              <Input placeholder="Ex: Salário Gui" />
            </div>
            <div>
              <Label>Valor Previsto</Label>
              <Input type="number" placeholder="0,00" />
            </div>
            <div>
              <Label>Valor Recebido</Label>
              <Input type="number" placeholder="0,00" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary">Salvar</Button>
            </div>
          </div>
        </Modal>
      </>
    )
  },
}
