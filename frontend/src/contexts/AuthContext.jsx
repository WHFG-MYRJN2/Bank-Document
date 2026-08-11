import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null=loading, false=anon, obj=user
    const [ready, setReady] = useState(false);

    async function refresh() {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch {
            setUser(false);
        } finally {
            setReady(true);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function login(username, password) {
        const { data } = await api.post("/auth/login", { username, password });
        if (data.token) localStorage.setItem("access_token", data.token);
        setUser(data.user);
        return data.user;
    }
    async function logout() {
        try {
            await api.post("/auth/logout");
        } catch {}
        localStorage.removeItem("access_token");
        setUser(false);
    }

    return (
        <AuthCtx.Provider value={{ user, ready, login, logout, refresh }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
