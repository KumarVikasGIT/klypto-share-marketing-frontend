import axios from "axios";
import { getToken } from "../pages/auth/protected";

const STRATEGY_AGENT_BASE_URL =
  import.meta.env.VITE_STRATEGY_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

export async function generateStrategyAgent(payload) {
  const token = getToken();
  const baseUrl = STRATEGY_AGENT_BASE_URL.replace(/\/+$/, "");
  const response = await axios.post(
    `${baseUrl}/api/strategy/agent/generate`,
    payload,
    {
      timeout: 90000,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  return response?.data || response;
}

export function extractStrategyAgentError(error) {
  if (error?.response?.data?.error) {
    return String(error.response.data.error);
  }
  if (error?.response?.data?.detail) {
    return String(error.response.data.detail);
  }
  if (error?.message) {
    return String(error.message);
  }
  return "Unknown strategy agent error";
}
