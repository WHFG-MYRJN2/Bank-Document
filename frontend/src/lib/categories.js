export const CATEGORIES = [
    { key: "surat_jalan", label: "Surat Jalan", required: true },
    { key: "foto_kendaraan", label: "Foto Kendaraan", required: true },
    { key: "pengecekan", label: "Pengecekan", required: false },
    { key: "segel", label: "Segel", required: false },
    { key: "muatan", label: "Muatan", required: false },
    { key: "lainnya", label: "Lainnya", required: false },
];

export const CATEGORY_MAP = Object.fromEntries(
    CATEGORIES.map((c) => [c.key, c.label]),
);
