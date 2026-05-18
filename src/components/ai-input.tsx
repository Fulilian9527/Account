"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import type { AiParseResult } from "@/types"

interface AiInputProps {
  categories: any[]
  accounts: any[]
  userId: string
  onSuccess: () => void
}

export function AiInput({ categories, accounts, userId, onSuccess }: AiInputProps) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiParseResult | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("ai_provider, ai_api_key, ai_model, ai_base_url")
        .eq("user_id", userId)
        .single()

      const res = await fetch("/api/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          categories,
          aiConfig: {
            apiKey: settings?.ai_api_key || "",
            provider: settings?.ai_provider || "openai",
            model: settings?.ai_model || "gpt-4o-mini",
            baseUrl: settings?.ai_base_url || "",
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "解析失败")
      setResult(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const matchCategory = (name: string) => {
    if (!name) return ""
    const cat = categories.find(c => c.name === name || name.includes(c.name))
    return cat?.id ?? ""
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    const categoryId = result.type === "expense"
      ? matchCategory(result.category) || categories.find(c => c.type === "expense")?.id || ""
      : matchCategory(result.category) || categories.find(c => c.type === "income")?.id || ""
    const accountId = accounts[0]?.id

    if (!categoryId || !accountId) {
      toast.error("请先创建分类和账户")
      setSaving(false)
      return
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      amount: result.amount,
      type: result.type,
      category_id: categoryId,
      account_id: accountId,
      description: result.description,
      date: result.date || format(new Date(), "yyyy-MM-dd"),
    })

    if (error) {
      toast.error("保存失败：" + error.message)
    } else {
      toast.success("AI 记账成功！")
      setText("")
      setResult(null)
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>自然语言描述</Label>
        <Textarea
          placeholder="例如：今天中午吃饭花了35块&#10;昨天发工资了，收入8000元&#10;交房租3000"
          rows={3}
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      <Button className="w-full" onClick={handleParse} disabled={loading || !text.trim()}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 识别中...</> : "AI 识别"}
      </Button>

      {result && (
        <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">识别结果</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">类型：</span>
              <Badge variant={result.type === "income" ? "success" : "destructive"}>
                {result.type === "income" ? "收入" : "支出"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">金额：</span>
              <span className="font-semibold">{result.amount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">分类：</span>
              <span>{result.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground">日期：</span>
              <span>{result.date || "今天"}</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">备注：</span>
            <span>{result.description}</span>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "确认添加"}
          </Button>
        </div>
      )}
    </div>
  )
}
