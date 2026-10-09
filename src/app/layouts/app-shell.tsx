import { BookMarked, History, Languages, Search, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { SilentSessionGuard } from "@/modules/auth/ui/silent-session-guard";
import { cn } from "@/shared/lib/cn";
import { Panel } from "@/shared/ui/panel";

const navItems = [
  { to: "/", label: "查词", icon: Search, end: true },
  { to: "/translations", label: "翻译", icon: Languages },
  { to: "/history", label: "历史", icon: History },
  { to: "/wordbooks", label: "单词本", icon: BookMarked },
  { to: "/settings", label: "设置", icon: Settings },
];

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[var(--app-shell-max-width)] flex-col gap-5 px-4 py-4 min-[560px]:flex-row min-[560px]:items-start min-[560px]:gap-6 min-[560px]:px-6 min-[560px]:py-6 lg:px-8 lg:py-8">
      <SilentSessionGuard />
      <Panel
        as="aside"
        className="w-full shrink-0 overflow-hidden border-white/5 bg-[linear-gradient(180deg,hsl(var(--sidebar))/0.96,hsla(224,14%,11%,0.9))] min-[560px]:sticky min-[560px]:top-6 min-[560px]:flex min-[560px]:max-h-[calc(100svh-3rem)] min-[560px]:flex-col min-[560px]:w-[var(--sidebar-rail-width)] min-[960px]:w-[var(--sidebar-compact-width)] min-[1200px]:w-[var(--sidebar-full-width)] lg:top-8 lg:max-h-[calc(100svh-4rem)]"
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5 min-[560px]:max-[959px]:justify-center min-[560px]:max-[959px]:gap-0 min-[560px]:max-[959px]:px-3 min-[960px]:justify-start min-[960px]:gap-3 min-[960px]:px-5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--accent))/0.85,hsl(213_78%_64%)/0.55)] text-sm font-semibold text-[hsl(var(--accent-foreground))] shadow-[var(--shadow-base)]">
            L
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-[0.18em] text-[hsl(var(--foreground))] min-[560px]:max-[959px]:sr-only">
              Lexora
            </p>
          </div>
        </div>

        <nav aria-label="主导航" className="flex flex-col gap-1 p-3 min-[560px]:min-h-0 min-[560px]:flex-1 min-[560px]:overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-[calc(var(--radius-md)+2px)] px-3 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-[background-color,color,box-shadow,transform] duration-[var(--motion-base)] ease-[var(--motion-ease)] motion-reduce:transition-none hover:bg-white/5 hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] min-[560px]:max-[959px]:justify-center min-[560px]:max-[959px]:px-2 min-[960px]:justify-start min-[960px]:px-3",
                    "cursor-pointer",
                    isActive &&
                      "bg-[linear-gradient(135deg,hsl(var(--accent))/0.24,hsl(var(--accent))/0.1)] text-[hsl(var(--foreground))] shadow-[inset_0_1px_0_hsl(var(--accent)/0.18)]",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl border border-transparent bg-white/0 text-[hsl(var(--muted-foreground))] transition-[background-color,border-color,color,transform] duration-[var(--motion-base)] ease-[var(--motion-ease)] motion-reduce:transition-none min-[560px]:max-[959px]:size-10 min-[960px]:size-9",
                        isActive &&
                          "border-white/10 bg-black/10 text-[hsl(var(--accent-foreground))]",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-[560px]:max-[959px]:sr-only">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </Panel>

      <main className="min-w-0 flex-1 min-[560px]:pt-1">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
