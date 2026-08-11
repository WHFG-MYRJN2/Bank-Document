import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api, formatErr, API } from "../lib/api";
import { CATEGORIES, CATEGORY_MAP } from "../lib/categories";
import { compressImage } from "../lib/imageCompress";
import { Camera, Check, WifiOff, X, Loader2, ImagePlus, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function SessionMode() {
    const { truckId } = useParams();
    const nav = useNavigate();
    const fileInput = useRef(null);
    const galleryInput = useRef(null);

    const [truck, setTruck] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [kategori, setKategori] = useState("surat_jalan");
    const [uploads, setUploads] = useState([]); // {tempId, kategori, progress, status, url}
    const [online, setOnline] = useState(navigator.onLine);

    async function load() {
        try {
            const { data } = await api.get(`/trucks/${truckId}`);
            setTruck(data.truck);
            setPhotos(data.photos);
        } catch (e) {
            toast.error(formatErr(e));
        }
    }

    useEffect(() => {
        load();
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, [truckId]);

    const counts = useMemo(() => {
        const c = { total: 0 };
        for (const cat of CATEGORIES) c[cat.key] = 0;
        for (const p of photos) {
            c[p.kategori] = (c[p.kategori] || 0) + 1;
            c.total++;
        }
        return c;
    }, [photos]);

    const status = useMemo(() => {
        const missing = CATEGORIES.filter((c) => c.required && (counts[c.key] || 0) < 1);
        return { complete: missing.length === 0, missing };
    }, [counts]);

    async function handleFiles(files) {
        const arr = Array.from(files);
        for (const raw of arr) {
            const tempId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const previewUrl = URL.createObjectURL(raw);
            setUploads((u) => [...u, { tempId, kategori, progress: 0, status: "compressing", previewUrl }]);
            try {
                const compressed = await compressImage(raw);
                setUploads((u) =>
                    u.map((x) => (x.tempId === tempId ? { ...x, status: "uploading" } : x)),
                );
                const fd = new FormData();
                fd.append("kategori", kategori);
                fd.append("file", compressed, compressed.name || `${kategori}_${Date.now()}.jpg`);
                await api.post(`/trucks/${truckId}/photos`, fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (e) => {
                        if (e.total) {
                            const pct = Math.round((e.loaded / e.total) * 100);
                            setUploads((u) =>
                                u.map((x) => (x.tempId === tempId ? { ...x, progress: pct } : x)),
                            );
                        }
                    },
                });
                setUploads((u) => u.filter((x) => x.tempId !== tempId));
                load();
            } catch (err) {
                setUploads((u) =>
                    u.map((x) => (x.tempId === tempId ? { ...x, status: "failed" } : x)),
                );
                toast.error(`Upload gagal: ${formatErr(err)}`);
            }
        }
    }

    async function deletePhoto(id) {
        if (!confirm("Hapus foto ini?")) return;
        try {
            await api.delete(`/photos/${id}`);
            load();
        } catch (e) {
            toast.error(formatErr(e));
        }
    }

    function photoUrl(id) {
        const t = localStorage.getItem("access_token");
        return `${API}/photos/${id}/file${t ? `?auth=${t}` : ""}`;
    }

    if (!truck)
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-yellow-500" />
            </div>
        );

    return (
        <div className="min-h-screen bg-zinc-950 pb-[160px] grain">
            {/* Session header banner */}
            <header className="sticky top-0 z-30 bg-zinc-950 border-b border-yellow-500/40">
                <div className="max-w-md mx-auto px-4 pt-3 pb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/40 px-2 py-1 rounded-sm">
                            ● MODE SESI AKTIF
                        </span>
                        {!online && (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-red-500">
                                <WifiOff size={12} /> Offline
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline justify-between">
                        <div>
                            <h1 className="font-heading font-black uppercase text-2xl tracking-tight font-mono-num">
                                {truck.nopol}
                            </h1>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                {truck.jenis_pemuatan} · {truck.tanggal_pemuatan} · {truck.tujuan}
                            </p>
                        </div>
                        <p className="font-heading font-black text-3xl text-yellow-500 font-mono-num">
                            {counts.total}
                        </p>
                    </div>
                </div>

                {/* Category chips - horizontal scroll */}
                <div className="overflow-x-auto scrollbar-none border-t border-zinc-800">
                    <div className="max-w-md mx-auto flex gap-2 px-4 py-3 min-w-max">
                        {CATEGORIES.map((c) => {
                            const cnt = counts[c.key] || 0;
                            const active = kategori === c.key;
                            const ok = cnt > 0;
                            return (
                                <button
                                    key={c.key}
                                    onClick={() => setKategori(c.key)}
                                    data-testid={`chip-${c.key}`}
                                    className={`chip flex items-center gap-2 px-4 h-11 border rounded-full whitespace-nowrap font-bold text-xs uppercase ${
                                        active
                                            ? "border-yellow-500 text-yellow-500 bg-yellow-500/10 chip-active"
                                            : "border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-600"
                                    }`}
                                >
                                    <span>{c.label}</span>
                                    <span
                                        className={`min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-mono-num ${
                                            ok
                                                ? "bg-green-500 text-zinc-950"
                                                : c.required
                                                    ? "bg-red-500 text-white"
                                                    : "bg-zinc-800 text-zinc-500"
                                        }`}
                                    >
                                        {cnt}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <div className="max-w-md mx-auto px-4 pt-6 relative z-10">
                {/* Camera huge button */}
                <div className="flex flex-col items-center justify-center py-8">
                    <button
                        onClick={() => fileInput.current?.click()}
                        data-testid="camera-btn"
                        className="w-28 h-28 bg-yellow-500 text-zinc-950 rounded-full flex items-center justify-center border-4 border-zinc-950 ring-4 ring-yellow-500 shadow-[0_0_24px_rgba(234,179,8,0.4)] active:scale-90 pulse-ring"
                        aria-label="Ambil foto"
                    >
                        <Camera size={44} strokeWidth={2.5} />
                    </button>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400 mt-4">
                        Ambil foto → <span className="text-yellow-500">{CATEGORY_MAP[kategori]}</span>
                    </p>
                    <button
                        onClick={() => galleryInput.current?.click()}
                        className="mt-4 text-xs uppercase tracking-widest font-bold text-zinc-500 hover:text-white flex items-center gap-1"
                        data-testid="gallery-btn"
                    >
                        <ImagePlus size={14} /> atau dari galeri
                    </button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) handleFiles(e.target.files);
                            e.target.value = "";
                        }}
                        data-testid="camera-input"
                    />
                    <input
                        ref={galleryInput}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) handleFiles(e.target.files);
                            e.target.value = "";
                        }}
                        data-testid="gallery-input"
                    />
                </div>

                {/* In-progress uploads */}
                {uploads.length > 0 && (
                    <div className="mb-4 space-y-2" data-testid="upload-progress-list">
                        {uploads.map((u) => (
                            <div key={u.tempId} className="border border-zinc-800 bg-zinc-900 p-3 rounded-sm flex items-center gap-3">
                                <img src={u.previewUrl} alt="" className="w-12 h-12 object-cover rounded-sm" />
                                <div className="flex-1">
                                    <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold">
                                        {CATEGORY_MAP[u.kategori]} · {u.status === "compressing" ? "Kompres..." : u.status === "failed" ? "Gagal" : `${u.progress}%`}
                                    </p>
                                    <div className="h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className={`h-full ${u.status === "failed" ? "bg-red-500" : "bg-yellow-500"}`}
                                            style={{ width: `${u.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid of uploaded photos for current category */}
                <h2 className="font-heading font-bold uppercase text-sm text-zinc-400 tracking-widest mb-3">
                    {CATEGORY_MAP[kategori]} ({counts[kategori] || 0})
                </h2>
                <div className="grid grid-cols-3 gap-2" data-testid="photo-grid">
                    {photos
                        .filter((p) => p.kategori === kategori)
                        .map((p) => (
                            <div key={p.id} className="relative aspect-square bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden group">
                                <img src={photoUrl(p.id)} alt="" loading="lazy" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => deletePhoto(p.id)}
                                    className="absolute top-1 right-1 w-7 h-7 bg-zinc-950/80 text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    data-testid={`delete-photo-${p.id}`}
                                >
                                    <X size={14} />
                                </button>
                                <span className="absolute bottom-1 left-1 text-[9px] font-mono-num text-white bg-black/60 px-1 rounded">
                                    #{p.urutan}
                                </span>
                            </div>
                        ))}
                    {(counts[kategori] || 0) === 0 && (
                        <p className="col-span-3 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold py-6">
                            Belum ada foto
                        </p>
                    )}
                </div>

                {!status.complete && (
                    <div className="mt-6 border border-yellow-500/40 bg-yellow-500/5 p-3 rounded-sm">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-500 mb-1">
                            Belum lengkap - butuh minimal 1 foto:
                        </p>
                        <p className="text-sm font-medium">
                            {status.missing.map((m) => m.label).join(", ")}
                        </p>
                    </div>
                )}
            </div>

            {/* Sticky finish button */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800 p-4">
                <div className="max-w-md mx-auto flex gap-2">
                    <Link
                        to={`/trucks/${truckId}`}
                        className="h-14 px-4 border border-zinc-700 text-white font-bold uppercase text-xs tracking-wider rounded-sm flex items-center hover:border-yellow-500"
                        data-testid="view-detail-btn"
                    >
                        Detail
                    </Link>
                    <button
                        onClick={() => {
                            toast.success(`Selesai — ${truck.nopol} disimpan (${counts.total} foto)`);
                            nav("/history");
                        }}
                        data-testid="finish-btn"
                        className={`flex-1 h-14 font-black uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 active:scale-[0.98] ${
                            status.complete
                                ? "bg-green-500 text-zinc-950 hover:bg-green-400"
                                : "bg-yellow-500 text-zinc-950 hover:bg-yellow-400"
                        }`}
                    >
                        {status.complete ? <Check size={20} /> : null}
                        Selesai · Truk Berikutnya
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
