"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { storeSessionKey } from "@/lib/crypto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Receipt } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
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

  const handleResetPassword = async () => {
    if (!resetEmail) return
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setResetLoading(false)
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Dialog open={resetOpen} onOpenChange={v => { setResetOpen(v); if (!v) { setResetSent(false); setResetEmail("") } }}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors">忘记密码?</button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>重置密码</DialogTitle></DialogHeader>
                    {resetSent ? (
                      <div className="py-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <p className="text-sm">重置密码邮件已发送</p>
                        <p className="text-xs text-muted-foreground">请检查您的邮箱并点击邮件中的链接重置密码</p>
                        <Button variant="outline" onClick={() => setResetOpen(false)}>我知道了</Button>
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">输入您的邮箱，我们将发送重置密码的链接</p>
                        <div className="space-y-2">
                          <Label>邮箱</Label>
                          <Input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="输入注册邮箱" />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setResetOpen(false)}>取消</Button>
                          <Button onClick={handleResetPassword} disabled={resetLoading || !resetEmail}>
                            {resetLoading ? "发送中..." : "发送重置邮件"}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
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
