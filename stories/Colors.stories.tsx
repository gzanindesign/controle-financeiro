import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Design System/Cores',
  parameters: { layout: 'padded' },
}

export default meta

const darkTokens = {
  '--bg-base': '#0f1117',
  '--bg-surface': '#1a1d27',
  '--bg-elevated': '#22263a',
  '--bg-border': '#2d3147',
  '--color-primary': '#2563eb',
  '--color-primary-dark': '#1d4ed8',
  '--color-danger': '#ef4444',
  '--color-warning': '#f59e0b',
  '--color-success': '#22c55e',
  '--color-text': '#f9fafb',
  '--color-text-muted': '#9ca3af',
}

const lightTokens: Partial<typeof darkTokens> = {
  '--bg-base': '#f3f4f6',
  '--bg-surface': '#ffffff',
  '--bg-elevated': '#e5e7eb',
  '--bg-border': '#d1d5db',
  '--color-text': '#111827',
  '--color-text-muted': '#6b7280',
}

const groups = [
  {
    label: 'Fundos',
    tokens: ['--bg-base', '--bg-surface', '--bg-elevated', '--bg-border'],
  },
  {
    label: 'Ações',
    tokens: ['--color-primary', '--color-primary-dark', '--color-danger', '--color-warning', '--color-success'],
  },
  {
    label: 'Texto',
    tokens: ['--color-text', '--color-text-muted'],
  },
]

const desc: Record<string, string> = {
  '--bg-base': 'Fundo principal da tela',
  '--bg-surface': 'Cards e painéis',
  '--bg-elevated': 'Inputs e elementos elevados',
  '--bg-border': 'Bordas e divisores',
  '--color-primary': 'Ações principais / botões',
  '--color-primary-dark': 'Hover do primário',
  '--color-danger': 'Erros e exclusões',
  '--color-warning': 'Alertas',
  '--color-success': 'Sucesso / valores positivos',
  '--color-text': 'Texto principal',
  '--color-text-muted': 'Texto secundário / labels',
}

function ThemeColumn({ label, tokens, palette, bg }: {
  label: string
  tokens: string[]
  palette: Record<string, string>
  bg: string
}) {
  return (
    <div style={{ flex: 1, backgroundColor: bg, borderRadius: 12, padding: 20, border: '1px solid #2d3147' }}>
      <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 13, color: label === 'Dark' ? '#f9fafb' : '#111827' }}>
        {label}
      </p>
      {tokens.map(token => (
        <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: palette[token as keyof typeof palette] ?? darkTokens[token as keyof typeof darkTokens],
            border: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: label === 'Dark' ? '#f9fafb' : '#111827' }}>
              {token.replace('--', '')}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: label === 'Dark' ? '#9ca3af' : '#6b7280' }}>
              {palette[token as keyof typeof palette] ?? darkTokens[token as keyof typeof darkTokens]}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export const Paleta: StoryObj = {
  render: () => (
    <div style={{ maxWidth: 700 }}>
      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: 32 }}>
          <p style={{
            margin: '0 0 12px',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: 'var(--color-text-muted)',
          }}>
            {group.label}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <ThemeColumn
              label="Dark"
              tokens={group.tokens}
              palette={darkTokens}
              bg="#0f1117"
            />
            <ThemeColumn
              label="Light"
              tokens={group.tokens}
              palette={{ ...darkTokens, ...lightTokens }}
              bg="#f3f4f6"
            />
          </div>
        </div>
      ))}
    </div>
  ),
}
