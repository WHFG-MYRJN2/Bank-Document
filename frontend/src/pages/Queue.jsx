import { useEffect, useState } from "react";
import { api, formatErr } from "../lib/api";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

export default function Queue() {
    const { user } = useAuth();
    const nav = useNavigate();
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ nopol: "", no_container: "", tujuan: "", jenis_pemuatan: "LOKAL" });

    async function load() {
        try {
            const { data } = await api.get("/queue");
            setItems(data);
        } catch (e) {
            toast.error(formatErr(e));
        }
    }
    useEffect(() => {
        load();
    }, []);

    async function save(e) {
        e.preventDefault();
        try {
            await api.post("/queue", form);
            toast.success("Antrian ditambahkan");
            setShowForm(false);
            setForm({ nopol: "", no_container: "", tujuan: "", jenis_pemuatan: "LOKAL" });
            load();
        } catch (err) {
            toast.error(formatErr(err));
        }
    }

    async function del(id) {
        try {
            await api.delete(`/queue/${id}`);
            load();
        } catch (e) {
            toast.error(formatErr(e));
        }
    }

    function startTruck(item) {
        // preload data to input page via query string
        const q = new URLSearchParams({
            nopol: item.nopol,
            no_container: item.no_container || "",
            tujuan: item.tujuan,
            jenis_pemuatan: item.jenis_pemuatan,
            queue_id: item.id,
        }).toString();
        nav(`/new?${q}`);
    }

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <PageHeader
                title="Antrian Truk"
                subtitle="Pre-input rencana kedatangan"
                back={false}
                right={
                    <button
                        onClick={() => setShowForm(true)}
                        className="h-10 px-3 bg-yellow-500 text-zinc-950 font-bold uppercase text-xs tracking-wider rounded-sm hover:bg-yellow-400 flex items-center gap-1"
                        data-testid="add-queue-btn"
                    >
                        <Plus size={16} /> Tambah
                    </button>
                }
            />

            <div className="max-w-md mx-auto px-4 pt-4 pb-8 relative z-10 space-y-2" data-testid="queue-list">
                {items.length === 0 && (
                    <div className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-sm text-center">
                        <p className="text-zinc-500 text-sm">Belum ada truk di antrian.</p>
                    </div>
                )}
                {items.map((q) => (
                    <div
                        key={q.id}
                        className={`border p-4 rounded-sm ${q.status === "diproses" ? "border-zinc-800 bg-zinc-900/50 opacity-60" : "border-zinc-800 bg-zinc-900 hover:border-yellow-500/50"}`}
                        data-testid={`queue-item-${q.nopol}`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="font-heading font-black text-2xl uppercase tracking-tight font-mono-num">
                                    {q.nopol}
                                </p>
                                {q.no_container && (
                                    <p className="text-xs font-mono-num text-zinc-500 mt-0.5">
                                        {q.no_container}
                                    </p>
                                )}
                            </div>
                            <span
                                className={`px-2 py-1 border text-[10px] uppercase font-bold rounded-sm ${
                                    q.jenis_pemuatan === "EKSPOR"
                                        ? "border-orange-500/40 text-orange-400 bg-orange-500/10"
                                        : "border-blue-500/40 text-blue-400 bg-blue-500/10"
                                }`}
                            >
                                {q.jenis_pemuatan}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-300 mb-3 uppercase font-medium">
                            {q.tujuan}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                            {q.status === "diproses" ? (
                                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                    Sudah Diproses
                                </span>
                            ) : (
                                <button
                                    onClick={() => startTruck(q)}
                                    className="flex-1 h-11 bg-yellow-500 text-zinc-950 font-bold uppercase text-xs tracking-wider rounded-sm hover:bg-yellow-400"
                                    data-testid={`start-truck-${q.nopol}`}
                                >
                                    Mulai Muat
                                </button>
                            )}
                            {user?.role === "admin" && (
                                <button
                                    onClick={() => del(q.id)}
                                    className="w-11 h-11 border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 rounded-sm flex items-center justify-center"
                                    data-testid={`delete-queue-${q.nopol}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div
                    className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
                    onClick={() => setShowForm(false)}
                >
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={save}
                        className="bg-zinc-950 border-t-2 border-yellow-500 w-full max-w-md p-6 pb-8 slide-down"
                        data-testid="queue-form"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-heading font-black uppercase text-2xl tracking-tight">
                                Tambah Antrian
                            </h2>
                            <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 text-zinc-500">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                                    No. Polisi
                                </label>
                                <input
                                    required
                                    value={form.nopol}
                                    onChange={(e) => setForm({ ...form, nopol: e.target.value.toUpperCase() })}
                                    className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-lg font-mono-num rounded-none outline-none"
                                    placeholder="B1234ABC"
                                    data-testid="queue-form-nopol"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                                    No. Container (opsional)
                                </label>
                                <input
                                    value={form.no_container}
                                    onChange={(e) => setForm({ ...form, no_container: e.target.value.toUpperCase() })}
                                    className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-lg font-mono-num rounded-none outline-none"
                                    placeholder="TCLU1234567"
                                    data-testid="queue-form-container"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                                    Tujuan / Buyer
                                </label>
                                <input
                                    required
                                    value={form.tujuan}
                                    onChange={(e) => setForm({ ...form, tujuan: e.target.value })}
                                    className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-base rounded-none outline-none uppercase"
                                    placeholder="PT MAJU JAYA"
                                    data-testid="queue-form-tujuan"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
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
                                            data-testid={`queue-jenis-${j}`}
                                        >
                                            {j}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-yellow-500 text-zinc-950 font-black uppercase tracking-wider h-14 rounded-sm hover:bg-yellow-400 active:scale-[0.98]"
                                data-testid="queue-form-save"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
