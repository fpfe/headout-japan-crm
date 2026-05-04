'use client'

// "Viewing as" identity — UI-only personalization for the shared-password
// login. The app currently authenticates everyone with one shared password
// (NextAuth CredentialsProvider with a single APP_SHARED_PASSWORD), so we
// can't tell *which* team member is using the app from the session.
//
// Until proper per-user auth is in place, each browser remembers who the
// user identifies as via this localStorage hook. The "My Leads" toggle and
// any future per-user filters key off this value.

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'cowork.viewingAs.name'
const DEFAULT_NAME = 'Seungjun Ahn'
const CHANGE_EVENT = 'viewing-as:changed'

function readStored(): string {
  if (typeof window === 'undefined') return DEFAULT_NAME
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v && v.trim() ? v : DEFAULT_NAME
  } catch {
    return DEFAULT_NAME
  }
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onCustom = () => onChange()
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange()
  }
  window.addEventListener(CHANGE_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Read/write the current "viewing as" team-member name.
 *
 * SSR and the client's first render both use the default value (via the
 * `getServerSnapshot` arg). After hydration, `useSyncExternalStore`
 * automatically swaps in the real localStorage value if it differs —
 * no `hydrated` flag needed, no SSR mismatch.
 */
export function useViewingAs(): {
  name: string
  setName: (next: string) => void
} {
  const name = useSyncExternalStore(
    subscribe,
    readStored,
    () => DEFAULT_NAME // server snapshot — also used for client's first paint
  )

  const setName = useCallback((next: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
    } catch {
      /* ignore */
    }
  }, [])

  return { name, setName }
}
