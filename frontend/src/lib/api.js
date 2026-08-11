import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const api = axios.create({
    baseURL: API,
    withCredentials: true,
});

// Attach Bearer token as fallback for cookie-less environments
api.interceptors.request.use((cfg) => {
    const t = localStorage.getItem("access_token");
    if (t && !cfg.headers.Authorization) {
        cfg.headers.Authorization = `Bearer ${t}`;
    }
    return cfg;
});

export function formatErr(err) {
    const d = err?.response?.data?.detail;
    if (!d) return err?.message || "Terjadi kesalahan";
    if (typeof d === "string") return d;
    if (Array.isArray(d))
        return d.map((e) => e?.msg || JSON.stringify(e)).join(", ");
    return JSON.stringify(d);
}
