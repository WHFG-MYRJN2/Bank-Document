import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Truck, ListChecks, Search, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", testid: "nav-dashboard" },
    { to: "/queue", icon: ListChecks, label: "Antrian", testid: "nav-queue" },
    { to: "/new", icon: Truck, label: "Input", testid: "nav-new", highlight: true },
    { to: "/history", icon: Search, label: "Riwayat", testid: "nav-history" },
    { to: "/account", icon: User, label: "Akun", testid: "nav-account" },
];

export default function BottomNav() {
    const { user } = useAuth();
    if (!user) return null;
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800"
            data-testid="bottom-nav"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="max-w-md mx-auto grid grid-cols-5 h-[72px]">
                {items.map(({ to, icon: Icon, label, testid, highlight }) => (
                    <NavLink
                        key={to}
                        to={to}
                        data-testid={testid}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-widest font-bold ${
                                highlight
                                    ? "text-yellow-500"
                                    : isActive
                                        ? "text-yellow-500"
                                        : "text-zinc-500 hover:text-zinc-300"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {highlight ? (
                                    <span className="w-11 h-11 -mt-6 rounded-full bg-yellow-500 text-zinc-950 flex items-center justify-center border-4 border-zinc-950 shadow-[0_0_16px_rgba(234,179,8,0.4)]">
                                        <Icon size={22} strokeWidth={2.5} />
                                    </span>
                                ) : (
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                )}
                                <span>{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
