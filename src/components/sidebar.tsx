"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/supabase-provider"
import {
  LayoutDashboard,
  Tags,
  Wallet,
  PiggyBank,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Receipt,
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "总览", icon: LayoutDashboard },
  { href: "/accounts", label: "账户", icon: Wallet },
  { href: "/categories", label: "分类", icon: Tags },
  { href: "/budgets", label: "预算", icon: PiggyBank },
  { href: "/bills", label: "提醒", icon: Bell },
  { href: "/reports", label: "报表", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-sidebar">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">账小记</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
      <div className="p-3 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
          <LogOut className="w-4 h-4" />
          退出登录
        </Button>
      </div>
    </aside>
  )
}
