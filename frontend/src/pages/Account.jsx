import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { api, formatErr } from "../lib/api";
import { Link } from "react-router-dom";
import { LogOut, Trash2, Plus, X, Archive, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

export default function Account() {
    const { user, logout } = useAuth();
    const [users, setUsers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: "", name: "", password: "", role: "operator" });

    async function load() {
        if (user?.role !== "admin") return;
        try {
            const { data } = await api.get("/users");
            setUsers(data);
        } catch {}
    }
    useEffect(() => {
        load();
    }, [user]);

    async function createUser(e) {
        e.preventDefault();
        try {
            await api.post("/users", form);
            toast.success("User dibuat");
            setShowForm(false);
            setForm({ username: "", name: "", password: "", role: "operator" });
            load();
        } catch (err) {
            toast.error(formatErr(err));
        }
    }

    async function deleteUser(id) {
        if (!confirm("Hapus user ini?")) return;
        try {
            await api.delete(`/users/${id}`);
            load();
        } catch (e) {
            toast.error(formatErr(e));
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 pb-safe grain">
            <PageHeader title="Akun" back={false} />

            <div className="max-w-md mx-auto px-4 pt-4 pb-8 space-y-4 relative z-10">
                <div className="border border-zinc-800 bg-zinc-900 p-6 rounded-sm">
                    <div className="w-14 h-14 bg-yellow-500 text-zinc-950 rounded-sm flex items-center justify-center mb-3">
                        <ShieldCheck size={28} strokeWidth={2.5} />
                    </div>
                    <p className="font-heading font-black text-2xl uppercase">{user?.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-500 font-bold mt-1">
                        {user?.role} · {user?.username}
                    </p>
                </div>

                <Link
                    to="/retention"
                    className="flex items-center gap-3 border border-zinc-800 bg-zinc-900 p-4 rounded-sm hover:border-yellow-500/50"
                    data-testid="link-retention"
                >
                    <Archive size={22} className="text-red-500" />
                    <div className="flex-1">
                        <p className="font-bold uppercase text-sm tracking-wider">Arsip Retensi</p>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                            Data lewat 2 tahun
                        </p>
                    </div>
                </Link>

                {user?.role === "admin" && (
                    <div className="border border-zinc-800 bg-zinc-900 rounded-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-heading font-bold uppercase text-sm tracking-widest text-zinc-300 flex items-center gap-2">
                                <Users size={16} /> User ({users.length})
                            </h2>
                            <button
                                onClick={() => setShowForm(true)}
                                className="h-9 px-3 bg-yellow-500 text-zinc-950 font-bold uppercase text-xs rounded-sm hover:bg-yellow-400 flex items-center gap-1"
                                data-testid="add-user-btn"
                            >
                                <Plus size={14} /> Tambah
                            </button>
                        </div>
                        <div className="space-y-2" data-testid="user-list">
                            {users.map((u) => (
                                <div
                                    key={u.id}
                                    className="flex items-center justify-between border border-zinc-800 bg-zinc-950 p-3 rounded-sm"
                                    data-testid={`user-${u.username}`}
                                >
                                    <div>
                                        <p className="font-bold">{u.name}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                                            {u.username} · {u.role}
                                        </p>
                                    </div>
                                    {u.id !== user.id && (
                                        <button
                                            onClick={() => deleteUser(u.id)}
                                            className="w-9 h-9 border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 rounded-sm flex items-center justify-center"
                                            data-testid={`delete-user-${u.username}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={logout}
                    className="w-full h-14 border border-red-500/40 bg-red-500/5 text-red-500 font-black uppercase tracking-wider rounded-sm hover:bg-red-500/10 flex items-center justify-center gap-2"
                    data-testid="account-logout"
                >
                    <LogOut size={18} /> Keluar
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowForm(false)}>
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={createUser}
                        className="bg-zinc-950 border-t-2 border-yellow-500 w-full max-w-md mx-auto p-6 pb-8 slide-down space-y-4"
                        data-testid="user-form"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-heading font-black uppercase text-2xl">Tambah User</h2>
                            <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 text-zinc-500">
                                <X size={22} />
                            </button>
                        </div>
                        <input
                            required
                            placeholder="Username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-12 px-4 font-mono-num rounded-none outline-none"
                            data-testid="user-form-username"
                        />
                        <input
                            required
                            placeholder="Nama Lengkap"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-12 px-4 rounded-none outline-none"
                            data-testid="user-form-name"
                        />
                        <input
                            required
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-12 px-4 font-mono-num rounded-none outline-none"
                            data-testid="user-form-password"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            {["operator", "admin"].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setForm({ ...form, role: r })}
                                    className={`h-12 border-2 font-bold uppercase text-sm rounded-sm ${
                                        form.role === r
                                            ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                                            : "border-zinc-800 bg-zinc-900 text-zinc-400"
                                    }`}
                                    data-testid={`user-form-role-${r}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <button
                            type="submit"
                            className="w-full h-14 bg-yellow-500 text-zinc-950 font-black uppercase tracking-wider rounded-sm hover:bg-yellow-400"
                            data-testid="user-form-save"
                        >
                            Simpan
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
