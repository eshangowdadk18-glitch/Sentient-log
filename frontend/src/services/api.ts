import axios from "axios";
import {
  QueryRequest,
  QueryResponse,
  HealthStatus,
  LogEntry,
  IngestPayload,
} from "../types";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || "");
    const isAuthEndpoint =
      requestUrl.includes("/api/v1/auth/login") ||
      requestUrl.includes("/api/v1/auth/register") ||
      requestUrl.includes("/api/v1/auth/refresh");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          "/api/v1/auth/refresh",
          {},
          {
            withCredentials: true,
          },
        );

        const { access_token } = response.data;

        const userResponse = await axios.get("/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${access_token}` },
          withCredentials: true,
        });

        useAuthStore.getState().setAuth(userResponse.data, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const api = {
  health: async (): Promise<HealthStatus> => {
    const response = await apiClient.get("/health");
    return response.data;
  },

  ready: async (): Promise<HealthStatus> => {
    const response = await apiClient.get("/ready");
    return response.data;
  },

  query: async (request: QueryRequest): Promise<QueryResponse> => {
    const response = await apiClient.post("/api/v1/query", request);
    return response.data;
  },

  recentLogs: async (): Promise<{ results: LogEntry[] }> => {
    const response = await apiClient.get("/api/v1/logs/recent");
    return response.data;
  },

  ingestLogs: async (payload: IngestPayload) => {
    const response = await apiClient.post("/api/v1/ingest", payload);
    return response.data;
  },

  login: async (credentials: any) => {
    const response = await apiClient.post("/api/v1/auth/login", credentials);
    return response.data;
  },

  register: async (credentials: any) => {
    const response = await apiClient.post("/api/v1/auth/register", credentials);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post("/api/v1/auth/logout");
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get("/api/v1/auth/me");
    return response.data;
  },
};
