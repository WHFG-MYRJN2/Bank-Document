import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import BottomNav from "@/components/BottomNav";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Queue from "@/pages/Queue";
import TruckInput from "@/pages/TruckInput";
import SessionMode from "@/pages/SessionMode";
import History from "@/pages/History";
import TruckDetail from "@/pages/TruckDetail";
import Retention from "@/pages/Retention";
import Account from "@/pages/Account";

function App() {
    return (
        <div className="App min-h-screen bg-zinc-950 text-white">
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route
                            path="/dashboard"
                            element={
                                <RequireAuth>
                                    <Dashboard />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/queue"
                            element={
                                <RequireAuth>
                                    <Queue />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/new"
                            element={
                                <RequireAuth>
                                    <TruckInput />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/session/:truckId"
                            element={
                                <RequireAuth>
                                    <SessionMode />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/history"
                            element={
                                <RequireAuth>
                                    <History />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/trucks/:truckId"
                            element={
                                <RequireAuth>
                                    <TruckDetail />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/retention"
                            element={
                                <RequireAuth>
                                    <Retention />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/account"
                            element={
                                <RequireAuth>
                                    <Account />
                                </RequireAuth>
                            }
                        />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                    <BottomNav />
                    <Toaster
                        position="top-center"
                        theme="dark"
                        toastOptions={{
                            style: {
                                background: "#18181b",
                                border: "1px solid #3f3f46",
                                color: "#fafafa",
                            },
                        }}
                    />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
