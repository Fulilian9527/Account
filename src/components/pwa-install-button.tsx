"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)

    const installedHandler = () => setDeferredPrompt(null)
    window.addEventListener("appinstalled", installedHandler)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setDeferredPrompt(null)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      window.removeEventListener("appinstalled", installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
  }

  if (!deferredPrompt || isDismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80 bg-card border rounded-xl shadow-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">安装账小记</p>
        <p className="text-xs text-muted-foreground">添加到主屏幕，使用更方便</p>
      </div>
      <Button size="sm" onClick={handleInstall}>安装</Button>
      <button onClick={() => setIsDismissed(true)} className="shrink-0 ml-1">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  )
}
