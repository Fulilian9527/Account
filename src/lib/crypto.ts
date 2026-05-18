const enc = new TextEncoder()
const dec = new TextDecoder()

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function ub64(s: string): ArrayBuffer {
  const bytes = atob(s)
  const buf = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
  return buf.buffer as ArrayBuffer
}

const EK_SESSION_KEY = "expense_tracker__ek"

export async function deriveSessionKey(password: string): Promise<string> {
  const salt = enc.encode("expense_tracker_session_v1")
  const key = await (crypto.subtle.importKey as any)("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"])
  const bits = await (crypto.subtle.deriveBits as any)({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256)
  return b64(bits)
}

export function storeSessionKey(password: string): Promise<string> {
  return deriveSessionKey(password).then(k => {
    try { sessionStorage.setItem(EK_SESSION_KEY, k) } catch {}
    return k
  })
}

export function getSessionKey(): string | null {
  try { return sessionStorage.getItem(EK_SESSION_KEY) } catch { return null }
}

export function clearSessionKey() {
  try { sessionStorage.removeItem(EK_SESSION_KEY) } catch {}
}

function getEffectiveKey(userId: string): string {
  const sk = getSessionKey()
  if (sk) return sk
  return userId
}

export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt: ArrayBuffer = existingSalt
    ? ub64(existingSalt)
    : crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer
  const key = await (crypto.subtle.importKey as any)("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"])
  const hash = await (crypto.subtle.deriveBits as any)({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256)
  return { hash: b64(hash), salt: b64(salt) }
}

export async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt)
  return hash === storedHash
}

export async function encryptSecret(password: string, plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer as ArrayBuffer
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await (crypto.subtle.importKey as any)("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
  const aesKey = await (crypto.subtle.deriveKey as any)(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  )
  const encrypted = await (crypto.subtle.encrypt as any)({ name: "AES-GCM", iv }, aesKey, enc.encode(plaintext))
  const out = new Uint8Array(28 + encrypted.byteLength)
  out.set(new Uint8Array(salt), 0)
  out.set(iv, 16)
  out.set(new Uint8Array(encrypted), 28)
  return b64(out.buffer as ArrayBuffer)
}

export async function decryptSecret(password: string, encoded: string): Promise<string | null> {
  try {
    const raw = new Uint8Array(ub64(encoded))
    const salt = raw.slice(0, 16).buffer as ArrayBuffer
    const iv = raw.slice(16, 28)
    const data = raw.slice(28)
    const key = await (crypto.subtle.importKey as any)("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
    const aesKey = await (crypto.subtle.deriveKey as any)(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      key, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    )
    const decrypted = await (crypto.subtle.decrypt as any)({ name: "AES-GCM", iv }, aesKey, data)
    return dec.decode(decrypted)
  } catch {
    return null
  }
}

export async function encryptUserSecret(userId: string, plaintext: string): Promise<string> {
  return encryptSecret(getEffectiveKey(userId), plaintext)
}

export async function decryptUserSecret(userId: string, encoded: string): Promise<string | null> {
  return decryptSecret(getEffectiveKey(userId), encoded)
}
