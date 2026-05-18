"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { storeSessionKey } from "@/lib/crypto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Receipt } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async () => {
    const allow = process.env.NEXT_PUBLIC_ALLOW_REGISTRATION !== "false"
    if (!allow) {
      setError("管理员已关闭注册")
      return
    }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setError("注册成功！")
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    storeSessionKey(password)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">欢迎使用账小记</CardTitle>
          <CardDescription>登录开始记账</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" placeholder="输入邮箱" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" placeholder="输入密码" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && (
              <p className={`text-sm ${error.includes("成功") ? "text-emerald-500" : "text-destructive"}`}>{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "处理中..." : "登录"}
            </Button>
            {process.env.NEXT_PUBLIC_ALLOW_REGISTRATION !== "false" && (
              <Button type="button" variant="outline" className="w-full" onClick={handleSignUp} disabled={loading}>
                注册新账号
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
