import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

export const getStats = async () => {
  const response = await api.get(
    "/claims/stats"
  );
  return response.data;
};

export const getHistory = async (params?: { search?: string; status?: string }) => {
  const response = await api.get(
    "/claims/history",
    { params }
  );
  return response.data;
};

export const uploadDocument = async (
  file: File
) => {
  const formData = new FormData();
  formData.append(
    "file",
    file
  );

  const response = await api.post(
    "/documents/upload",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data"
      }
    }
  );
  return response.data;
};

export const processClaim = async (
  claimData: any
) => {
  const response = await api.post(
    "/claims/process",
    claimData
  );
  return response.data;
};

export const getPolicy = async () => {
  const response = await api.get("/policy");
  return response.data;
};

export const getProviders = async () => {
  const response = await api.get("/providers");
  return response.data;
};

export const getSystemHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

// Provider management
export const toggleProviderBlacklist = async (registration: string) => {
  const response = await api.put(`/providers/blacklist?registration=${encodeURIComponent(registration)}`);
  return response.data;
};

export const addProvider = async (provider: any) => {
  const response = await api.post("/providers/add", provider);
  return response.data;
};

export const editProvider = async (provider: any) => {
  const response = await api.put("/providers/edit", provider);
  return response.data;
};

export const deactivateProvider = async (registration: string) => {
  const response = await api.put(`/providers/deactivate?registration=${encodeURIComponent(registration)}`);
  return response.data;
};

// Sandbox reset
export const resetSandbox = async () => {
  const response = await api.post("/claims/reset-sandbox");
  return response.data;
};

// Auditor corrections
export const addCorrection = async (claimId: string, correction: {
  field: string;
  old_value: string;
  new_value: string;
  auditor_name?: string;
}) => {
  const response = await api.post(`/claims/${encodeURIComponent(claimId)}/corrections`, correction);
  return response.data;
};

export default api;