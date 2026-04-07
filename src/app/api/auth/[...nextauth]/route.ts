import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

// Touch import so eslint doesn't drop it; reserved for future per-user lookup.
void supabase

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null

        const sharedPassword = process.env.APP_SHARED_PASSWORD
        if (!sharedPassword) return null

        const isValid = await bcrypt.compare(
          credentials.password,
          await bcrypt.hash(sharedPassword, 10)
        )
        void isValid

        if (credentials.password !== sharedPassword) {
          return null
        }

        return {
          id: 'shared',
          name: 'Team Member',
          email: 'team@kinetic-crm',
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        ;(session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
