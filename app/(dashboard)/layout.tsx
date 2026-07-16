"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useEffect } from "react"
import { LayoutGrid, MessageSquare, Settings, Plus, Search, Sparkles } from "lucide-react"
import { useShipitStore } from "@/stores/shipit.store"
import { cn } from "@/lib/utils"

const menuItems = [
  { label: "Chat", href: "/new", icon: MessageSquare },
  { label: "Apps", href: "/history", icon: LayoutGrid },
  { label: "Settings", href: "/settings", icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { deployedAgents } = useShipitStore()
  
  // Client-side auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7C5CFC] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAF8] text-[#111827] antialiased overflow-hidden selection:bg-[#7C5CFC]/20">
      
      {/* 1. Primary Left Navigation (72px) - Icons Only */}
      <div className="w-[72px] h-full bg-[#F9F9F8] border-r border-transparent flex flex-col items-center py-6 z-40 shrink-0">
        
        <Link href="/" className="w-10 h-10 mb-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#8a75ff] to-[#7C5CFC] shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </Link>

        <div className="flex flex-col gap-3 w-full px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/new' && pathname === '/')
            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center justify-center w-full aspect-square rounded-[14px] transition-all duration-200",
                  isActive 
                    ? "bg-[#7C5CFC]/10 text-[#7C5CFC]" 
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            )
          })}
        </div>

        <div className="mt-auto relative group">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt="Profile"
              className="w-9 h-9 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-[#7C5CFC]/30 transition-all duration-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#7C5CFC]/10 flex items-center justify-center text-sm font-bold text-[#7C5CFC] cursor-pointer">
              {session?.user?.name?.charAt(0) || "?"}
            </div>
          )}
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
            <div className="bg-white border border-[#ECECEC] rounded-xl shadow-xl p-3 min-w-[180px]">
              <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 w-full text-xs text-red-500 hover:text-red-600 text-left transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recent Chats Panel (280px) */}
      <div className="w-[280px] h-full bg-[#F9F9F8] border-r border-transparent flex flex-col pt-6 shrink-0 z-30">
        <div className="px-5 mb-4">
          <Link 
            href="/new" 
            className="flex items-center gap-2 w-full bg-white border border-[#ECECEC] hover:border-gray-300 shadow-sm rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            <Plus className="w-4 h-4 text-gray-500" />
            New Chat
          </Link>
        </div>

        <div className="px-5 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search..." 
              className="w-full bg-white border border-[#ECECEC] rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#7C5CFC]/50 focus:ring-1 focus:ring-[#7C5CFC]/50 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-on-hover pb-6">
          {/* Today Grouping */}
          <div>
            <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Today</h3>
            {deployedAgents.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-2">
                No recent activity.
              </div>
            ) : (
              deployedAgents.slice(0, 3).map((agent: any, i: number) => (
                <div key={agent.id || i} className="flex flex-col gap-0.5 px-3 py-2 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors duration-200">
                  <span className="text-sm font-medium text-gray-700 truncate">{agent.name || "Unnamed Agent"}</span>
                  <span className="text-[11px] text-gray-400 truncate">Deployed successfully on OKX</span>
                </div>
              ))
            )}
          </div>

          {/* Previous 7 Days Grouping (Mocked) */}
          {deployedAgents.length > 3 && (
            <div>
              <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Previous 7 Days</h3>
              {deployedAgents.slice(3).map((agent: any, i: number) => (
                <div key={agent.id || i} className="flex flex-col gap-0.5 px-3 py-2 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors duration-200">
                  <span className="text-sm font-medium text-gray-700 truncate">{agent.name || "Legacy Agent"}</span>
                  <span className="text-[11px] text-gray-400 truncate">Agent deployment flow</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Main AI Workspace (Remaining Width) */}
      <main className="flex-1 h-full bg-white relative overflow-hidden flex flex-col z-20">
        <div className="flex-1 overflow-y-auto w-full scrollbar-on-hover">
          {children}
        </div>
      </main>

    </div>
  )
}
