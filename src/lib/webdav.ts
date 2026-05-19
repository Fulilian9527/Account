import { createClient } from "@/lib/supabase/client"


export interface WebDAVConfig {
  url: string
  username: string
  password: string
  path: string
}



function basicAuth(username: string, password: string): string {
  return "Basic " + btoa(`${username}:${password}`)
}

function buildUrl(baseUrl: string, remotePath: string): string {
  const base = baseUrl.replace(/\/+$/, "")
  const path = remotePath.replace(/^\/+/, "")
  return `${base}/${path}`
}

export async function testWebDAVConnection(config: WebDAVConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = buildUrl(config.url, config.path || "")
    const res = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: basicAuth(config.username, config.password),
        Depth: "0",
      },
    })
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "认证失败，请检查用户名和密码" }
    }
    if (!res.ok) {
      return { ok: false, error: `杩炴帴澶辫触 (${res.status})` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "无法连接到服务器" }
  }
}

const BACKUP_PREFIX = "expense-tracker-backup-"
const BACKUP_SUFFIX = ".json"
const MAX_BACKUPS = 10

function generateBackupFilename(): string {
  const now = new Date()
  const ts = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") + "T" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  return BACKUP_PREFIX + ts + BACKUP_SUFFIX
}

function isBackupFile(name: string): boolean {
  return name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX)
}

async function listBackupFiles(config: WebDAVConfig): Promise<{ ok: boolean; files?: { name: string; modified?: string }[]; error?: string }> {
  try {
    const dir = config.path || ""
    const url = buildUrl(config.url, dir)
    const res = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: basicAuth(config.username, config.password),
        Depth: "1",
      },
    })
    if (!res.ok) {
      return { ok: false, error: `列出文件失败 (${res.status})` }
    }
    const text = await res.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, "text/xml")
    const responses = xml.getElementsByTagNameNS("*", "response")
    const files: { name: string; modified?: string }[] = []
    for (const resp of responses) {
      const hrefEl = resp.getElementsByTagNameNS("*", "href")[0]
      const href = hrefEl?.textContent || ""
      const name = href.split("/").filter(Boolean).pop() || ""
      if (!name || !isBackupFile(name)) continue
      const modifiedEl = resp.getElementsByTagNameNS("*", "getlastmodified")[0]
      const modified = modifiedEl?.textContent || undefined
      files.push({ name, modified })
    }
    return { ok: true, files }
  } catch (err: any) {
    return { ok: false, error: err.message || "列出文件失败" }
  }
}

async function deleteFromWebDAV(config: WebDAVConfig, filename: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const remotePath = (config.path ? config.path.replace(/\/+$/, "") + "/" : "") + filename
    const url = buildUrl(config.url, remotePath)
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: basicAuth(config.username, config.password),
      },
    })
    if (!res.ok) {
      return { ok: false, error: `删除失败 (${res.status})` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "删除失败" }
  }
}

export async function uploadWithRotation(config: WebDAVConfig, data: string): Promise<{ ok: boolean; error?: string; filename?: string }> {
  const filename = generateBackupFilename()
  const listResult = await listBackupFiles(config)
  if (!listResult.ok) {
    return { ok: false, error: listResult.error }
  }

  const files = listResult.files || []
  if (files.length >= MAX_BACKUPS) {
    files.sort((a, b) => {
      const da = a.modified ? new Date(a.modified).getTime() : 0
      const db = b.modified ? new Date(b.modified).getTime() : 0
      return da - db
    })
    const toDelete = files.slice(0, files.length - MAX_BACKUPS + 1)
    for (const f of toDelete) {
      await deleteFromWebDAV(config, f.name)
    }
  }

  return await uploadToWebDAV(config, filename, data)
}

async function uploadToWebDAV(config: WebDAVConfig, filename: string, data: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const remotePath = (config.path ? config.path.replace(/\/+$/, "") + "/" : "") + filename
    const url = buildUrl(config.url, remotePath)
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: basicAuth(config.username, config.password),
        "Content-Type": "application/json",
      },
      body: data,
    })
    if (!res.ok) {
      return { ok: false, error: `涓婁紶澶辫触 (${res.status})` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "涓婁紶澶辫触" }
  }
}

export async function downloadLatestBackup(config: WebDAVConfig): Promise<{ ok: boolean; data?: string; error?: string }> {
  const listResult = await listBackupFiles(config)
  if (!listResult.ok) {
    return { ok: false, error: listResult.error }
  }
  const files = listResult.files || []
  if (files.length === 0) {
    return { ok: false, error: "远程没有备份文件" }
  }
  files.sort((a, b) => {
    const da = a.modified ? new Date(a.modified).getTime() : 0
    const db = b.modified ? new Date(b.modified).getTime() : 0
    return db - da
  })
  return await downloadFromWebDAV(config, files[0].name)
}

async function downloadFromWebDAV(config: WebDAVConfig, filename: string): Promise<{ ok: boolean; data?: string; error?: string }> {
  try {
    const remotePath = (config.path ? config.path.replace(/\/+$/, "") + "/" : "") + filename
    const url = buildUrl(config.url, remotePath)
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: basicAuth(config.username, config.password),
      },
    })
    if (res.status === 404) {
      return { ok: false, error: "远程文件不存在" }
    }
    if (!res.ok) {
      return { ok: false, error: `涓嬭浇澶辫触 (${res.status})` }
    }
    const text = await res.text()
    return { ok: true, data: text }
  } catch (err: any) {
    return { ok: false, error: err.message || "涓嬭浇澶辫触" }
  }
}

export async function exportSupabaseData(userId: string): Promise<string> {
  const supabase = createClient()
  const tables = ["transactions", "accounts", "categories", "budgets", "bills", "user_settings"] as const
  const data: Record<string, any> = {}
  for (const table of tables) {
    const query = supabase.from(table).select("*")
    query.eq("user_id", userId)
    const { data: rows } = await query
    data[table] = rows ?? []
  }
  data["_exported_at"] = new Date().toISOString()
  data["_user_id"] = userId
  return JSON.stringify(data, null, 2)
}

export async function importSupabaseData(userId: string, jsonStr: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonStr)
    const supabase = createClient()
    const tables = ["transactions", "accounts", "categories", "budgets", "bills"] as const

    for (const table of tables) {
      const rows = data[table]
      if (!Array.isArray(rows) || rows.length === 0) continue

      const ownRows = rows.filter((r: any) => !r.user_id || r.user_id === userId)
      if (ownRows.length === 0) continue

      await supabase.from(table).delete().eq("user_id", userId)
      const { error } = await supabase.from(table).insert(ownRows)
      if (error) {
        return { ok: false, error: `${table} 恢复失败: ${error.message}` }
      }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: "数据解析失败：" + err.message }
  }
}
