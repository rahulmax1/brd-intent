import type { Metadata } from 'next'
import { projectConfig } from '@/lib/project-config'
import '@fontsource-variable/dm-sans'
import './globals.css'

export const metadata: Metadata = {
  title: projectConfig.name,
  description: projectConfig.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ fontFamily: "'DM Sans Variable', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
