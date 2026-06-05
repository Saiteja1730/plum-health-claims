"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getProviders, toggleProviderBlacklist, addProvider, editProvider, deactivateProvider } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Provider forms
  const [addForm, setAddForm] = useState({
    doctor_registration: "",
    doctor_name: "",
    hospital_name: "",
    specialization: "General Medicine",
    blacklisted: false,
    network_provider: false,
    active: true,
  });

  const [editForm, setEditForm] = useState({
    doctor_registration: "",
    doctor_name: "",
    hospital_name: "",
    specialization: "General Medicine",
    blacklisted: false,
    network_provider: false,
    active: true,
  });

  const [formError, setFormError] = useState<string | null>(null);

  const loadProviders = () => {
    setLoading(true);
    getProviders()
      .then((res) => {
        const backendList = res.providers || [];
        setProviders(backendList);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch medical providers from the backend database.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleToggleBlacklist = async (registration: string) => {
    setActionLoading(registration);
    try {
      await toggleProviderBlacklist(registration);
      loadProviders();
    } catch (err) {
      console.error("Failed to toggle blacklist:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (registration: string) => {
    setActionLoading(registration);
    try {
      await deactivateProvider(registration);
      loadProviders();
    } catch (err) {
      console.error("Failed to toggle active status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!addForm.doctor_registration || !addForm.doctor_name || !addForm.hospital_name) {
      setFormError("Registration number, doctor name, and hospital center are required fields.");
      return;
    }
    try {
      const res = await addProvider(addForm);
      if (res.status === "error") {
        setFormError(res.message);
        return;
      }
      setShowAddModal(false);
      setAddForm({
        doctor_registration: "",
        doctor_name: "",
        hospital_name: "",
        specialization: "General Medicine",
        blacklisted: false,
        network_provider: false,
        active: true,
      });
      loadProviders();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Failed to create new provider.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!editForm.doctor_name || !editForm.hospital_name) {
      setFormError("Doctor name and hospital center are required fields.");
      return;
    }
    try {
      const res = await editProvider(editForm);
      if (res.status === "error") {
        setFormError(res.message);
        return;
      }
      setShowEditModal(false);
      loadProviders();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Failed to update provider.");
    }
  };

  const filtered = providers.filter((p) => {
    const matchesSearch =
      (p.doctor_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.hospital_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.doctor_registration || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.specialization || "").toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "BLACKLISTED") return matchesSearch && p.blacklisted;
    if (statusFilter === "NETWORK") return matchesSearch && p.network_provider;
    if (statusFilter === "ACTIVE") return matchesSearch && p.active !== false;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Provider Network Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Live directory tracking doctor credentials, blacklist registries, and cashless network hospitals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Provider
          </button>
          <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono">
            {providers.length} providers registered
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search doctor, hospital, registration or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 placeholder-slate-400"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "NETWORK", "ACTIVE", "BLACKLISTED"].map((f) => (
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
                <th className="p-4.5">Specialization</th>
                <th className="p-4.5">Network Tier</th>
                <th className="p-4.5">Active Status</th>
                <th className="p-4.5">Blacklisted</th>
                <th className="p-4.5 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filtered.length > 0 ? (
                filtered.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/40 text-slate-700 transition">
                    <td className="p-4.5 pl-6 font-bold text-slate-900">{p.doctor_name || "Unknown"}</td>
                    <td className="p-4.5">{p.hospital_name || "Unknown"}</td>
                    <td className="p-4.5 font-mono">{p.doctor_registration}</td>
                    <td className="p-4.5 capitalize">{p.specialization}</td>
                    <td className="p-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.network_provider
                          ? "bg-teal-50 text-teal-700 border-teal-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {p.network_provider ? "Network Partner" : "Non-Network"}
                      </span>
                    </td>
                    <td className="p-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.active !== false
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      }`}>
                        {p.active !== false ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-4.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.blacklisted
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {p.blacklisted ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="p-4.5 pr-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setFormError(null);
                            setEditForm({
                              doctor_registration: p.doctor_registration,
                              doctor_name: p.doctor_name || "",
                              hospital_name: p.hospital_name || "",
                              specialization: p.specialization || "General Medicine",
                              blacklisted: p.blacklisted || false,
                              network_provider: p.network_provider || false,
                              active: p.active !== false,
                            });
                            setShowEditModal(true);
                          }}
                          className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 shadow-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(p.doctor_registration)}
                          disabled={actionLoading === p.doctor_registration}
                          className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                            p.active !== false
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {p.active !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleToggleBlacklist(p.doctor_registration)}
                          disabled={actionLoading === p.doctor_registration}
                          className={`px-2.5 py-1 rounded border text-[10px] font-bold transition ${
                            p.blacklisted
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {p.blacklisted ? "Unblacklist" : "Blacklist"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-slate-400 font-medium">
                    No matching providers found in registration directories.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Provider</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Register a new medical practitioner</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {formError && <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg">{formError}</div>}

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registration No. (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. KA/45678/2015"
                  value={addForm.doctor_registration}
                  onChange={(e) => setAddForm({ ...addForm, doctor_registration: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doctor Name (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={addForm.doctor_name}
                  onChange={(e) => setAddForm({ ...addForm, doctor_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hospital / Clinic Center (Required)</label>
                <input
                  type="text"
                  placeholder="e.g. Max Healthcare"
                  value={addForm.hospital_name}
                  onChange={(e) => setAddForm({ ...addForm, hospital_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specialization</label>
                <input
                  type="text"
                  value={addForm.specialization}
                  onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={addForm.network_provider}
                    onChange={(e) => setAddForm({ ...addForm, network_provider: e.target.checked })}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                  />
                  <span>Network Provider</span>
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={addForm.blacklisted}
                    onChange={(e) => setAddForm({ ...addForm, blacklisted: e.target.checked })}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded"
                  />
                  <span>Blacklisted</span>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  Create Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Provider</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Modify provider details for {editForm.doctor_registration}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {formError && <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg">{formError}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registration No. (Locked)</label>
                <input
                  type="text"
                  disabled
                  value={editForm.doctor_registration}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-400 rounded-lg px-3 py-1.5 cursor-not-allowed font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doctor Name (Required)</label>
                <input
                  type="text"
                  value={editForm.doctor_name}
                  onChange={(e) => setEditForm({ ...editForm, doctor_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hospital / Clinic Center (Required)</label>
                <input
                  type="text"
                  value={editForm.hospital_name}
                  onChange={(e) => setEditForm({ ...editForm, hospital_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specialization</label>
                <input
                  type="text"
                  value={editForm.specialization}
                  onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.network_provider}
                    onChange={(e) => setEditForm({ ...editForm, network_provider: e.target.checked })}
                    className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                  />
                  <span>Network Provider</span>
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.blacklisted}
                    onChange={(e) => setEditForm({ ...editForm, blacklisted: e.target.checked })}
                    className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded"
                  />
                  <span>Blacklisted</span>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
