"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Search, Plus, Trash2, Sparkles, Pencil } from "lucide-react"
import { toast } from "sonner"
import { AiInput } from "@/components/ai-input"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTx, setEditingTx] = useState<any>(null)

  const [summary, setSummary] = useState({ balance: 0, monthlyIncome: 0, monthlyExpense: 0 })
  const [expenseByCategory, setExpenseByCategory] = useState<any[]>([])

  const emptyForm = { amount: "", type: "expense" as "income" | "expense", category_id: "", account_id: "", description: "", date: format(new Date(), "yyyy-MM-dd") }
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(async () => {
    if (!user) return
    const now = new Date()
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")

    const [accountsRes, monthRes, txRes, catRes, accRes] = await Promise.all([
      supabase.from("accounts").select("balance").eq("user_id", user.id),
      supabase.from("transactions").select("amount, type").eq("user_id", user.id).gte("date", monthStart).lte("date", monthEnd),
      supabase.from("transactions").select("*, categories(name, icon, color), accounts(name)").eq("user_id", user.id).order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("accounts").select("*").eq("user_id", user.id),
    ])

    setTransactions(txRes.data ?? [])
    setCategories(catRes.data ?? [])
    setAccounts(accRes.data ?? [])

    const balance = (accountsRes.data as any[])?.reduce((s: number, a: any) => s + (a.balance || 0), 0) ?? 0
    const monthlyIncome = (monthRes.data as any[])?.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0) ?? 0
    const monthlyExpense = (monthRes.data as any[])?.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0) ?? 0
    setSummary({ balance, monthlyIncome, monthlyExpense })

    const catMap = new Map<string, { name: string; amount: number; color: string; icon: string }>()
    ;(txRes.data as any[])?.filter((t: any) => t.type === "expense").forEach((t: any) => {
      if (t.date < monthStart || t.date > monthEnd) return
      const name = t.categories?.name ?? "未分类"
      const color = t.categories?.color ?? "#94a3b8"
      const icon = t.categories?.icon ?? "circle"
      const existing = catMap.get(name)
      if (existing) existing.amount += t.amount
      else catMap.set(name, { name, amount: t.amount, color, icon })
    })
    setExpenseByCategory(Array.from(catMap.values()).sort((a, b) => b.amount - a.amount))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = transactions.filter(t => {
    const matchSearch = !search || t.description?.includes(search) || t.categories?.name?.includes(search)
    const matchType = typeFilter === "all" || t.type === typeFilter
    return matchSearch && matchType
  })

  const handleAddTransaction = async () => {
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
    if (error) { toast.error("添加失败：" + error.message) } else {
      toast.success("添加成功")
      setShowAddDialog(false)
      setForm(emptyForm)
      fetchData()
    }
  }

  const handleEditTransaction = async () => {
    if (!editingTx) return
    const { error } = await supabase.from("transactions").update({
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.category_id,
      account_id: form.account_id,
      description: form.description,
      date: form.date,
    }).eq("id", editingTx.id)
    if (error) { toast.error("编辑失败：" + error.message) } else {
      toast.success("已更新")
      setShowEditDialog(false)
      setEditingTx(null)
      setForm(emptyForm)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) { toast.error("删除失败") } else {
      toast.success("已删除")
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  const openEdit = (t: any) => {
    setEditingTx(t)
    setForm({
      amount: String(t.amount),
      type: t.type,
      category_id: t.category_id,
      account_id: t.account_id,
      description: t.description ?? "",
      date: t.date,
    })
    setShowEditDialog(true)
  }

  const netIncome = summary.monthlyIncome - summary.monthlyExpense

  if (loading) {
    return <div className="p-6 animate-pulse space-y-4">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
      <div className="h-10 bg-muted rounded" />
      <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}</div>
    </div>
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">总览</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), "yyyy年M月")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiDialog(true)}>
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI记账</span>
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">记一笔</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>记一笔</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Tabs value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "income" | "expense" }))}>
                  <TabsList className="w-full">
                    <TabsTrigger value="expense" className="flex-1">支出</TabsTrigger>
                    <TabsTrigger value="income" className="flex-1">收入</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="space-y-2"><Label>金额</Label><Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                    <SelectContent>{categories.filter(c => c.type === form.type).map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>账户</Label>
                  <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="选择账户" /></SelectTrigger>
                    <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>日期</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>备注</Label><Input placeholder="可选" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
                <Button onClick={handleAddTransaction}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">总资产</CardTitle><Wallet className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summary.balance)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">月收入</CardTitle><TrendingUp className="w-4 h-4 text-emerald-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.monthlyIncome)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">月支出</CardTitle><TrendingDown className="w-4 h-4 text-rose-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-rose-500">{formatCurrency(summary.monthlyExpense)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">本月结余</CardTitle>{netIncome >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}</CardHeader><CardContent><div className={`text-2xl font-bold ${netIncome >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(netIncome)}</div></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="搜索备注或分类..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="expense">支出</TabsTrigger>
            <TabsTrigger value="income">收入</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">暂无账单记录，点击右上角记一笔</CardContent></Card>
        ) : (
          filtered.map((t: any) => (
            <Card key={t.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: t.categories?.color ? t.categories.color + "20" : "#e2e8f020" }}>
                    <span className="text-lg">{t.categories?.icon ?? "📄"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.categories?.name ?? "未分类"}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.description || formatDate(t.date)} · {t.accounts?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="text-right mr-2">
                    <p className={`font-semibold text-sm ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(t.date)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>AI 记账</DialogTitle></DialogHeader>
          <AiInput categories={categories} accounts={accounts} userId={user!.id} onSuccess={() => { setShowAiDialog(false); fetchData() }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑账单</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Tabs value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "income" | "expense" }))}>
              <TabsList className="w-full">
                <TabsTrigger value="expense" className="flex-1">支出</TabsTrigger>
                <TabsTrigger value="income" className="flex-1">收入</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-2"><Label>金额</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.filter(c => c.type === form.type).map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>账户</Label>
              <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>日期</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>备注</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingTx(null); setForm(emptyForm) }}>取消</Button>
            <Button onClick={handleEditTransaction}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
