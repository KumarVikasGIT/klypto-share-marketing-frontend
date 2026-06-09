import axios from "axios";
import { getToken } from "../pages/auth/protected";

// 🔹 Create axios instance
const api = axios.create({
  // baseURL: "https://loiteringly-homeliest-breana.ngrok-free.dev",
  baseURL: "http://192.168.1.3:8000", // change to your API
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

  return config;
});

// 🔹 Response Interceptor
api.interceptors.response.use(
  (response) => response?.data,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Something went wrong";
    // console.log("API Error:", error?.response?.data?.message);
    // console.log("API Error Details:", error?.message);

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
