import { NextRequest, NextResponse } from "next/server"

const DEFAULT_URLS: Record<string, string> = {
  openai: "https://api.openai.com",
  deepseek: "https://api.deepseek.com",
}

export async function POST(request: NextRequest) {
  try {
    const { aiConfig } = await request.json()

    const apiKey = aiConfig?.apiKey
    const provider = aiConfig?.provider || "openai"
    const model = aiConfig?.model || "gpt-4o-mini"
    const baseUrl = aiConfig?.baseUrl || DEFAULT_URLS[provider] || "https://api.openai.com"

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "API Key 不能为空" })
    }

    const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "请回复：连接成功" }],
        temperature: 0.1,
        max_tokens: 20,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      let detail = errText
      try {
        const parsed = JSON.parse(errText)
        detail = parsed.error?.message || parsed.error || errText
      } catch {}
      return NextResponse.json({ ok: false, error: `请求失败 (${res.status}): ${detail}` })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content

    return NextResponse.json({ ok: true, message: content || "连接成功" })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "未知错误" })
  }
}
