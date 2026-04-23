import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  summary: string;
  updatedAt: string;
  children: ReactNode;
}

export function LegalPageLayout({
  title,
  summary,
  updatedAt,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ThinkDesk
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Legal
          </div>
        </div>

        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/30 md:grid-cols-[1.4fr_0.8fr] md:p-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              {summary}
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Last Updated
            </p>
            <p className="text-lg font-medium text-white">{updatedAt}</p>
            <p className="text-sm leading-6 text-slate-400">
              Questions about these terms can be sent to{" "}
              <a
                className="text-sky-300 transition hover:text-sky-200"
                href="mailto:canbehumanagain@gmail.com"
              >
                canbehumanagain@gmail.com
              </a>
              .
            </p>
          </div>
        </div>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}
