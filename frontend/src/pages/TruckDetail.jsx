import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { api, formatErr, API } from "../lib/api";
import { CATEGORIES, CATEGORY_MAP } from "../lib/categories";
import { Download, Trash2, Camera, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

export default function TruckDetail() {
    const { truckId } = useParams();
    const { user } = useAuth();
    const nav = useNavigate();
    const [truck, setTruck] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [lightbox, setLightbox] = useState(null); // index
    const [exporting, setExporting] = useState(false);

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
    }, [truckId]);

    const grouped = useMemo(() => {
        const g = {};
        for (const c of CATEGORIES) g[c.key] = [];
        for (const p of photos) (g[p.kategori] ||= []).push(p);
        return g;
    }, [photos]);

    function photoUrl(id) {
        const t = localStorage.getItem("access_token");
        return `${API}/photos/${id}/file${t ? `?auth=${t}` : ""}`;
    }

    async function fetchBlobDataURL(id) {
        const t = localStorage.getItem("access_token");
        const res = await fetch(`${API}/photos/${id}/file?auth=${t}`);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.readAsDataURL(blob);
        });
    }

    async function exportPDF() {
        setExporting(true);
        try {
            const doc = new jsPDF({ unit: "mm", format: "a4" });
            const pw = doc.internal.pageSize.getWidth();
            const ph = doc.internal.pageSize.getHeight();
            const margin = 12;

            // Header page
            doc.setFillColor(9, 9, 11);
            doc.rect(0, 0, pw, 40, "F");
            doc.setTextColor(234, 179, 8);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("ARSIP PEMUATAN TRUK", margin, 18);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.text(truck.nopol, margin, 30);
            doc.setTextColor(161, 161, 170);
            doc.setFontSize(9);
            doc.text(`${truck.jenis_pemuatan} · ${truck.tanggal_pemuatan}`, pw - margin, 30, { align: "right" });

            let y = 50;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            const meta = [
                ["No. Polisi", truck.nopol],
                ["Tanggal Muat", truck.tanggal_pemuatan],
                ["No. DO/SO", truck.no_do || "-"],
                ["No. Container", truck.no_container || "-"],
                ["Nama Supir", truck.nama_supir],
                ["Tujuan/Buyer", truck.tujuan],
                ["Jenis Pemuatan", truck.jenis_pemuatan],
                ["Status", truck.status_kelengkapan === "lengkap" ? "LENGKAP" : "BELUM LENGKAP"],
                ["Total Foto", String(truck.total_photos)],
                ["Retensi Sampai", truck.retention_date],
            ];
            for (const [k, v] of meta) {
                doc.setFont("helvetica", "bold");
                doc.text(k, margin, y);
                doc.setFont("helvetica", "normal");
                doc.text(String(v), margin + 45, y);
                y += 7;
            }

            // Photos per category
            for (const cat of CATEGORIES) {
                const list = grouped[cat.key] || [];
                if (list.length === 0) continue;
                doc.addPage();
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(9, 9, 11);
                doc.text(cat.label.toUpperCase(), margin, 15);
                doc.setDrawColor(234, 179, 8);
                doc.setLineWidth(0.6);
                doc.line(margin, 17, pw - margin, 17);

                const cols = 2;
                const gap = 4;
                const cellW = (pw - margin * 2 - gap) / cols;
                const cellH = cellW * 0.75;
                let yy = 22;
                let idx = 0;
                for (const p of list) {
                    const col = idx % cols;
                    const row = Math.floor(idx / cols);
                    const x = margin + col * (cellW + gap);
                    if (yy + cellH + gap > ph - 15) {
                        doc.addPage();
                        yy = 15;
                        idx = 0;
                        continue;
                    }
                    try {
                        const dataUrl = await fetchBlobDataURL(p.id);
                        doc.addImage(dataUrl, "JPEG", x, yy, cellW, cellH, undefined, "FAST");
                    } catch {
                        doc.rect(x, yy, cellW, cellH);
                    }
                    doc.setFontSize(7);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(80, 80, 80);
                    doc.text(`${p.filename}`, x + 1, yy + cellH + 3);
                    idx++;
                    if (col === cols - 1) yy += cellH + 10;
                }
            }

            doc.save(`${truck.nopol}_${truck.tanggal_pemuatan}.pdf`);
            toast.success("PDF berhasil dibuat");
        } catch (e) {
            toast.error("Gagal export: " + e.message);
        } finally {
            setExporting(false);
        }
    }

    async function delTruck() {
        if (!confirm(`Hapus truk ${truck.nopol}? Semua foto akan hilang.`)) return;
        try {
            await api.delete(`/trucks/${truckId}`);
            toast.success("Truk dihapus");
            nav("/history");
        } catch (e) {
            toast.error(formatErr(e));
        }
    }

    if (!truck)
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-yellow-500" />
            </div>
        );

    const canDelete = user?.role === "admin";

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <PageHeader title={truck.nopol} subtitle={`${truck.jenis_pemuatan} · ${truck.tanggal_pemuatan}`} />

            <div className="max-w-md mx-auto px-4 pt-4 relative z-10">
                {/* Meta */}
                <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Supir</p>
                            <p className="text-white uppercase font-medium">{truck.nama_supir}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">No. DO</p>
                            <p className="text-white uppercase font-mono-num">{truck.no_do || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Container</p>
                            <p className="text-white uppercase font-mono-num">{truck.no_container || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Retensi</p>
                            <p className="text-white uppercase font-mono-num">{truck.retention_date}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Tujuan</p>
                            <p className="text-white uppercase font-medium">{truck.tujuan}</p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {truck.status_kelengkapan === "lengkap" ? (
                                <span className="px-2 py-1 text-[10px] uppercase font-black bg-green-500/10 text-green-500 border border-green-500/30 rounded-sm">
                                    Lengkap
                                </span>
                            ) : (
                                <span className="px-2 py-1 text-[10px] uppercase font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-sm">
                                    Belum Lengkap
                                </span>
                            )}
                            <span className="text-xs font-mono-num text-zinc-500">{truck.total_photos} foto</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <Link
                        to={`/session/${truckId}`}
                        className="h-12 border border-yellow-500 bg-yellow-500/10 text-yellow-500 font-bold uppercase text-xs rounded-sm flex items-center justify-center gap-1"
                        data-testid="continue-session-btn"
                    >
                        <Camera size={14} /> Foto
                    </Link>
                    <button
                        onClick={exportPDF}
                        disabled={exporting}
                        data-testid="export-pdf-btn"
                        className="h-12 border border-zinc-700 hover:border-white font-bold uppercase text-xs rounded-sm flex items-center justify-center gap-1"
                    >
                        {exporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />} PDF
                    </button>
                    {canDelete ? (
                        <button
                            onClick={delTruck}
                            data-testid="delete-truck-btn"
                            className="h-12 border border-zinc-700 hover:border-red-500 hover:text-red-500 text-zinc-400 font-bold uppercase text-xs rounded-sm flex items-center justify-center gap-1"
                        >
                            <Trash2 size={14} /> Hapus
                        </button>
                    ) : (
                        <div className="h-12 border border-zinc-800 text-zinc-700 font-bold uppercase text-xs rounded-sm flex items-center justify-center">
                            Read-Only
                        </div>
                    )}
                </div>

                {/* Categories */}
                {CATEGORIES.map((cat) => {
                    const list = grouped[cat.key] || [];
                    return (
                        <div key={cat.key} className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="font-heading font-bold uppercase text-sm text-zinc-300 tracking-widest">
                                    {cat.label}
                                    {cat.required && list.length === 0 && (
                                        <span className="ml-2 text-[10px] text-red-500 font-black">WAJIB</span>
                                    )}
                                </h2>
                                <span className="text-xs font-mono-num text-zinc-500">{list.length}</span>
                            </div>
                            {list.length === 0 ? (
                                <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold py-4 border border-dashed border-zinc-800 text-center rounded-sm">
                                    Belum ada foto
                                </p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {list.map((p, i) => {
                                        const globalIdx = photos.indexOf(p);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setLightbox(globalIdx)}
                                                className="relative aspect-square bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden hover:border-yellow-500"
                                                data-testid={`gallery-thumb-${p.id}`}
                                            >
                                                <img
                                                    src={photoUrl(p.id)}
                                                    alt=""
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Lightbox */}
            {lightbox !== null && photos[lightbox] && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={() => setLightbox(null)}
                    data-testid="lightbox"
                >
                    <button
                        onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 w-11 h-11 text-white bg-zinc-900 border border-zinc-700 rounded-sm flex items-center justify-center z-10"
                    >
                        <X size={20} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightbox((i) => (i > 0 ? i - 1 : photos.length - 1));
                        }}
                        className="absolute left-2 w-11 h-11 text-white bg-zinc-900/80 border border-zinc-700 rounded-sm flex items-center justify-center z-10"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightbox((i) => (i + 1) % photos.length);
                        }}
                        className="absolute right-2 w-11 h-11 text-white bg-zinc-900/80 border border-zinc-700 rounded-sm flex items-center justify-center z-10"
                    >
                        <ChevronRight size={22} />
                    </button>
                    <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full p-4">
                        <img
                            src={photoUrl(photos[lightbox].id)}
                            alt=""
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                        <p className="text-center text-xs text-zinc-400 font-mono-num mt-2">
                            {photos[lightbox].filename} · {CATEGORY_MAP[photos[lightbox].kategori]}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
