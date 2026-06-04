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

export const getHistory = async () => {
  const response = await api.get(
    "/claims/history"
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

export default api;