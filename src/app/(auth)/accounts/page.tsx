"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, Pencil } from "lucide-react"
import { ACCOUNT_ICON_MAP } from "@/components/account-icons"
import { toast } from "sonner"

const ACCOUNT_LABELS: Record<string, string> = {
  银行: "储蓄账户",
  移动支付: "移动支付",
  现金: "现金",
  信用卡: "信用账户",
}

const ICON_OPTIONS = Object.keys(ACCOUNT_ICON_MAP)

export default function AccountsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [form, setForm] = useState({ name: "", type: "", icon: "现金", balance: "" })
  const [editForm, setEditForm] = useState({ name: "", type: "", icon: "", balance: "" })

  const fetchData = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at")
    setAccounts(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    const { error } = await supabase.from("accounts").insert({
      user_id: user!.id,
      name: form.name,
      type: form.type,
      icon: form.icon,
      balance: parseFloat(form.balance || "0"),
    })
    if (error) { toast.error("添加失败") } else {
      toast.success("添加成功")
      setShowAdd(false)
      setForm({ name: "", type: "", icon: "现金", balance: "" })
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("accounts").delete().eq("id", id)
    if (error) { toast.error("删除失败") } else {
      toast.success("已删除")
      fetchData()
    }
  }

  const openEdit = (account: any) => {
    setEditingAccount(account)
    setEditForm({ name: account.name, type: account.type, icon: account.icon || "", balance: String(account.balance) })
    setShowEdit(true)
  }

  const handleEdit = async () => {
    if (!editForm.name.trim() || !editingAccount) return
    const { error } = await supabase.from("accounts").update({
      name: editForm.name,
      type: editForm.type,
      icon: editForm.icon,
      balance: parseFloat(editForm.balance || "0"),
    }).eq("id", editingAccount.id)
    if (error) { toast.error("保存失败") } else {
      toast.success("修改成功")
      setShowEdit(false)
      setEditingAccount(null)
      fetchData()
    }
  }

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  if (loading) return <div className="p-6 animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}</div></div>

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">账户</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4" /> 添加账户</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>添加账户</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="例如：现金、银行卡、支付宝" />
              </div>
              <div className="space-y-2">
                <Label>余额</Label>
                <Input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>图标</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(key => {
                    const Icon = ACCOUNT_ICON_MAP[key]
                    return (
                      <button key={key} type="button" onClick={() => setForm(f => ({ ...f, icon: key }))}
                        className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border ${form.icon === key ? "border-primary ring-2 ring-primary/30" : "border-input"}`}>
                        <Icon className="w-6 h-6" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
              <Button onClick={handleAdd}>添加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={showEdit} onOpenChange={v => { setShowEdit(v); if (!v) setEditingAccount(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑账户</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
                <Label>类型</Label>
                <Input value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} placeholder="例如：现金、银行卡、支付宝" />
              </div>
            <div className="space-y-2">
              <Label>余额</Label>
              <Input type="number" step="0.01" value={editForm.balance} onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>图标</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(key => {
                  const Icon = ACCOUNT_ICON_MAP[key]
                  return (
                    <button key={key} type="button" onClick={() => setEditForm(f => ({ ...f, icon: key }))}
                      className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border ${editForm.icon === key ? "border-primary ring-2 ring-primary/30" : "border-input"}`}>
                      <Icon className="w-6 h-6" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEdit(false); setEditingAccount(null) }}>取消</Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">总资产</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="2.5rem" height="2.5rem" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/40"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {accounts.map(a => {
          const Icon = ACCOUNT_ICON_MAP[a.icon] || ACCOUNT_ICON_MAP[a.name] || ACCOUNT_ICON_MAP[a.type] || (() => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-primary"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>)
          return (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">{a.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(a.balance)}</p>
                <p className="text-xs text-muted-foreground mt-1">{ACCOUNT_LABELS[a.type] || a.type}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
