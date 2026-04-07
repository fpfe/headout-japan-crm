import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const handler = withAuth(
  function () {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export { handler as proxy }

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
