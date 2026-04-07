'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await signIn('credentials', {
        password,
        redirect: false,
      })
      if (!result || result.error) {
        setError('Incorrect password. Please try again.')
      } else {
        router.push('/dashboard')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#f9f9ff' }}
    >
      <div
        className="w-full bg-white rounded-3xl"
        style={{
          maxWidth: 420,
          padding: '2.5rem',
          border: '1px solid #ebedf8',
        }}
      >
        <div className="text-center mb-8">
          <div
            className="font-display font-extrabold text-[#a83900]"
            style={{ fontSize: 24 }}
          >
            Acquisition
          </div>
          <div
            className="mt-1 text-[10px] uppercase font-semibold text-gray-500"
            style={{ letterSpacing: '0.18em' }}
          >
            Japan Market
          </div>
        </div>

        <h1
          className="font-display text-[#181c23]"
          style={{ fontSize: 22, fontWeight: 700 }}
        >
          Welcome back
        </h1>
        <p className="text-[13px] text-gray-500 mt-1 mb-8">
          Enter the team password to continue
        </p>

        <form onSubmit={onSubmit}>
          <label
            htmlFor="password"
            className="block text-[12px] text-[#181c23] font-medium mb-2"
          >
            Team password
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full outline-none text-[14px]"
              style={{
                background: '#f1f3fe',
                borderRadius: 10,
                padding: '12px 44px 12px 16px',
                border: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#a83900]"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20 }}
              >
                {show ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-5 brand-gradient text-white font-bold rounded-full py-3 text-[14px] hover:opacity-95 transition disabled:opacity-70"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          {error && (
            <div
              className="mt-3 text-[13px]"
              style={{ color: '#ba1a1a' }}
            >
              {error}
            </div>
          )}
        </form>
      </div>

      <div className="mt-6 text-[11px] text-gray-500">
        Kinetic CRM · Internal Use Only
      </div>
    </div>
  )
}
