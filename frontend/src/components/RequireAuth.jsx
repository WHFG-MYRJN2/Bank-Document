import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RequireAuth({ children, adminOnly = false }) {
    const { user, ready } = useAuth();
    if (!ready)
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm uppercase tracking-widest">
                Loading...
            </div>
        );
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return children;
}
