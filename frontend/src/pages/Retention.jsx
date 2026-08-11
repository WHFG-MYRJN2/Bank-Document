import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api, formatErr } from "../lib/api";
import { Archive, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function Retention() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        api.get("/trucks", { params: { ready_to_destroy: true, limit: 500 } })
            .then((r) => setItems(r.data))
            .catch((e) => toast.error(formatErr(e)));
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <PageHeader title="Retensi 2 Tahun" subtitle="Arsip yang bisa dimusnahkan" warn />

            <div className="max-w-md mx-auto px-4 pt-4 relative z-10">
                <div className="border border-red-500/40 bg-red-500/5 warn-stripes p-4 rounded-sm mb-4 flex items-center gap-3">
                    <Archive size={28} className="text-red-500" />
                    <div>
                        <p className="font-heading font-black uppercase text-red-500 text-xl leading-tight">
                            {items.length} Arsip Kedaluwarsa
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                            Tanggal retensi telah lewat, siap diarsipkan ulang / dimusnahkan
                        </p>
                    </div>
                </div>

                {items.length === 0 && (
                    <div className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-sm text-center" data-testid="retention-empty">
                        <p className="text-zinc-500 text-sm">Belum ada arsip yang kedaluwarsa.</p>
                    </div>
                )}
                <div className="space-y-2" data-testid="retention-list">
                    {items.map((t) => (
                        <Link
                            key={t.id}
                            to={`/trucks/${t.id}`}
                            className="flex items-center justify-between border border-zinc-800 bg-zinc-900 p-4 rounded-sm hover:border-red-500/50"
                            data-testid={`retention-${t.nopol}`}
                        >
                            <div>
                                <p className="font-heading font-black text-xl uppercase font-mono-num">
                                    {t.nopol}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                    Muat: {t.tanggal_pemuatan} · Retensi habis {t.retention_date}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-500" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
