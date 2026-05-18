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
import { Sun, Moon, Monitor, Download, Sparkles, User, Shield, PlugIcon, Wallet, Tags, PiggyBank, Bell, KeyRound } from "lucide-react"
import { encryptUserSecret, decryptUserSecret, storeSessionKey } from "@/lib/crypto"

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
  }, [user])

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
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { href: "/accounts", label: "账户", icon: Wallet, desc: "管理资金账户" },
            { href: "/categories", label: "分类", icon: Tags, desc: "管理收支分类" },
            { href: "/budgets", label: "预算", icon: PiggyBank, desc: "设定消费预算" },
            { href: "/bills", label: "提醒", icon: Bell, desc: "管理账单提醒" },
          ].map(item => (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.desc}</span>
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
