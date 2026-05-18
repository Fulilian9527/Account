import { createBrowserClient } from "@supabase/ssr"
import { LocalClient, isSupabaseConfigured, seedDemoData } from "@/lib/local-db"

let localClient: LocalClient | null = null

export function createClient() {
  if (isSupabaseConfigured()) {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  if (!localClient) {
    localClient = new LocalClient()
  }

  return localClient as any
}

export function getLocalUserId(): string | null {
  if (isSupabaseConfigured()) return null
  try {
    const raw = localStorage.getItem("expense_tracker__session")
    if (raw) {
      const session = JSON.parse(raw)
      const userId = session.user?.id
      if (userId) {
        seedDemoData(userId)
        return userId
      }
    }
  } catch {}
  return null
}
