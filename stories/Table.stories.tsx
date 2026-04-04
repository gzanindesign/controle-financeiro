import type { Meta, StoryObj } from '@storybook/react'
import { Table, Thead, Tbody, Th, Td, TotalRow } from '../components/ui/Table'

const meta: Meta = {
  title: 'UI/Table',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
}

export default meta

export const Default: StoryObj = {
  render: () => (
    <Table>
      <Thead>
        <tr>
          <Th>Descrição</Th>
          <Th>Previsto</Th>
          <Th>Recebido</Th>
          <Th>Diferença</Th>
        </tr>
      </Thead>
      <Tbody>
        <tr>
          <Td>Salário Gui</Td>
          <Td>R$ 8.000,00</Td>
          <Td>R$ 8.000,00</Td>
          <Td style={{ color: 'var(--color-success)' }}>R$ 0,00</Td>
        </tr>
        <tr>
          <Td>Freelance</Td>
          <Td>R$ 2.000,00</Td>
          <Td>R$ 1.500,00</Td>
          <Td style={{ color: 'var(--color-danger)' }}>-R$ 500,00</Td>
        </tr>
        <TotalRow>
          <Td>Total</Td>
          <Td>R$ 10.000,00</Td>
          <Td>R$ 9.500,00</Td>
          <Td style={{ color: 'var(--color-danger)' }}>-R$ 500,00</Td>
        </TotalRow>
      </Tbody>
    </Table>
  ),
}
