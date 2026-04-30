import axios from "axios";

const token =
  localStorage.getItem("session") &&
  JSON.parse(localStorage.getItem("session"));
// console.log(localStorage.getItem("session"), "tokennnnnnn kkkkkkkkkkkkkkkkkkkkk")

// 🔹 Create axios instance
const api = axios.create({
  // baseURL: "https://studios-publishers-promising-rosa.trycloudflare.com",
  baseURL: "http://192.168.1.28:9000", // change to your API
  timeout: 500000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor (Auth, logging, etc.)
api.interceptors.request.use(
  (config) => {
    // Example: attach token
    // const token = localStorage.getItem("token");
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

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
const getAuthHeaders = () => {
  const session =
    JSON.parse(localStorage.getItem("session")) ||
    JSON.parse(sessionStorage.getItem("session"));

  const token = session?.token;

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// console.log(localStorage.getItem("session"), "tokennnnnnn kkkkkkkkkkkkkkkkkkkkk")

const apiService = {
  get: (url, params = {}) =>
    api.get(url, {
      headers: getAuthHeaders(),
      params,
    }),

  post: (url, data = {}) =>
    api.post(url, data, {
      headers: getAuthHeaders(),
    }),

  put: (url, data = {}) =>
    api.put(url, data, {
      headers: getAuthHeaders(),
    }),

  patch: (url, data = {}) =>
    api.patch(url, data, {
      headers: getAuthHeaders(),
    }),

  delete: (url) =>
    api.delete(url, {
      headers: getAuthHeaders(),
    }),
};

export default apiService;
