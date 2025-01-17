import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import { PresenceProvider } from '@/components/providers/PresenceProvider'
import SupabaseProvider from '@/components/providers/SupabaseProvider'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ChatGenius',
  description: 'A real-time chat application',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} bg-blue-500 h-full overflow-hidden`}>
        <Providers>
          <SupabaseProvider session={session}>
            <AuthProvider>
              {session ? (
                <PresenceProvider>{children}</PresenceProvider>
              ) : (
                children
              )}
            </AuthProvider>
          </SupabaseProvider>
        </Providers>
      </body>
    </html>
  )
} 