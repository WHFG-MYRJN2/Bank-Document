import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PageHeader({ title, subtitle, back = true, right = null, warn = false }) {
    const nav = useNavigate();
    return (
        <header
            className={`sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 ${warn ? "warn-stripes" : ""}`}
            data-testid="page-header"
        >
            <div className="max-w-md mx-auto flex items-center gap-3 px-4 h-16">
                {back && (
                    <button
                        onClick={() => nav(-1)}
                        className="w-10 h-10 -ml-2 flex items-center justify-center text-zinc-400 hover:text-white"
                        data-testid="back-btn"
                        aria-label="Kembali"
                    >
                        <ArrowLeft size={22} />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="font-heading font-black uppercase text-xl tracking-tight leading-none truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mt-1 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
                {right}
            </div>
        </header>
    );
}
