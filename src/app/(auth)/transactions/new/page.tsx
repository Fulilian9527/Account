"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

export default function NewTransactionPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    category_id: "",
    account_id: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  })

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("accounts").select("*").eq("user_id", user.id),
    ]).then(([catRes, accRes]) => {
      setCategories(catRes.data ?? [])
      setAccounts(accRes.data ?? [])
    })
  }, [user])

  const handleSave = async () => {
    if (!form.amount || !form.category_id || !form.account_id) {
      toast.error("请填写完整信息")
      return
    }
    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id,
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.category_id,
      account_id: form.account_id,
      description: form.description,
      date: form.date,
    })
    if (error) {
      toast.error("添加失败")
    } else {
      toast.success("添加成功")
      router.push("/transactions")
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">记一笔</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <Tabs value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "income" | "expense" }))}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">支出</TabsTrigger>
              <TabsTrigger value="income" className="flex-1">收入</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>金额</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>分类</Label>
            <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
              <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.type === form.type).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>账户</Label>
            <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
              <SelectTrigger><SelectValue placeholder="选择账户" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>日期</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>备注</Label>
            <Input placeholder="可选" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <Button className="w-full" onClick={handleSave}>保存</Button>
        </CardContent>
      </Card>
    </div>
  )
}
