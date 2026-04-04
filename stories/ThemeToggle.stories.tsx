import type { Meta, StoryObj } from '@storybook/react'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
}

export default meta

export const Dark: StoryObj = {
  decorators: [
    (Story) => {
      document.documentElement.setAttribute('data-theme', 'dark')
      return (
        <div style={{ backgroundColor: 'var(--bg-base)', padding: 24, borderRadius: 12 }}>
          <Story />
        </div>
      )
    },
  ],
}

export const Light: StoryObj = {
  decorators: [
    (Story) => {
      document.documentElement.setAttribute('data-theme', 'light')
      return (
        <div style={{ backgroundColor: 'var(--bg-base)', padding: 24, borderRadius: 12 }}>
          <Story />
        </div>
      )
    },
  ],
}
