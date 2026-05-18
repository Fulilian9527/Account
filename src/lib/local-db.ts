"use client"

import { hashPassword, verifyPassword, storeSessionKey, clearSessionKey } from "./crypto"

const DB_PREFIX = "expense_tracker_"

function dbKey(table: string) {
  return DB_PREFIX + table
}

function readTable<T = any>(table: string): T[] {
  try {
    const raw = localStorage.getItem(dbKey(table))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeTable(table: string, data: any[]) {
  localStorage.setItem(dbKey(table), JSON.stringify(data))
}

function genId(): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function now(): string {
  return new Date().toISOString()
}

function matchFilter(item: any, field: string, op: string, value: any): boolean {
  const actual = item[field]
  switch (op) {
    case "eq": return actual === value
    case "neq": return actual !== value
    case "gt": return actual > value
    case "gte": return actual >= value
    case "lt": return actual < value
    case "lte": return actual <= value
    case "in": return Array.isArray(value) && value.includes(actual)
    default: return true
  }
}

function parseJoinColumns(columns: string): { table: string; cols: string[] }[] {
  const joins: { table: string; cols: string[] }[] = []
  const re = /(\w+)\(([^)]+)\)/g
  let match
  while ((match = re.exec(columns)) !== null) {
    const cols = match[2].split(",").map(c => c.trim()).filter(Boolean)
    joins.push({ table: match[1], cols })
  }
  return joins
}

function resolveJoin(data: any[], joinTable: string, joinCols: string[], fkField: string) {
  const refs = readTable(joinTable)
  return data.map(item => {
    const refId = item[fkField]
    const ref = refs.find((r: any) => r.id === refId)
    if (ref && joinCols.length > 0) {
      const joined: any = {}
      for (const col of joinCols) {
        joined[col] = ref[col]
      }
      item[joinTable] = joined
    } else if (ref) {
      item[joinTable] = ref
    }
    return item
  })
}

class LocalQueryBuilder {
  private table: string
  private filters: { field: string; value: any; op: string }[] = []
  private orderFields: { field: string; asc: boolean }[] = []
  private limitCount = 0
  private isSingleMode = false
  private joinInfo: { table: string; cols: string[]; fkField: string }[] = []
  private selectedColumns: string | null = null
  private insertData: any | any[] | null = null
  private updateData: Record<string, any> | null = null
  private upsertData: any | null = null
  private doDelete = false

  constructor(table: string) {
    this.table = table
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value, op: "eq" })
    return this
  }

  neq(field: string, value: any) {
    this.filters.push({ field, value, op: "neq" })
    return this
  }

  gte(field: string, value: any) {
    this.filters.push({ field, value, op: "gte" })
    return this
  }

  lte(field: string, value: any) {
    this.filters.push({ field, value, op: "lte" })
    return this
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderFields.push({ field, asc: opts?.ascending ?? true })
    return this
  }

  limit(n: number) {
    this.limitCount = n
    return this
  }

  single() {
    this.isSingleMode = true
    return this
  }

  select(columns = "*") {
    this.selectedColumns = columns
    return this
  }

  insert(values: any | any[]) {
    this.insertData = values
    return this
  }

  update(values: Record<string, any>) {
    this.updateData = values
    return this
  }

  upsert(values: any) {
    this.upsertData = values
    return this
  }

  delete() {
    this.doDelete = true
    return this
  }

  private executeSelect() {
    this.joinInfo = []
    const columns = this.selectedColumns || "*"
    if (columns !== "*") {
      const joins = parseJoinColumns(columns)
      this.joinInfo = joins.map(j => ({
        table: j.table,
        cols: j.cols,
        fkField: j.table === "categories" ? "category_id"
          : j.table === "accounts" ? "account_id"
          : j.table.slice(0, -1) + "_id",
      }))
    }

    let data = readTable(this.table)

    for (const f of this.filters) {
      data = data.filter(item => matchFilter(item, f.field, f.op, f.value))
    }

    for (const ji of this.joinInfo) {
      data = resolveJoin(data, ji.table, ji.cols, ji.fkField)
    }

    if (this.orderFields.length > 0) {
      data.sort((a: any, b: any) => {
        for (const { field, asc } of this.orderFields) {
          const va = a[field]
          const vb = b[field]
          if (va == null && vb == null) continue
          if (va == null) return 1
          if (vb == null) return -1
          let cmp: number
          if (typeof va === "string" && typeof vb === "string") {
            cmp = asc ? va.localeCompare(vb) : vb.localeCompare(va)
          } else {
            cmp = asc ? va - vb : vb - va
          }
          if (cmp !== 0) return cmp
        }
        return 0
      })
    }

    if (this.limitCount > 0) {
      data = data.slice(0, this.limitCount)
    }

    if (this.isSingleMode) {
      return { data: data[0] ?? null, error: data.length === 0 ? { message: "not found" } : null }
    }

    return { data, error: null }
  }

  private executeInsert() {
    const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData]
    const table = readTable(this.table)
    const created: any[] = []
    for (const item of items) {
      const record = { id: genId(), created_at: now(), ...item }
      table.push(record)
      created.push(record)
    }
    writeTable(this.table, table)
    return { data: items.length === 1 ? created[0] : created, error: null }
  }

  private executeUpdate() {
    const table = readTable(this.table)
    for (const item of table) {
      let match = true
      for (const f of this.filters) {
        if (!matchFilter(item, f.field, f.op, f.value)) {
          match = false
          break
        }
      }
      if (match) {
        Object.assign(item, this.updateData, { updated_at: now() })
      }
    }
    writeTable(this.table, table)
    return { data: null, error: null }
  }

  private executeUpsert() {
    const table = readTable(this.table)
    if (!this.upsertData.id) {
      this.insertData = this.upsertData
      return this.executeInsert()
    }
    const idx = table.findIndex((item: any) => {
      for (const f of this.filters) {
        if (!matchFilter(item, f.field, f.op, f.value)) return false
      }
      return item.id === this.upsertData.id
    })
    if (idx >= 0) {
      Object.assign(table[idx], this.upsertData, { updated_at: now() })
      writeTable(this.table, table)
      return { data: table[idx], error: null }
    }
    return this.executeInsert()
  }

  private executeDelete() {
    let table = readTable(this.table)
    let filtered: any[] = []
    for (const item of table) {
      let match = true
      for (const f of this.filters) {
        if (!matchFilter(item, f.field, f.op, f.value)) {
          match = false
          break
        }
      }
      if (!match) {
        filtered.push(item)
      }
    }
    writeTable(this.table, filtered)
    return { data: null, error: null }
  }

  private execute() {
    if (this.doDelete) return this.executeDelete()
    if (this.upsertData) return this.executeUpsert()
    if (this.updateData) return this.executeUpdate()
    if (this.insertData) return this.executeInsert()
    return this.executeSelect()
  }

  then(resolve: any, reject: any) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }

  catch(reject: any) {
    return Promise.resolve(this.execute()).catch(reject)
  }

  finally(cb: () => void) {
    return Promise.resolve(this.execute()).finally(cb)
  }
}

type LocalResult = {
  data: any[] | null
  error: { message: string } | null
}

export class LocalClient {
  from(table: string): LocalQueryBuilder {
    return new LocalQueryBuilder(table)
  }

  get auth() {
    return {
      getSession: async () => {
        const raw = localStorage.getItem(dbKey("_session"))
        if (raw) {
          try { return { data: { session: JSON.parse(raw) }, error: null } } catch {}
        }
        return { data: { session: null }, error: null }
      },
      getUser: async () => {
        const raw = localStorage.getItem(dbKey("_session"))
        if (raw) {
          try {
            const session = JSON.parse(raw)
            return { data: { user: session.user }, error: null }
          } catch {}
        }
        return { data: { user: null }, error: null }
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const users = readTable<{ id: string; email: string; password_hash: string; salt: string; created_at: string }>("_users")
        const user = users.find(u => u.email === email)
        if (!user) {
          return { data: { user: null, session: null }, error: { message: "邮箱或密码错误" } }
        }
        const valid = await verifyPassword(password, user.password_hash, user.salt)
        if (!valid) {
          return { data: { user: null, session: null }, error: { message: "邮箱或密码错误" } }
        }
        const session = {
          access_token: "local_" + genId(),
          refresh_token: "local_" + genId(),
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: "bearer",
          user: {
            id: user.id,
            email: user.email,
            user_metadata: { name: user.email?.split("@")[0] },
          },
        }
        localStorage.setItem(dbKey("_session"), JSON.stringify(session))
        window.dispatchEvent(new Event("local-signin"))
        storeSessionKey(password)
        return { data: { user: session.user, session }, error: null }
      },
      signUp: async ({ email, password }: { email: string; password: string }) => {
        const users = readTable<{ id: string; email: string; password_hash: string; salt: string; created_at: string }>("_users")
        if (users.find(u => u.email === email)) {
          return { data: { user: null, session: null }, error: { message: "该邮箱已注册" } }
        }
        const { hash, salt } = await hashPassword(password)
        const newUser = { id: genId(), email, password_hash: hash, salt, created_at: now() }
        users.push(newUser)
        writeTable("_users", users)

        const session = {
          access_token: "local_" + genId(),
          refresh_token: "local_" + genId(),
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: "bearer",
          user: {
            id: newUser.id,
            email: newUser.email,
            user_metadata: { name: newUser.email?.split("@")[0] },
          },
        }
        localStorage.setItem(dbKey("_session"), JSON.stringify(session))
        window.dispatchEvent(new Event("local-signin"))
        storeSessionKey(password)
        return { data: { user: session.user, session }, error: null }
      },
      signOut: async () => {
        localStorage.removeItem(dbKey("_session"))
        clearSessionKey()
        window.dispatchEvent(new Event("local-signout"))
        return { error: null }
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        const sessionKey = dbKey("_session")
        const handler = (e: StorageEvent) => {
          if (e.key === sessionKey) {
            if (e.newValue) {
              try { callback("SIGNED_IN", JSON.parse(e.newValue)) } catch {}
            } else {
              callback("SIGNED_OUT", null)
            }
          }
        }
        const signInHandler = () => {
          const raw = localStorage.getItem(sessionKey)
          if (raw) {
            try { callback("SIGNED_IN", JSON.parse(raw)) } catch {}
          }
        }
        const signOutHandler = () => {
          callback("SIGNED_OUT", null)
        }
        window.addEventListener("storage", handler)
        window.addEventListener("local-signin", signInHandler)
        window.addEventListener("local-signout", signOutHandler)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                window.removeEventListener("storage", handler)
                window.removeEventListener("local-signin", signInHandler)
                window.removeEventListener("local-signout", signOutHandler)
              },
            },
          },
        }
      },
    }
  }

  get channel() {
    return {
      on: () => this.channel,
      subscribe: () => ({ unsubscribe: () => {} }),
    }
  }
}

export function isSupabaseConfigured(): boolean {
  if (typeof window === "undefined") return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!url && !url.includes("placeholder") && !url.includes("example.supabase")
}

export function seedDemoData(userId: string) {
  const cats = readTable("categories")
  if (cats.length === 0) {
    const defaultExpense = [
      { name: "餐饮", icon: "🍔", color: "#ef4444", type: "expense", sort_order: 0 },
      { name: "购物", icon: "🛒", color: "#f97316", type: "expense", sort_order: 1 },
      { name: "交通", icon: "🚗", color: "#eab308", type: "expense", sort_order: 2 },
      { name: "居住", icon: "🏠", color: "#06b6d4", type: "expense", sort_order: 3 },
      { name: "娱乐", icon: "🎮", color: "#8b5cf6", type: "expense", sort_order: 4 },
      { name: "服饰", icon: "👕", color: "#ec4899", type: "expense", sort_order: 5 },
      { name: "数码", icon: "📱", color: "#3b82f6", type: "expense", sort_order: 6 },
      { name: "医疗", icon: "💊", color: "#22c55e", type: "expense", sort_order: 7 },
    ]
    const defaultIncome = [
      { name: "工资", icon: "💰", color: "#22c55e", type: "income", sort_order: 0 },
      { name: "兼职", icon: "💼", color: "#06b6d4", type: "income", sort_order: 1 },
      { name: "投资", icon: "📈", color: "#8b5cf6", type: "income", sort_order: 2 },
      { name: "红包", icon: "🧧", color: "#ef4444", type: "income", sort_order: 3 },
    ]

    const now_ = now()
    const allCats = [...defaultExpense, ...defaultIncome].map(c => ({
      id: genId(),
      user_id: userId,
      created_at: now_,
      ...c,
    }))
    writeTable("categories", allCats)
  }

  const accs = readTable("accounts")
  if (accs.length === 0) {
    const now_ = now()
    const defaults = [
      { name: "中国银行", type: "银行", icon: "中国银行", balance: 0 },
      { name: "农业银行", type: "银行", icon: "农业银行", balance: 0 },
      { name: "建设银行", type: "银行", icon: "建设银行", balance: 0 },
      { name: "工商银行", type: "银行", icon: "工商银行", balance: 0 },
      { name: "微信", type: "移动支付", icon: "微信", balance: 0 },
      { name: "支付宝", type: "移动支付", icon: "支付宝", balance: 0 },
      { name: "现金", type: "现金", icon: "现金", balance: 0 },
      { name: "信用卡", type: "信用卡", icon: "信用卡", balance: 0 },
    ]
    writeTable("accounts", defaults.map(d => ({ id: genId(), user_id: userId, created_at: now_, ...d })))
  }
}
