import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import '../app/globals.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Tema',
      description: 'Tema global',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'light', icon: 'sun', title: 'Light' },
        ],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme ?? 'dark'
      document.documentElement.setAttribute('data-theme', theme)
      return (
        <div style={{ backgroundColor: 'var(--bg-base)', minHeight: '100vh', padding: 24 }}>
          <Story />
        </div>
      )
    },
  ],
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
