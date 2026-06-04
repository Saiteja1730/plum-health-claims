"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getSystemHealth } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSystemHealth()
      .then((res) => {
        setHealth(res);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to reach systems health check. Ensure backend is running.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Settings & System Status</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  const details = health?.details || {};

  const getIndicator = (val: string) => {
    if (val === "UP") {
      return (
        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          ONLINE / ACTIVE
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-semibold text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        OFFLINE / DEGRADED
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Settings & Operations Status</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time connection statuses of key dependencies for claims ingestion and verification.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-4">Connection Health Indicators</h3>

        <div className="divide-y divide-slate-100">
          <div className="py-4 flex justify-between items-center text-sm">
            <div>
              <span className="font-bold text-slate-800 block">FastAPI Claims Server</span>
              <p className="text-xs text-slate-400">Main API Gateway</p>
            </div>
            {getIndicator(details.backend)}
          </div>

          <div className="py-4 flex justify-between items-center text-sm">
            <div>
              <span className="font-bold text-slate-800 block">MongoDB Database</span>
              <p className="text-xs text-slate-400">Stores claim logs, members, policies, and providers</p>
            </div>
            {getIndicator(details.mongodb)}
          </div>

          <div className="py-4 flex justify-between items-center text-sm">
            <div>
              <span className="font-bold text-slate-800 block">Groq API Connection</span>
              <p className="text-xs text-slate-400">LLM structured parameter extraction</p>
            </div>
            {getIndicator(details.groq)}
          </div>

          <div className="py-4 flex justify-between items-center text-sm">
            <div>
              <span className="font-bold text-slate-800 block">Llama Vision OCR Processor</span>
              <p className="text-xs text-slate-400">Extracts layout strings from scanned attachments</p>
            </div>
            {getIndicator(details.ocr)}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs text-slate-500 leading-relaxed">
        <h4 className="font-bold text-slate-800">Operational Metadata</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-semibold block text-slate-400">Portal Version</span>
            <span className="text-slate-800 font-bold">{health.version || "1.0.0"}</span>
          </div>
          <div>
            <span className="font-semibold block text-slate-400">Environment Node</span>
            <span className="text-slate-800 font-bold capitalize">{health.environment || "Production"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
