import { Loader2, Truck as TruckIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { formatErr } from "../lib/api";
import { toast } from "sonner";

export default function Login() {
    const { user, ready, login } = useAuth();
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    if (ready && user) return <Navigate to="/dashboard" replace />;

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await login(username.trim().toLowerCase(), password);
            toast.success("Login berhasil");
            nav("/dashboard");
        } catch (err) {
            toast.error(formatErr(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col grain">
            <div className="flex-1 max-w-md w-full mx-auto flex flex-col px-6 pt-16 pb-8 relative z-10">
                <div className="mb-16">
                    <div className="w-16 h-16 bg-yellow-500 text-zinc-950 flex items-center justify-center rounded-sm mb-6">
                        <TruckIcon size={32} strokeWidth={2.5} />
                    </div>
                    <h1 className="font-heading font-black text-5xl uppercase tracking-tight leading-[0.9]">
                        ARSIP<br />
                        <span className="text-yellow-500">PEMUATAN</span><br />
                        TRUK
                    </h1>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold mt-4">
                        Arsip Digital Gudang · v1.0
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6" data-testid="login-form">
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                            Username
                        </label>
                        <input
                            data-testid="login-username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-lg font-mono-num placeholder:text-zinc-600 rounded-none outline-none"
                            placeholder="admin"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500 block mb-2">
                            Password
                        </label>
                        <input
                            data-testid="login-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900 border-b-2 border-zinc-700 focus:border-yellow-500 h-14 px-4 text-lg font-mono-num placeholder:text-zinc-600 rounded-none outline-none"
                            placeholder="••••••"
                            required
                        />
                    </div>
                    <button
                        data-testid="login-submit"
                        type="submit"
                        disabled={loading}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-zinc-950 font-black uppercase tracking-wider h-14 flex items-center justify-center rounded-sm active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Masuk"}
                    </button>
                </form>

                <div className="mt-auto pt-12">
                    <div className="border border-zinc-800 bg-zinc-900/50 p-4 rounded-sm">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                            Demo Akses
                        </p>
                        <p className="text-xs text-zinc-400 font-mono-num">admin / admin123</p>
                        <p className="text-xs text-zinc-400 font-mono-num">operator / operator123</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
