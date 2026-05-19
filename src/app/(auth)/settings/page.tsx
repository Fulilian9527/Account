"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

import { toast } from "sonner"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Download, Sparkles, User, Shield, PlugIcon, Wallet, Tags, PiggyBank, Bell, KeyRound, Cloud, Upload, CheckCircle, AlertTriangle } from "lucide-react"
import { encryptUserSecret, decryptUserSecret, storeSessionKey } from "@/lib/crypto"
import { testWebDAVConnection, uploadWithRotation, downloadLatestBackup, exportSupabaseData, importSupabaseData } from "@/lib/webdav"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
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
  const [syncInterval, setSyncInterval] = useState(30)
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
        setWebdavUrl(record.webdav_url || "")
        setWebdavUsername(record.webdav_username || "")
        if (record.webdav_password) {
          const decrypted = await decryptUserSecret(user.id, record.webdav_password)
          if (decrypted) setWebdavPassword(decrypted)
        }
        setWebdavPath(record.webdav_path || "")
      }
    })

    setLastSync(localStorage.getItem("expense_tracker__last_sync"))
    setAutoSync(localStorage.getItem("expense_tracker__auto_sync") === "true")
    const savedInterval = localStorage.getItem("expense_tracker__sync_interval")
    if (savedInterval) setSyncInterval(parseInt(savedInterval, 10) || 30)
  }, [user])

  useEffect(() => {
    localStorage.setItem("expense_tracker__auto_sync", String(autoSync))
    localStorage.setItem("expense_tracker__sync_interval", String(syncInterval))
    if (!autoSync) return
    if (!webdavUrl || !webdavUsername || !webdavPassword) return
    if (isInsecureHttp(webdavUrl)) return

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
    const interval = setInterval(doSync, syncInterval * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoSync, syncInterval, webdavUrl, webdavUsername, webdavPassword, webdavPath, user])

  const handleSaveAi = async () => {
    setLoading(true)
    let encryptedKey = ""
    if (aiApiKey) {
      try {
        encryptedKey = await encryptUserSecret(user!.id, aiApiKey)
      } catch (err: any) {
        toast.error(err.message)
        setLoading(false)
        return
      }
    }
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
        toast.success("连接成功" + (data.message ? " AI 回复：" + data.message : ""))
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
      toast.error("请填写完整信息")
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
      // Read and decrypt with old key before switching
      let decryptedAiKey = ""
      let decryptedWebdavPw = ""
      try {
        const { data: settings } = await supabase.from("user_settings").select("id, ai_api_key, webdav_password").eq("user_id", user!.id).limit(1).single()
        if (settings) {
          if (settings.ai_api_key) {
            const d = await decryptUserSecret(user!.id, settings.ai_api_key)
            if (d) decryptedAiKey = d
          }
          if (settings.webdav_password) {
            const d = await decryptUserSecret(user!.id, settings.webdav_password)
            if (d) decryptedWebdavPw = d
          }
        }
      } catch {}

      storeSessionKey(pwNew)

      // Re-encrypt with new key and update
      try {
        const { data: settings } = await supabase.from("user_settings").select("id").eq("user_id", user!.id).limit(1).single()
        if (settings) {
          const updatePayload: Record<string, string> = {}
          if (decryptedAiKey) updatePayload.ai_api_key = await encryptUserSecret(user!.id, decryptedAiKey)
          if (decryptedWebdavPw) updatePayload.webdav_password = await encryptUserSecret(user!.id, decryptedWebdavPw)
          if (Object.keys(updatePayload).length > 0) {
            await supabase.from("user_settings").update(updatePayload).eq("id", settings.id)
          }
        }
      } catch {}
      toast.success("密码已修改")
      setPwCurrent("")
      setPwNew("")
      setPwConfirm("")
    }
    setPwLoading(false)
  }

  const handleSaveWebDAV = async () => {
    let encryptedPw = ""
    if (webdavPassword) {
      try {
        encryptedPw = await encryptUserSecret(user!.id, webdavPassword)
      } catch (err: any) {
        toast.error(err.message)
        return
      }
    }
    const payload: Record<string, any> = {
      user_id: user!.id,
      webdav_url: webdavUrl,
      webdav_username: webdavUsername,
      webdav_password: encryptedPw,
      webdav_path: webdavPath,
    }
    if (settingsId) payload.id = settingsId
    const { data, error } = await supabase.from("user_settings").upsert(payload).select().single()
    if (!error && data) {
      setSettingsId(data.id)
      await supabase.from("user_settings").delete().neq("id", data.id).eq("user_id", user!.id)
      toast.success("WebDAV 配置已保存")
    } else {
      toast.error("保存失败")
    }
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto safe-area-top">
      <h1 className="text-2xl font-bold tracking-tight">设置</h1>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { href: "/accounts", label: "账户", icon: Wallet, desc: "管理资金账户" },
          { href: "/categories", label: "分类", icon: Tags, desc: "管理收支分类" },
          { href: "/budgets", label: "预算", icon: PiggyBank, desc: "设定消费预算" },
          { href: "/bills", label: "提醒", icon: Bell, desc: "管理账单提醒" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Settings Sections */}
      <Card>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="account">
            <AccordionTrigger className="hover:no-underline py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-semibold">账户信息</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-3 pt-1 pb-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">邮箱</span>
                  <span className="truncate ml-4">{user?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">用户 ID</span>
                  <span className="font-mono text-xs truncate ml-4">{user?.id?.slice(0, 16)}...</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="appearance">
            <AccordionTrigger className="hover:no-underline py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-sm font-semibold">外观</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="flex gap-2 pt-1 pb-2">
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
                  <Sun className="w-4 h-4 mr-1.5" /> 浅色
                </Button>
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
                  <Moon className="w-4 h-4 mr-1.5" /> 深色
                </Button>
                <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")}>
                  <Monitor className="w-4 h-4 mr-1.5" /> 跟随系统
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai">
            <AccordionTrigger className="hover:no-underline py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-sm font-semibold">AI 配置</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-4 pt-1 pb-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>AI 提供商</Label>
                    <Select value={aiProvider} onValueChange={setAiProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>模型</Label>
                    <Input value={aiModel} onChange={e => setAiModel(e.target.value)} placeholder="gpt-4o-mini" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="sk-..." />
                </div>
                {aiProvider === "custom" && (
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleSaveAi} disabled={loading}>
                    {loading ? "保存中..." : "保存配置"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleTestAi} disabled={testing || !aiApiKey}>
                    {testing ? "测试中..." : <><Sparkles className="w-4 h-4 mr-1" />测试连接</>}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="webdav">
            <AccordionTrigger className="hover:no-underline py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm font-semibold">WebDAV 同步</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-4 pt-1 pb-2">
                {webdavIsHttp && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md p-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>HTTP 连接不安全，建议使用 HTTPS</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>服务器地址</Label>
                    <Input value={webdavUrl} onChange={e => setWebdavUrl(e.target.value)}
                      placeholder="https://dav.example.com" />
                  </div>
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
                  <div className="space-y-2">
                    <Label>远程路径 (可选)</Label>
                    <Input value={webdavPath} onChange={e => setWebdavPath(e.target.value)}
                      placeholder="apps/账小记" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">文件将保存到此路径下，留空使用根目录</p>
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
                <div className="flex items-center gap-2 -mt-2">
                  <Input type="number" min={5} max={1440} value={syncInterval} onChange={e => setSyncInterval(parseInt(e.target.value, 10) || 30)} disabled={!autoSync} className="w-20 h-8 text-sm" />
                  <span className="text-xs text-muted-foreground">分钟同步一次</span>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleSyncUpload} disabled={webdavSyncing || !webdavUrl}>
                    {webdavSyncing ? <>同步中...</> : <><Upload className="w-4 h-4 mr-1" />上传同步</>}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleSyncDownload} disabled={webdavRestoring || !webdavUrl}>
                    {webdavRestoring ? <>恢复中...</> : <><Download className="w-4 h-4 mr-1" />下载恢复</>}
                  </Button>
                </div>
                {lastSync && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    上次同步：{new Date(lastSync).toLocaleString("zh-CN")}
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="password">
            <AccordionTrigger className="hover:no-underline py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-sm font-semibold">修改密码</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <div className="space-y-4 pt-1 pb-2 max-w-sm">
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
                <Button size="sm" onClick={handleChangePassword} disabled={pwLoading}>
                  {pwLoading ? "修改中..." : "修改密码"}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="danger">
            <AccordionTrigger className="hover:no-underline py-4 px-4 text-destructive">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-destructive/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm font-semibold">危险操作</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <Button variant="destructive" size="sm" onClick={signOut}>退出登录</Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  )
}
