import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { TruckIcon, AlertTriangle, Package, Ship, Archive, ArrowRight, LogOut } from "lucide-react";

const StatCard = ({ label, value, sub, accent, testid }) => (
    <div
        className={`border border-zinc-800 bg-zinc-900 p-4 rounded-sm flex flex-col justify-between min-h-[110px] ${accent || ""}`}
        data-testid={testid}
    >
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500">
            {label}
        </p>
        <div>
            <p className="font-heading font-black text-5xl leading-none tracking-tight text-white font-mono-num">
                {value}
            </p>
            {sub && (
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mt-1 font-semibold">
                    {sub}
                </p>
            )}
        </div>
    </div>
);

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [s, setS] = useState(null);

    useEffect(() => {
        api.get("/dashboard/summary").then((r) => setS(r.data)).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="font-heading font-black uppercase text-2xl leading-none tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mt-1">
                            {user?.name} · {user?.role}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"
                        data-testid="logout-btn"
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="max-w-md mx-auto px-4 pt-6 pb-8 relative z-10">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <StatCard
                        label="Truk Hari Ini"
                        value={s ? s.trucks_today : "-"}
                        sub={s ? `${s.trucks_yesterday} kemarin` : ""}
                        testid="stat-today"
                    />
                    <StatCard
                        label="Total Truk"
                        value={s ? s.total_trucks : "-"}
                        sub={s ? `${s.trucks_week} 7 hari` : ""}
                        testid="stat-total"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="border border-green-500/30 bg-green-500/5 p-4 rounded-sm" data-testid="stat-complete">
                        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-green-500 mb-2">
                            Lengkap
                        </p>
                        <p className="font-heading font-black text-4xl text-green-500 font-mono-num leading-none">
                            {s ? s.complete_today : "-"}
                        </p>
                    </div>
                    <div className="border border-yellow-500/30 bg-yellow-500/5 p-4 rounded-sm" data-testid="stat-incomplete">
                        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-yellow-500 mb-2">
                            Belum
                        </p>
                        <p className="font-heading font-black text-4xl text-yellow-500 font-mono-num leading-none">
                            {s ? s.incomplete_today : "-"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="border border-zinc-800 bg-zinc-900 p-4 rounded-sm flex items-center gap-3" data-testid="stat-ekspor">
                        <Ship size={28} className="text-orange-400" strokeWidth={2} />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                Ekspor
                            </p>
                            <p className="font-heading font-black text-2xl font-mono-num leading-none">
                                {s ? s.ekspor_today : "-"}
                            </p>
                        </div>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-900 p-4 rounded-sm flex items-center gap-3" data-testid="stat-lokal">
                        <Package size={28} className="text-blue-400" strokeWidth={2} />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                Lokal
                            </p>
                            <p className="font-heading font-black text-2xl font-mono-num leading-none">
                                {s ? s.lokal_today : "-"}
                            </p>
                        </div>
                    </div>
                </div>

                {s?.ready_destroy > 0 && (
                    <Link
                        to="/retention"
                        className="flex items-center justify-between border border-red-500/40 bg-red-500/5 warn-stripes p-4 rounded-sm mb-6 hover:border-red-500"
                        data-testid="ready-destroy-banner"
                    >
                        <div className="flex items-center gap-3">
                            <Archive size={24} className="text-red-500" />
                            <div>
                                <p className="font-heading font-black uppercase text-red-500">
                                    {s.ready_destroy} arsip siap dimusnahkan
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                    Retensi 2 tahun terlampaui
                                </p>
                            </div>
                        </div>
                        <ArrowRight size={20} className="text-red-500" />
                    </Link>
                )}

                <h2 className="font-heading font-bold uppercase text-sm text-zinc-400 tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-500" />
                    Perlu Perhatian
                </h2>
                {(!s || s.needs_attention.length === 0) && (
                    <div className="border border-zinc-800 bg-zinc-900/50 p-6 rounded-sm text-center" data-testid="no-attention">
                        <p className="text-zinc-500 text-sm">Semua truk sudah lengkap.</p>
                    </div>
                )}
                <div className="space-y-2" data-testid="needs-attention-list">
                    {s?.needs_attention?.map((t) => (
                        <Link
                            key={t.id}
                            to={`/trucks/${t.id}`}
                            className="flex items-center justify-between border border-zinc-800 bg-zinc-900 p-3 rounded-sm hover:border-yellow-500/50"
                            data-testid={`attention-${t.id}`}
                        >
                            <div>
                                <p className="font-heading font-bold text-lg uppercase font-mono-num">
                                    {t.nopol}
                                </p>
                                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold">
                                    {t.jenis_pemuatan} · {t.tanggal_pemuatan}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-mono-num text-yellow-500 font-bold">
                                    {t.total_photos} foto
                                </p>
                                <ArrowRight size={14} className="text-zinc-500 ml-auto mt-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
