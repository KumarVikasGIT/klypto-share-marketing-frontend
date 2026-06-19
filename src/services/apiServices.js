import axios from "axios";
import { getToken } from "../pages/auth/protected";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://192.168.1.7:5000";

// 🔹 Create axios instance
const api = axios.create({
  // baseURL: "https://loiteringly-homeliest-breana.ngrok-free.dev",
  baseURL: API_BASE_URL, // keeps the existing local base as fallback
  // baseURL: "http://localhost:9000", // change to your API

  timeout: 600000, // 1 min
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor (Auth, logging, etc.)
api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (config.url.includes("scanner-dashboard")) {
    console.log(`🚀 [API] Request to ${config.url}`);
    console.log(`🔑 [API] Attached Token:`, token ? "VALID_TOKEN_PRESENT" : "NULL/MISSING_TOKEN");
  }

  return config;
});

// 🔹 Response Interceptor
api.interceptors.response.use(
  (response) => response?.data,
  (error) => {
    if (error?.response?.status === 401) {
      console.warn(
        "Session expired or unauthorized. Logging out automatically.",
      );
      localStorage.removeItem("session");
      sessionStorage.removeItem("session");

      // Use setTimeout to avoid synchronous infinite redirect loops
      setTimeout(() => {
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/signup" &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/login";
        }
      }, 500);
    }

    return Promise.reject(error);
  },
);

// 🔹 API Methods
// const getAuthHeaders = () => {
//   let session = null;

//   try {
//     const raw =
//       localStorage.getItem("session") ||
//       sessionStorage.getItem("session");

//     if (raw) {
//       session = JSON.parse(raw);
//     }
//   } catch (err) {
//     console.error("Invalid session JSON in headers:", err);
//   }

//   const token = session?.token;

//   return {
//     "Content-Type": "application/json",
//     Authorization: token ? `Bearer ${token}` : "",
//   };
// };

// console.log(localStorage.getItem("session"), "tokennnnnnn kkkkkkkkkkkkkkkkkkkkk")

// const apiService = {
//   get: (url, params = {}) =>
//     api.get(url, {
//       headers: getAuthHeaders(),
//       params,
//     }),

//   post: (url, data = {}) =>
//     api.post(url, data, {
//       headers: getAuthHeaders(),
//     }),

//   put: (url, data = {}) =>
//     api.put(url, data, {
//       headers: getAuthHeaders(),
//     }),

//   patch: (url, data = {}) =>
//     api.patch(url, data, {
//       headers: getAuthHeaders(),
//     }),

//   delete: (url) =>
//     api.delete(url, {
//       headers: getAuthHeaders(),
//     }),
// };

const apiService = {
  get: (url, params = {}) => api.get(url, { params }),
  post: (url, data = {}) => api.post(url, data),
  put: (url, data = {}) => api.put(url, data),
  patch: (url, data = {}) => api.patch(url, data),
  delete: (url) => api.delete(url),
};

export default apiService;
