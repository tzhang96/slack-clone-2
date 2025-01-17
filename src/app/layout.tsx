import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import { PresenceProvider } from '@/components/providers/PresenceProvider'
import SupabaseProvider from '@/components/providers/SupabaseProvider'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ChatGenius',
  description: 'A real-time chat application',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
  
  // Get the session
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} bg-blue-500 h-full overflow-hidden`}>
        <Providers>
          <SupabaseProvider session={session}>
            <AuthProvider>
              <PresenceProvider>
                {children}
              </PresenceProvider>
            </AuthProvider>
          </SupabaseProvider>
        </Providers>
      </body>
    </html>
  )
} 