"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, Bell, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { format, isPast } from "date-fns"

export default function BillsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [bills, setBills] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", amount: "", category_id: "", due_date: "", repeat_mode: "none" as "none" | "monthly" | "yearly", notes: "" })

  const fetchData = useCallback(async () => {
    if (!user) return
    const [billRes, catRes] = await Promise.all([
      supabase.from("bills").select("*, categories(name, icon, color)").eq("user_id", user.id).order("due_date"),
      supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
    ])
    setBills(billRes.data ?? [])
    setCategories(catRes.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.category_id || !form.due_date) return
    const { error } = await supabase.from("bills").insert({
      user_id: user!.id,
      name: form.name,
      amount: parseFloat(form.amount),
      category_id: form.category_id,
      due_date: form.due_date,
      repeat_mode: form.repeat_mode,
      notes: form.notes,
    })
    if (error) { toast.error("添加失败") } else {
      toast.success("添加成功")
      setShowAdd(false)
      setForm({ name: "", amount: "", category_id: "", due_date: "", repeat_mode: "none", notes: "" })
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from("bills").delete().eq("id", id)
    toast.success("已删除")
    fetchData()
  }

  const toggleStatus = async (bill: any) => {
    const newStatus = bill.status === "paid" ? "pending" : "paid"
    await supabase.from("bills").update({ status: newStatus }).eq("id", bill.id)
    fetchData()
  }

  if (loading) return <div className="p-6 animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-64 bg-muted rounded-xl" /></div>

  const getStatusBadge = (bill: any) => {
    if (bill.status === "paid") return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />已付</Badge>
    if (isPast(new Date(bill.due_date))) return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />逾期</Badge>
    return <Badge variant="secondary"><Bell className="w-3 h-3 mr-1" />待付</Badge>
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">账单提醒</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> 添加提醒</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>添加账单提醒</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>名称</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>金额</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>到期日</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>重复</Label>
                <Select value={form.repeat_mode} onValueChange={v => setForm(f => ({ ...f, repeat_mode: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">不重复</SelectItem><SelectItem value="monthly">每月</SelectItem><SelectItem value="yearly">每年</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>备注</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
              <Button onClick={handleAdd}>添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {bills.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">暂无账单提醒</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {bills.map(b => (
            <Card key={b.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => toggleStatus(b)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: b.categories?.color + "20" }}>
                    {b.categories?.icon ?? "📄"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">到期 {format(new Date(b.due_date), "yyyy-MM-dd")} · {b.categories?.name}
                      {b.repeat_mode !== "none" && ` · 每${b.repeat_mode === "monthly" ? "月" : "年"}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(b.amount)}</p>
                    {getStatusBadge(b)}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(b.id) }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
