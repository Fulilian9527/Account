import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const isConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!url && !url.includes("placeholder") && !url.includes("example.supabase")
}

export async function createServerSupabase() {
  if (!isConfigured()) {
    return null as any
  }
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentUser() {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
