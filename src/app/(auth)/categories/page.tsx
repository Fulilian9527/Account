"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const ICONS = ["🍝", "🛒", "🚗", "🏠", "🎮", "👕", "📱", "💊", "📎", "💳", "🎀", "🧧", "🐶", "🎯", "🧵", "💰", "💈", "📝", "🧞", "⭐"]

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"]

const DEFAULT_EXPENSE = [
  { name: "椁愰ギ", icon: "馃崝", color: "#ef4444" },
  { name: "璐墿", icon: "馃洅", color: "#f97316" },
  { name: "浜ら€?, icon: "馃殫", color: "#eab308" },
  { name: "灞呬綇", icon: "馃彔", color: "#06b6d4" },
  { name: "濞变箰", icon: "馃幃", color: "#8b5cf6" },
  { name: "鏈嶉グ", icon: "馃憰", color: "#ec4899" },
  { name: "鏁扮爜", icon: "馃摫", color: "#3b82f6" },
  { name: "鍖荤枟", icon: "馃拪", color: "#22c55e" },
]

const DEFAULT_INCOME = [
  { name: "宸ヨ祫", icon: "馃挵", color: "#22c55e" },
  { name: "鍏艰亴", icon: "馃捈", color: "#06b6d4" },
  { name: "鎶曡祫", icon: "馃搱", color: "#8b5cf6" },
  { name: "绾㈠寘", icon: "馃Ё", color: "#ef4444" },
]

export default function CategoriesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", icon: "馃搫", color: "#3b82f6", type: "expense" as "income" | "expense" })

  const fetchData = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("sort_order")
    setCategories(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    const maxOrder = categories.filter(c => c.type === form.type).length
    const { error } = await supabase.from("categories").insert({
      user_id: user!.id,
      name: form.name,
      icon: form.icon,
      color: form.color,
      type: form.type,
      sort_order: maxOrder,
    })
    if (error) { toast.error("娣诲姞澶辫触") } else {
      toast.success("娣诲姞鎴愬姛")
      setShowAdd(false)
      setForm({ name: "", icon: "馃搫", color: "#3b82f6", type: "expense" })
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (error) { toast.error("鍒犻櫎澶辫触") } else {
      toast.success("宸插垹闄?)
      fetchData()
    }
  }

  if (loading) return <div className="p-6 animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-64 bg-muted rounded-xl" /></div>

  const expenseCats = categories.filter(c => c.type === "expense")
  const incomeCats = categories.filter(c => c.type === "income")

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">鍒嗙被绠＄悊</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> 娣诲姞鍒嗙被</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>娣诲姞鍒嗙被</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>绫诲瀷</Label>
                <Tabs value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "income" | "expense" }))}>
                  <TabsList className="w-full">
                    <TabsTrigger value="expense" className="flex-1">鏀嚭</TabsTrigger>
                    <TabsTrigger value="income" className="flex-1">鏀跺叆</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="space-y-2">
                <Label>鍚嶇О</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>鍥炬爣</Label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border ${form.icon === icon ? "border-primary bg-primary/10" : "border-input"}`}
                    >{icon}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>棰滆壊</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full ${form.color === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>鍙栨秷</Button>
              <Button onClick={handleAdd}>娣诲姞</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">鏀嚭鍒嗙被 ({expenseCats.length})</TabsTrigger>
          <TabsTrigger value="income">鏀跺叆鍒嗙被 ({incomeCats.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {expenseCats.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col items-center gap-2 relative">
                <span className="text-2xl">{c.icon}</span>
                <span className="text-sm font-medium">{c.name}</span>
                <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="income" className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {incomeCats.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col items-center gap-2 relative">
                <span className="text-2xl">{c.icon}</span>
                <span className="text-sm font-medium">{c.name}</span>
                <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
