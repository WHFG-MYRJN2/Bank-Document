import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api, formatErr } from "../lib/api";
import { Search, Filter, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function History() {
    const [filters, setFilters] = useState({
        nopol: "",
        no_do: "",
        tujuan: "",
        jenis_pemuatan: "",
        status_kelengkapan: "",
        tanggal_from: "",
        tanggal_to: "",
    });
    const [items, setItems] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const params = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v),
            );
            const { data } = await api.get("/trucks", { params });
            setItems(data);
        } catch (e) {
            toast.error(formatErr(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function reset() {
        setFilters({
            nopol: "",
            no_do: "",
            tujuan: "",
            jenis_pemuatan: "",
            status_kelengkapan: "",
            tanggal_from: "",
            tanggal_to: "",
        });
    }

    const activeCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <PageHeader
                title="Riwayat"
                subtitle={`${items.length} truk ditemukan`}
                back={false}
                right={
                    <button
                        onClick={() => setShowFilters(true)}
                        className="h-10 px-3 border border-zinc-700 hover:border-yellow-500 font-bold uppercase text-xs tracking-wider rounded-sm flex items-center gap-1"
                        data-testid="open-filters-btn"
                    >
                        <Filter size={14} /> Filter
                        {activeCount > 0 && (
                            <span className="ml-1 min-w-[18px] h-[18px] bg-yellow-500 text-zinc-950 rounded-full text-[10px] flex items-center justify-center font-mono-num">
                                {activeCount}
                            </span>
                        )}
                    </button>
                }
            />

            {/* Quick search - always visible */}
            <div className="max-w-md mx-auto px-4 pt-4 relative z-10">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        value={filters.nopol}
                        onChange={(e) => setFilters({ ...filters, nopol: e.target.value.toUpperCase() })}
                        onKeyDown={(e) => e.key === "Enter" && load()}
                        placeholder="Cari No. Polisi..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 h-12 pl-10 pr-4 text-base font-mono-num rounded-sm outline-none uppercase"
                        data-testid="search-nopol"
                    />
                </div>
                <button
                    onClick={load}
                    className="w-full mt-3 h-12 bg-yellow-500 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-sm hover:bg-yellow-400"
                    data-testid="search-submit"
                >
                    Cari
                </button>
            </div>

            <div className="max-w-md mx-auto px-4 pt-6 pb-4 space-y-2 relative z-10" data-testid="history-list">
                {items.length === 0 && !loading && (
                    <div className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-sm text-center">
                        <p className="text-zinc-500 text-sm">Tidak ada truk yang cocok.</p>
                    </div>
                )}
                {items.map((t) => (
                    <Link
                        key={t.id}
                        to={`/trucks/${t.id}`}
                        className="block border border-zinc-800 bg-zinc-900 p-4 rounded-sm hover:border-yellow-500/50"
                        data-testid={`history-item-${t.nopol}`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-heading font-black text-2xl uppercase tracking-tight font-mono-num truncate">
                                        {t.nopol}
                                    </p>
                                    {t.status_kelengkapan === "lengkap" ? (
                                        <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest bg-green-500/10 text-green-500 border border-green-500/30 rounded-sm">
                                            Lengkap
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-sm">
                                            Belum
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">
                                    {t.tanggal_pemuatan} · {t.nama_supir}
                                </p>
                                <p className="text-sm text-zinc-300 uppercase truncate">
                                    {t.tujuan}
                                </p>
                            </div>
                            <div className="text-right ml-2">
                                <span className={`px-2 py-1 text-[9px] uppercase font-bold rounded-sm inline-block ${
                                    t.jenis_pemuatan === "EKSPOR"
                                        ? "border border-orange-500/40 text-orange-400 bg-orange-500/10"
                                        : "border border-blue-500/40 text-blue-400 bg-blue-500/10"
                                }`}>
                                    {t.jenis_pemuatan}
                                </span>
                                <p className="text-xs font-mono-num text-yellow-500 font-bold mt-2">
                                    {t.total_photos} foto
                                </p>
                            </div>
                        </div>
                        {t.no_do && (
                            <p className="text-[11px] font-mono-num text-zinc-500 border-t border-zinc-800 pt-2">
                                DO: {t.no_do}
                            </p>
                        )}
                    </Link>
                ))}
            </div>

            {/* Filter drawer */}
            {showFilters && (
                <div
                    className="fixed inset-0 bg-black/70 z-50 flex items-end"
                    onClick={() => setShowFilters(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-zinc-950 border-t-2 border-yellow-500 w-full max-w-md mx-auto p-6 pb-8 slide-down space-y-4"
                        data-testid="filters-drawer"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-heading font-black uppercase text-2xl tracking-tight">Filter</h2>
                            <button onClick={() => setShowFilters(false)} className="w-10 h-10 text-zinc-500">
                                <X size={22} />
                            </button>
                        </div>

                        <input
                            placeholder="No. DO/SO"
                            value={filters.no_do}
                            onChange={(e) => setFilters({ ...filters, no_do: e.target.value.toUpperCase() })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-12 px-4 font-mono-num uppercase rounded-none outline-none"
                            data-testid="filter-nodo"
                        />
                        <input
                            placeholder="Tujuan / Buyer"
                            value={filters.tujuan}
                            onChange={(e) => setFilters({ ...filters, tujuan: e.target.value })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-12 px-4 rounded-none outline-none uppercase"
                            data-testid="filter-tujuan"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-1">
                                    Dari
                                </label>
                                <input
                                    type="date"
                                    value={filters.tanggal_from}
                                    onChange={(e) => setFilters({ ...filters, tanggal_from: e.target.value })}
                                    className="w-full bg-zinc-900 border-b-2 border-zinc-700 h-12 px-3 font-mono-num text-sm rounded-none outline-none text-white"
                                    data-testid="filter-from"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-1">
                                    Sampai
                                </label>
                                <input
                                    type="date"
                                    value={filters.tanggal_to}
                                    onChange={(e) => setFilters({ ...filters, tanggal_to: e.target.value })}
                                    className="w-full bg-zinc-900 border-b-2 border-zinc-700 h-12 px-3 font-mono-num text-sm rounded-none outline-none text-white"
                                    data-testid="filter-to"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-2">
                                Jenis
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {["", "LOKAL", "EKSPOR"].map((j) => (
                                    <button
                                        key={j || "all"}
                                        onClick={() => setFilters({ ...filters, jenis_pemuatan: j })}
                                        className={`h-11 border font-bold uppercase text-xs rounded-sm ${
                                            filters.jenis_pemuatan === j
                                                ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                                                : "border-zinc-800 bg-zinc-900 text-zinc-400"
                                        }`}
                                    >
                                        {j || "Semua"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-2">
                                Status Kelengkapan
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { v: "", l: "Semua" },
                                    { v: "lengkap", l: "Lengkap" },
                                    { v: "belum_lengkap", l: "Belum" },
                                ].map((o) => (
                                    <button
                                        key={o.v || "all"}
                                        onClick={() => setFilters({ ...filters, status_kelengkapan: o.v })}
                                        className={`h-11 border font-bold uppercase text-xs rounded-sm ${
                                            filters.status_kelengkapan === o.v
                                                ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                                                : "border-zinc-800 bg-zinc-900 text-zinc-400"
                                        }`}
                                    >
                                        {o.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={reset}
                                className="flex-1 h-12 border border-zinc-700 text-zinc-300 font-bold uppercase text-xs rounded-sm hover:border-white"
                                data-testid="filter-reset"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => {
                                    load();
                                    setShowFilters(false);
                                }}
                                className="flex-1 h-12 bg-yellow-500 text-zinc-950 font-black uppercase text-xs rounded-sm hover:bg-yellow-400"
                                data-testid="filter-apply"
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
