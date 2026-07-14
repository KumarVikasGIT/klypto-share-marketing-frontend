import axios from "axios";
import { getToken } from "../pages/auth/protected";

const STRATEGY_AGENT_BASE_URL =
  import.meta.env.VITE_STRATEGY_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

export async function generateStrategyAgent(payload) {
  const token = getToken();
  const baseUrl = STRATEGY_AGENT_BASE_URL.replace(/\/+$/, "");
  const sanitizedPayload = {
    prompt: payload?.prompt,
    session_id: payload?.session_id,
    user_id: payload?.user_id,
    current_file_path: payload?.current_file_path,
    current_editor_code: payload?.current_editor_code || "",
    open_files: Array.isArray(payload?.open_files) ? payload.open_files : [],
    project_summary: payload?.project_summary,
    timeframe: payload?.timeframe,
    market: payload?.market,
    risk_profile: payload?.risk_profile,
    constraints: Array.isArray(payload?.constraints) ? payload.constraints : [],
  };
  const response = await axios.post(
    `${baseUrl}/api/strategy/agent/generate`,
    sanitizedPayload,
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
