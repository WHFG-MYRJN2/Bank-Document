import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api, formatErr } from "../lib/api";
import { toast } from "sonner";
import { ScanLine, Check, Loader2 } from "lucide-react";

export default function TruckInput() {
    const nav = useNavigate();
    const [params] = useSearchParams();
    const today = new Date().toISOString().slice(0, 10);

    const [form, setForm] = useState({
        nopol: params.get("nopol") || "",
        tanggal_pemuatan: today,
        no_do: "",
        no_container: params.get("no_container") || "",
        nama_supir: "",
        tujuan: params.get("tujuan") || "",
        jenis_pemuatan: params.get("jenis_pemuatan") || "LOKAL",
        queue_id: params.get("queue_id") || null,
    });
    const [autoFilled, setAutoFilled] = useState(!!params.get("queue_id"));
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);

    async function lookupNopol() {
        if (!form.nopol || form.nopol.length < 4) return;
        setChecking(true);
        try {
            const { data } = await api.get(`/queue/lookup/${encodeURIComponent(form.nopol)}`);
            if (data && data.id) {
                setForm((f) => ({
                    ...f,
                    no_container: data.no_container || f.no_container,
                    tujuan: data.tujuan || f.tujuan,
                    jenis_pemuatan: data.jenis_pemuatan || f.jenis_pemuatan,
                    queue_id: data.id,
                }));
                setAutoFilled(true);
                toast.success("Data antrian ditemukan!");
            } else {
                setAutoFilled(false);
            }
        } catch (e) {
            /* silent */
        } finally {
            setChecking(false);
        }
    }

    async function submit(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const { data } = await api.post("/trucks", form);
            toast.success(`Truk ${data.nopol} siap muat. Masuk mode sesi.`);
            nav(`/session/${data.id}`);
        } catch (err) {
            toast.error(formatErr(err));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <PageHeader title="Truk Baru" subtitle="Input data pemuatan" back={false} />

            <form onSubmit={submit} className="max-w-md mx-auto px-4 pt-4 pb-8 space-y-6 relative z-10" data-testid="truck-form">
                <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                        No. Polisi
                    </label>
                    <div className="relative">
                        <input
                            required
                            data-testid="truck-nopol"
                            value={form.nopol}
                            onChange={(e) => {
                                setForm({ ...form, nopol: e.target.value.toUpperCase().replace(/\s/g, "") });
                                setAutoFilled(false);
                            }}
                            onBlur={lookupNopol}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 pl-4 pr-12 text-xl font-black font-mono-num tracking-widest rounded-none outline-none uppercase"
                            placeholder="B1234ABC"
                        />
                        <button
                            type="button"
                            onClick={lookupNopol}
                            className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center text-yellow-500 hover:bg-zinc-800 rounded-sm"
                            aria-label="Scan/lookup"
                            data-testid="truck-lookup-btn"
                        >
                            {checking ? <Loader2 className="animate-spin" size={20} /> : <ScanLine size={22} />}
                        </button>
                    </div>
                    {autoFilled && (
                        <p className="text-xs text-green-500 uppercase tracking-widest font-bold mt-2 flex items-center gap-1">
                            <Check size={14} /> Data diisi otomatis dari antrian
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                            Tanggal
                        </label>
                        <input
                            required
                            type="date"
                            data-testid="truck-tanggal"
                            value={form.tanggal_pemuatan}
                            onChange={(e) => setForm({ ...form, tanggal_pemuatan: e.target.value })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-3 text-sm font-mono-num rounded-none outline-none text-white"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                            No. DO/SO
                        </label>
                        <input
                            data-testid="truck-nodo"
                            value={form.no_do}
                            onChange={(e) => setForm({ ...form, no_do: e.target.value.toUpperCase() })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-3 text-sm font-mono-num rounded-none outline-none uppercase"
                            placeholder="DO-2026-001"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                        Nama Supir
                    </label>
                    <input
                        required
                        data-testid="truck-supir"
                        value={form.nama_supir}
                        onChange={(e) => setForm({ ...form, nama_supir: e.target.value })}
                        className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-base rounded-none outline-none uppercase"
                        placeholder="BUDI SANTOSO"
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                        Tujuan / Buyer
                    </label>
                    <input
                        required
                        data-testid="truck-tujuan"
                        value={form.tujuan}
                        onChange={(e) => setForm({ ...form, tujuan: e.target.value })}
                        className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-base rounded-none outline-none uppercase"
                        placeholder="PT MAJU JAYA"
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                        No. Container (opsional)
                    </label>
                    <input
                        data-testid="truck-container"
                        value={form.no_container}
                        onChange={(e) => setForm({ ...form, no_container: e.target.value.toUpperCase() })}
                        className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-base font-mono-num rounded-none outline-none uppercase"
                        placeholder="TCLU1234567"
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-3">
                        Jenis Pemuatan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {["LOKAL", "EKSPOR"].map((j) => (
                            <button
                                key={j}
                                type="button"
                                onClick={() => setForm({ ...form, jenis_pemuatan: j })}
                                className={`h-14 border-2 font-bold uppercase text-sm rounded-sm ${
                                    form.jenis_pemuatan === j
                                        ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400"
                                }`}
                                data-testid={`truck-jenis-${j}`}
                            >
                                {j}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    data-testid="truck-submit"
                    className="w-full bg-yellow-500 text-zinc-950 font-black uppercase tracking-wider h-14 rounded-sm hover:bg-yellow-400 disabled:opacity-60 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : "Mulai Sesi Upload Foto"}
                </button>
            </form>
        </div>
    );
}
