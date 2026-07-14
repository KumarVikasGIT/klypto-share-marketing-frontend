import apiService from "./apiServices";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSandboxError(error) {
  const fallbackMessage = error?.message || "Sandbox execution failed";
  const responseData = error?.response?.data;

  if (!responseData || typeof responseData !== "object") {
    return new Error(fallbackMessage);
  }

  const message =
    responseData.error ||
    responseData.detail ||
    responseData.message ||
    fallbackMessage;

  const normalizedError = new Error(String(message));
  normalizedError.details = responseData.details || responseData.errors || null;
  normalizedError.response = error.response;
  return normalizedError;
}

export function normalizeSandboxExecutionResponse(response = {}) {
  const chart =
    response?.result?.chart && typeof response.result.chart === "object"
      ? response.result.chart
      : null;

  return {
    ...response,
    chart,
    signals: asArray(chart?.signals),
    labels: asArray(chart?.labels),
    boxes: asArray(chart?.boxes),
    zones: asArray(chart?.zones),
    levels: asArray(chart?.levels),
    fills: asArray(chart?.fills),
    features: chart?.features || {},
    logs: [...asArray(response.stdout), ...asArray(chart?.logs)],
    stderr: asArray(response.stderr),
    warnings: asArray(response.warnings),
    errors: asArray(response.errors),
  };
}

export async function executeIndicatorSandbox({
  code,
  symbol,
  timeframe,
  candles,
  featureSettings = {},
  sessionId,
  resetBeforeExecution = true,
  timeoutSeconds = 90,
}) {
  try {
    const response = await apiService.post("/api/sandbox/execute", {
      sessionId,
      resetBeforeExecution: Boolean(sessionId) && resetBeforeExecution,
      timeoutSeconds,
      mode: "indicator",
      code,
      inputs: {
        symbol,
        timeframe,
        candles,
        settings: featureSettings,
      },
    });

    return normalizeSandboxExecutionResponse(response);
  } catch (error) {
    throw normalizeSandboxError(error);
  }
}
