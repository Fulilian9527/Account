"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/supabase-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"]

export default function ReportsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [period, setPeriod] = useState<3 | 6 | 12>(3)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const now = new Date()
    const startDate = subMonths(now, period)
    const { data: txData } = await supabase
      .from("transactions")
      .select("amount, type, date, categories(name, icon, color)")
      .eq("user_id", user.id)
      .gte("date", format(startDate, "yyyy-MM-dd"))
      .lte("date", format(endOfMonth(now), "yyyy-MM-dd"))
      .order("date")

    if (!txData) { setLoading(false); return }

    const monthlyMap: Record<string, { income: number; expense: number }> = {}
    const catMap: Record<string, { name: string; amount: number; color: string }> = {}

    ;(txData as any[]).forEach((t: any) => {
      const month = t.date.slice(0, 7)
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 }
      if (t.type === "income") monthlyMap[month].income += t.amount
      else monthlyMap[month].expense += t.amount

      if (t.type === "expense") {
        const catName = t.categories?.name ?? "未分类"
        if (!catMap[catName]) catMap[catName] = { name: catName, amount: 0, color: t.categories?.color ?? "#94a3b8" }
        catMap[catName].amount += t.amount
      }
    })

    setMonthlyData(Object.entries(monthlyMap).map(([month, data]) => ({ month, ...data })))
    setCategoryData(Object.values(catMap).sort((a, b) => b.amount - a.amount))
    setLoading(false)
  }, [user, period])

  useEffect(() => { fetchData() }, [fetchData])

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0)
  const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0)

  if (loading) return <div className="p-6 animate-pulse space-y-4"><div className="h-8 w-48 bg-muted rounded" /><div className="h-80 bg-muted rounded-xl" /></div>

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">报表统计</h1>
        <Tabs value={String(period)} onValueChange={v => setPeriod(Number(v) as 3 | 6 | 12)}>
          <TabsList>
            <TabsTrigger value="3">近3月</TabsTrigger>
            <TabsTrigger value="6">近6月</TabsTrigger>
            <TabsTrigger value="12">近12月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">总收入</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">总支出</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-rose-500">{formatCurrency(totalExpense)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">收支趋势</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={(v: any) => v?.slice(5)} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: any) => `¥${v}`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">支出分类占比</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">分类排行</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              categoryData.slice(0, 8).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(cat.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
