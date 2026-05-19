import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/server"

const DEFAULT_URLS: Record<string, string> = {
  openai: "https://api.openai.com",
  deepseek: "https://api.deepseek.com",
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  try {
    const { text, categories, aiConfig } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "请输入文本" }, { status: 400 })
    }

    const apiKey = aiConfig?.apiKey || process.env.AI_API_KEY
    const provider = aiConfig?.provider || "openai"
    const model = aiConfig?.model || "gpt-4o-mini"
    const baseUrl = aiConfig?.baseUrl || DEFAULT_URLS[provider] || "https://api.openai.com"

    if (!apiKey) {
      return NextResponse.json({ error: "请先在设置中配置 AI API Key" }, { status: 400 })
    }

    const categoryNames = categories?.map((c: any) => c.name).join("、") || "餐饮、购物、交通、娱乐"

    const prompt = `你是一个智能记账助手。从用户的自然语言描述中提取记账信息。
用户可用的分类（收入/支出）：${categoryNames}

请严格按照以下 JSON 格式返回，不要包含任何其他文字：
{
  "type": "income" 或 "expense",
  "amount": 数字（纯数字，单位元，不要符号）,
  "category": "分类名称（尽量匹配用户可用的分类）",
  "description": "简短描述（10字以内）",
  "date": "YYYY-MM-DD 格式（如果不确定就填今天）"
}

用户输入：${text}`

    const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `API 请求失败 (${res.status}): ${errText}` }, { status: 502 })
    }

    const data = await res.json()
    const result = data.choices?.[0]?.message?.content

    if (!result) {
      return NextResponse.json({ error: "AI 解析失败，请重试" }, { status: 500 })
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI 返回格式异常，请重试" }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "服务器错误" }, { status: 500 })
  }
}
