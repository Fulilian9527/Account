"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react"

const mobileItems = [
  { href: "/dashboard", label: "总览", icon: LayoutDashboard },
  { href: "/transactions/new", label: "记账", icon: Plus, highlight: true },
  { href: "/reports", label: "报表", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-center justify-around px-2 safe-area-bottom">
      {mobileItems.map((item) => {
        const isActive = pathname.startsWith(item.href)
        if (item.highlight) {
          return (
            <Link key={item.href} href={item.href} className="relative -top-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <item.icon className="w-5 h-5 text-primary-foreground" />
              </div>
            </Link>
          )
        }
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px]">
            <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px]", isActive ? "text-primary font-medium" : "text-muted-foreground")}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
