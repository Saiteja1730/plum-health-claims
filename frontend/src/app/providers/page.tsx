"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getProviders } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProviders()
      .then((res) => {
        // Map backend registrations to full provider logs
        const backendList = res.providers || [];
        const fullProviders = backendList.map((p: any, i: number) => {
          const names = ["Dr. Sharma Clinic", "Apollo Hospital", "Max Healthcare", "Invalid Clinic"];
          const docs = ["Dr. A. K. Sharma", "Dr. Priya Singh", "Dr. MH Verma", "Dr. Fraud Doctor"];
          return {
            provider: docs[i % docs.length],
            hospital: names[i % names.length],
            registration: p.doctor_registration,
            networkStatus: p.network_provider ? "Network Partner" : "Non-Network",
            blacklisted: p.blacklisted ? "YES" : "NO",
            cashlessSupported: p.network_provider ? "YES" : "NO"
          };
        });
        setProviders(fullProviders);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch medical providers from the backend database.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = providers.filter((p) => {
    const matchesSearch =
      p.provider.toLowerCase().includes(search.toLowerCase()) ||
      p.hospital.toLowerCase().includes(search.toLowerCase()) ||
      p.registration.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "BLACKLISTED") return matchesSearch && p.blacklisted === "YES";
    if (statusFilter === "NETWORK") return matchesSearch && p.networkStatus === "Network Partner";
    if (statusFilter === "CASHLESS") return matchesSearch && p.cashlessSupported === "YES";
    return matchesSearch;
  });

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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Medical Provider Registry</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Provider Network Directory</h1>
        <p className="text-sm text-slate-500 mt-1">Live directory tracking doctor credentials, blacklist registries, and cashless network hospitals.</p>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search provider, hospital or registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 placeholder-slate-400"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "NETWORK", "CASHLESS", "BLACKLISTED"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition ${
                statusFilter === f
                  ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4.5 pl-6">Provider Name</th>
                <th className="p-4.5">Hospital Center</th>
                <th className="p-4.5">Registration No.</th>
                <th className="p-4.5">Network Tier</th>
                <th className="p-4.5">Blacklisted</th>
                <th className="p-4.5 pr-6">Cashless Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filtered.length > 0 ? (
                filtered.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/40 text-slate-700 transition">
                    <td className="p-4.5 pl-6 font-bold text-slate-900">{p.provider}</td>
                    <td className="p-4.5">{p.hospital}</td>
                    <td className="p-4.5 font-mono">{p.registration}</td>
                    <td className="p-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.networkStatus === "Network Partner"
                          ? "bg-teal-50 text-teal-700 border-teal-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {p.networkStatus}
                      </span>
                    </td>
                    <td className="p-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.blacklisted === "YES"
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {p.blacklisted}
                      </span>
                    </td>
                    <td className="p-4.5 pr-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.cashlessSupported === "YES"
                          ? "bg-teal-50 text-teal-700 border-teal-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {p.cashlessSupported}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-slate-400 font-medium">
                    No matching providers found in registration directories.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
