import React, { CSSProperties, ReactNode } from 'react'

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: '#f4f7f9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  direction: 'rtl',
}

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '460px',
  background: '#fff',
  borderRadius: '12px',
  padding: '32px',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.09)',
}

const AuthLayout = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) => (
  <main style={pageStyle}>
    <section style={cardStyle} aria-label={title}>
      <h1 className="h3 mb-2">RunCDX</h1>
      <h2 className="h5 mb-2">{title}</h2>
      <p className="text-muted mb-4">{subtitle}</p>
      {children}
    </section>
  </main>
)

export default AuthLayout
