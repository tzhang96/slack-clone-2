import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import { PresenceProvider } from '@/components/providers/PresenceProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ChatGenius',
  description: 'A real-time chat application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} bg-blue-500 h-full overflow-hidden`}>
        <AuthProvider>
          <PresenceProvider>
            {children}
          </PresenceProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 