import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Activity,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MessageSquareText, label: "AI Query", path: "/analytics" },
  { icon: Upload, label: "Ingest", path: "/ingest" },
  { icon: FileText, label: "Logs Explorer", path: "/logs" },
];

export function Sidebar() {
  const { sidebarOpen } = useAppStore();

  return (
    <aside
      className={cn(
        "bg-zinc-950 border-r border-white/5 h-screen transition-all duration-300 ease-in-out flex flex-col",
        sidebarOpen ? "w-64" : "w-[72px]",
      )}
    >
      <div className="h-14 flex items-center px-6 border-b border-white/5">
        {sidebarOpen ? (
          <span className="font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center text-black">
              <Activity className="w-3 h-3" />
            </div>
            SentientLog
          </span>
        ) : (
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-black mx-auto">
            <Activity className="w-4 h-4" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-md transition-all group relative",
                sidebarOpen ? "px-3 py-2" : "p-3 justify-center",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              )
            }
            title={!sidebarOpen ? item.label : undefined}
          >
            <item.icon
              className={cn(
                "flex-shrink-0",
                sidebarOpen ? "h-4 w-4" : "h-5 w-5",
              )}
            />
            {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {sidebarOpen && (
        <div className="p-4 border-t border-white/5">
          <div className="text-[11px] text-zinc-500 font-mono">v1.0.0-beta</div>
        </div>
      )}
    </aside>
  );
}
