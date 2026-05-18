"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { startOfMonth, endOfMonth, format } from "date-fns"

export default function BudgetsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [budgets, setBudgets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category_id: "", amount: "", period: "monthly" as "monthly" | "yearly" })

  const fetchData = useCallback(async () => {
    if (!user) return
    const [budgetRes, catRes] = await Promise.all([
      supabase.from("budgets").select("*, categories(name, icon, color)").eq("user_id", user.id),
      supabase.from("categories").select("*").eq("user_id", user.id).eq("type", "expense").order("sort_order"),
    ])
    setBudgets(budgetRes.data ?? [])
    setCategories(catRes.data ?? [])

    const now = new Date()
    const { data: txData } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", format(startOfMonth(now), "yyyy-MM-dd"))
      .lte("date", format(endOfMonth(now), "yyyy-MM-dd"))

    const spendMap: Record<string, number> = {}
    ;(txData as any[])?.forEach((t: any) => { spendMap[t.category_id] = (spendMap[t.category_id] || 0) + t.amount })
    setSpending(spendMap)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!form.category_id || !form.amount) return
    const now = new Date()
    const { error } = await supabase.from("budgets").insert({
      user_id: user!.id,
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      period: form.period,
      start_date: startOfMonth(now).toISOString(),
      end_date: endOfMonth(now).toISOString(),
    })
    if (error) { toast.error("添加失败") } else {
      toast.success("添加成功")
      setShowAdd(false)
      setForm({ category_id: "", amount: "", period: "monthly" })
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from("budgets").delete().eq("id", id)
    toast.success("已删除")
    fetchData()
  }

  if (loading) return <div className="p-6 animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-64 bg-muted rounded-xl" /></div>

  const usedCatIds = new Set(budgets.map(b => b.category_id))
  const availableCats = categories.filter(c => !usedCatIds.has(c.id))

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">预算</h1>
        {availableCats.length > 0 && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> 添加预算</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>添加预算</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                    <SelectContent>
                      {availableCats.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>预算金额</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>周期</Label>
                  <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">每月</SelectItem>
                      <SelectItem value="yearly">每年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
                <Button onClick={handleAdd}>添加</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">暂无预算，添加一个开始规划</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map(b => {
            const spent = spending[b.category_id] || 0
            const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0
            const isOver = spent > b.amount
            return (
              <Card key={b.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{b.categories?.icon}</span>
                    <CardTitle className="text-base">{b.categories?.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(b.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatCurrency(spent)} / {formatCurrency(b.amount)}</span>
                    <Badge variant={isOver ? "destructive" : "secondary"}>{pct.toFixed(0)}%</Badge>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    剩余 {formatCurrency(Math.max(b.amount - spent, 0))}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
