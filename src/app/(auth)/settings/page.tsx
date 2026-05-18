"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

import { toast } from "sonner"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Download, Sparkles, User, Shield, PlugIcon, Wallet, Tags, PiggyBank, Bell, KeyRound, Cloud, Upload, CheckCircle, AlertTriangle } from "lucide-react"
import { encryptUserSecret, decryptUserSecret, storeSessionKey } from "@/lib/crypto"
import { getWebDAVConfig, saveWebDAVConfig, testWebDAVConnection, uploadWithRotation, downloadLatestBackup, exportSupabaseData, importSupabaseData } from "@/lib/webdav"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [aiProvider, setAiProvider] = useState("openai")
  const [aiModel, setAiModel] = useState("gpt-4o-mini")
  const [aiApiKey, setAiApiKey] = useState("")
  const [aiBaseUrl, setAiBaseUrl] = useState("")
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [currency, setCurrency] = useState("CNY")
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwLoading, setPwLoading] = useState(false)

  const [webdavUrl, setWebdavUrl] = useState("")
  const [webdavUsername, setWebdavUsername] = useState("")
  const [webdavPassword, setWebdavPassword] = useState("")
  const [webdavPath, setWebdavPath] = useState("")
  const [webdavTesting, setWebdavTesting] = useState(false)
  const [webdavSyncing, setWebdavSyncing] = useState(false)
  const [webdavRestoring, setWebdavRestoring] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [autoSync, setAutoSync] = useState(false)
  const webdavIsHttp = webdavUrl.startsWith("http://")

  useEffect(() => {
    if (!user) return
    supabase.from("user_settings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).then(async ({ data }: any) => {
      if (data && data.length > 0) {
        const record = data[0]
        setSettingsId(record.id)
        setAiProvider(record.ai_provider || "openai")
        setAiModel(record.ai_model || "gpt-4o-mini")
        setAiApiKey(record.ai_api_key ? (await decryptUserSecret(user.id, record.ai_api_key)) || record.ai_api_key : "")
        setAiBaseUrl(record.ai_base_url || "")
        setCurrency(record.currency || "CNY")
      }
    })

    const wc = getWebDAVConfig()
    if (wc) {
      setWebdavUrl(wc.url)
      setWebdavUsername(wc.username)
      if (wc.password && user) {
        decryptUserSecret(user.id, wc.password).then(decrypted => {
          if (decrypted) setWebdavPassword(decrypted)
        })
      }
      setWebdavPath(wc.path)
    }
    setLastSync(localStorage.getItem("expense_tracker__last_sync"))
    setAutoSync(localStorage.getItem("expense_tracker__auto_sync") === "true")
  }, [user])

  useEffect(() => {
    localStorage.setItem("expense_tracker__auto_sync", String(autoSync))
    if (!autoSync) return
    if (!webdavUrl || !webdavUsername || !webdavPassword) return

    const doSync = async () => {
      const config = { url: webdavUrl, username: webdavUsername, password: webdavPassword, path: webdavPath }
      const data = await exportSupabaseData(user!.id)
      const result = await uploadWithRotation(config, data)
      if (result.ok) {
        const nowStr = new Date().toISOString()
        localStorage.setItem("expense_tracker__last_sync", nowStr)
        setLastSync(nowStr)
      }
    }
    doSync()
    const interval = setInterval(doSync, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoSync, webdavUrl, webdavUsername, webdavPassword, webdavPath, user])

  const handleSaveAi = async () => {
    setLoading(true)
    const encryptedKey = aiApiKey ? await encryptUserSecret(user!.id, aiApiKey) : ""
    const payload: Record<string, any> = {
      user_id: user!.id,
      ai_provider: aiProvider,
      ai_model: aiModel,
      ai_api_key: encryptedKey,
      ai_base_url: aiBaseUrl,
      currency,
    }
    if (settingsId) payload.id = settingsId
    const { data, error } = await supabase.from("user_settings").upsert(payload).select().single()
    if (!error && data) {
      setSettingsId(data.id)
      await supabase.from("user_settings").delete().neq("id", data.id).eq("user_id", user!.id)
      toast.success("保存成功")
    } else {
      toast.error("保存失败")
    }
    setLoading(false)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiConfig: {
            apiKey: aiApiKey,
            provider: aiProvider,
            model: aiModel,
            baseUrl: aiBaseUrl,
          },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success("连接成功！" + (data.message ? ` AI 回复：${data.message}` : ""))
      } else {
        toast.error("连接失败：" + data.error)
      }
    } catch (err: any) {
      toast.error("请求失败：" + err.message)
    }
    setTesting(false)
  }

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      toast.error("请填写完整")
      return
    }
    if (pwNew.length < 6) {
      toast.error("新密码至少 6 位")
      return
    }
    if (pwNew !== pwConfirm) {
      toast.error("两次密码不一致")
      return
    }
    setPwLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: pwCurrent,
    })
    if (signInError) {
      toast.error("当前密码错误")
      setPwLoading(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    if (error) {
      toast.error(error.message)
    } else {
      storeSessionKey(pwNew)
      toast.success("密码已修改")
      setPwCurrent("")
      setPwNew("")
      setPwConfirm("")
    }
    setPwLoading(false)
  }

  const handleSaveWebDAV = async () => {
    const encryptedPw = webdavPassword ? await encryptUserSecret(user!.id, webdavPassword) : ""
    saveWebDAVConfig({ url: webdavUrl, username: webdavUsername, password: encryptedPw, path: webdavPath })
    toast.success("WebDAV 配置已保存")
  }

  function isInsecureHttp(url: string): boolean {
    return url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")
  }

  const handleTestWebDAV = async () => {
    if (isInsecureHttp(webdavUrl)) {
      toast.error("WebDAV 地址请使用 HTTPS 加密连接")
      return
    }
    setWebdavTesting(true)
    const result = await testWebDAVConnection({ url: webdavUrl, username: webdavUsername, password: webdavPassword, path: webdavPath })
    if (result.ok) {
      toast.success("WebDAV 连接成功")
    } else {
      toast.error("连接失败：" + (result.error || "未知错误"))
    }
    setWebdavTesting(false)
  }

  const handleSyncUpload = async () => {
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      toast.error("请先填写 WebDAV 配置")
      return
    }
    if (isInsecureHttp(webdavUrl)) {
      toast.error("WebDAV 地址请使用 HTTPS 加密连接")
      return
    }
    setWebdavSyncing(true)
    const config = { url: webdavUrl, username: webdavUsername, password: webdavPassword, path: webdavPath }
    const data = await exportSupabaseData(user!.id)
    const result = await uploadWithRotation(config, data)
    if (result.ok) {
      const nowStr = new Date().toISOString()
      localStorage.setItem("expense_tracker__last_sync", nowStr)
      setLastSync(nowStr)
      toast.success("数据已同步到 WebDAV")
    } else {
      toast.error("同步失败：" + (result.error || "未知错误"))
    }
    setWebdavSyncing(false)
  }

  const handleSyncDownload = async () => {
    if (!webdavUrl || !webdavUsername || !webdavPassword) {
      toast.error("请先填写 WebDAV 配置")
      return
    }
    if (isInsecureHttp(webdavUrl)) {
      toast.error("WebDAV 地址请使用 HTTPS 加密连接")
      return
    }
    setWebdavRestoring(true)
    const config = { url: webdavUrl, username: webdavUsername, password: webdavPassword, path: webdavPath }
    const result = await downloadLatestBackup(config)
    if (result.ok && result.data) {
      const importResult = await importSupabaseData(user!.id, result.data)
      if (importResult.ok) {
        toast.success("数据已从 WebDAV 恢复")
      } else {
        toast.error(importResult.error || "数据恢复失败")
      }
    } else {
      toast.error("下载失败：" + (result.error || "未知错误"))
    }
    setWebdavRestoring(false)
  }

  const handleExport = async () => {
    if (!user) return
    const { data: txData } = await supabase
      .from("transactions")
      .select("*, categories(name), accounts(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (!txData || txData.length === 0) {
      toast.error("暂无数据可导出")
      return
    }

    const headers = "日期,类型,分类,账户,金额,备注\n"
    const rows = (txData as any[]).map((t: any) =>
      `${t.date},${t.type === "income" ? "收入" : "支出"},${t.categories?.name ?? ""},${t.accounts?.name ?? ""},${t.amount},"${t.description ?? ""}"`
    ).join("\n")
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `账小记_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("导出成功")
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">设置</h1>

      <Card>
        <CardContent className="p-2">
          {[
            { href: "/accounts", label: "账户", icon: Wallet, desc: "管理资金账户" },
            { href: "/categories", label: "分类", icon: Tags, desc: "管理收支分类" },
            { href: "/budgets", label: "预算", icon: PiggyBank, desc: "设定消费预算" },
            { href: "/bills", label: "提醒", icon: Bell, desc: "管理账单提醒" },
          ].map((item, i) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors ${i > 0 ? "" : ""}`}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">账户信息</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">邮箱</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">用户 ID</span>
            <span className="font-mono text-xs">{user?.id?.slice(0, 12)}...</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">外观</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
              <Sun className="w-4 h-4 mr-1" /> 浅色
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
              <Moon className="w-4 h-4 mr-1" /> 深色
            </Button>
            <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>
              <Monitor className="w-4 h-4 mr-1" /> 跟随系统
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">AI 配置</CardTitle>
            <CardDescription className="ml-2">AI 记账功能需要配置 API Key</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI 提供商</Label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="custom">自定义(中转站)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>API 中转地址 (Base URL)</Label>
            <Input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)}
              placeholder={aiProvider === "deepseek" ? "https://api.deepseek.com" : aiProvider === "openai" ? "https://api.openai.com" : "https://your-proxy.com/v1"} />
            <p className="text-xs text-muted-foreground">留空使用官方地址，填入中转站地址即可通过中转站调用</p>
          </div>
          <div className="space-y-2">
            <Label>模型</Label>
            <Input value={aiModel} onChange={e => setAiModel(e.target.value)}
              placeholder={aiProvider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini"} />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)}
              placeholder="sk-..." />
            <p className="text-xs text-muted-foreground">API Key 加密存储，仅用于 AI 记账请求</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSaveAi} disabled={loading}>{loading ? "保存中..." : "保存 AI 配置"}</Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !aiApiKey}>
              {testing ? "测试中..." : <><PlugIcon className="w-4 h-4 mr-1" />测试连接</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">数据管理</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> 导出 CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">WebDAV 同步</CardTitle>
            <CardDescription className="ml-2">通过 WebDAV 备份和恢复数据</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>WebDAV 地址</Label>
            <Input value={webdavUrl} onChange={e => setWebdavUrl(e.target.value)}
              placeholder="https://example.com/remote.php/dav/files/username" />
            {webdavIsHttp && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />当前使用 HTTP，密码将以明文传输，建议改用 HTTPS
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={webdavUsername} onChange={e => setWebdavUsername(e.target.value)}
                placeholder="username" />
            </div>
            <div className="space-y-2">
              <Label>密码</Label>
              <Input type="password" value={webdavPassword} onChange={e => setWebdavPassword(e.target.value)}
                placeholder="password" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>远程路径 (可选)</Label>
            <Input value={webdavPath} onChange={e => setWebdavPath(e.target.value)}
              placeholder="apps/账小记" />
            <p className="text-xs text-muted-foreground">文件将保存到此路径下，留空使用根目录</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveWebDAV}>保存配置</Button>
            <Button variant="outline" size="sm" onClick={handleTestWebDAV} disabled={webdavTesting || !webdavUrl}>
              {webdavTesting ? "测试中..." : <><PlugIcon className="w-4 h-4 mr-1" />测试连接</>}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">自动同步</Label>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} disabled={!webdavUrl || !webdavUsername || !webdavPassword} />
          </div>
          <p className="text-xs text-muted-foreground -mt-2">开启后每 30 分钟自动备份数据到 WebDAV</p>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSyncUpload} disabled={webdavSyncing || !webdavUrl}>
              {webdavSyncing ? <>同步中...</> : <><Upload className="w-4 h-4 mr-1" />上传同步</>}
            </Button>
            <Button variant="secondary" onClick={handleSyncDownload} disabled={webdavRestoring || !webdavUrl}>
              {webdavRestoring ? <>恢复中...</> : <><Download className="w-4 h-4 mr-1" />下载恢复</>}
            </Button>
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              上次同步：{new Date(lastSync).toLocaleString("zh-CN")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">修改密码</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前密码</Label>
            <Input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="输入当前密码" />
          </div>
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="至少 6 位" />
          </div>
          <div className="space-y-2">
            <Label>确认新密码</Label>
            <Input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="再次输入新密码" />
          </div>
          <Button onClick={handleChangePassword} disabled={pwLoading}>
            {pwLoading ? "修改中..." : "修改密码"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base text-destructive">危险操作</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>退出登录</Button>
        </CardContent>
      </Card>
    </div>
  )
}
