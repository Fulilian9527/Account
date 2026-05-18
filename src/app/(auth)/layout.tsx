import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { PWAInstallButton } from "@/components/pwa-install-button"
import { AuthGuard } from "@/components/auth-guard"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-16 lg:pb-0 overflow-auto">
          {children}
        </main>
        <MobileNav />
        <PWAInstallButton />
      </div>
    </AuthGuard>
  )
}
