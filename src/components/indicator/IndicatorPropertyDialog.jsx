import { Modal, Button, Tabs, Tab, Row, Col, Form } from "react-bootstrap";
import IndicatorStyle from "./IndicatorStyle";
import apiService from "../../services/apiServices";
import useChartFunctions from "../../util/useChartFunctions";
import { updateIndicatorFromInput } from "./IndicatorIndex";
import React, { useEffect, useState } from "react";
import socket from "../../services/websocket/socket";
import { indicatorConfigDefault } from "../../util/indicatorFunctions";

/* =========================
   BASE SETTINGS COMPONENT
========================== */
const BaseSettings = React.memo(function BaseSettings({
  currentConfig,
  updateProperty,
  showLength = true,
  showSource = true,
  showOffset = true,
}) {
  return (
    <section className="mt-3 px-3">
      {/* LENGTH */}
      {showLength && (
        <div className="mb-3">
          <label className="form-label">Length</label>
          <input
            type="number"
            className="form-control"
            min="1"
            value={currentConfig?.length ?? ""}
            onChange={(e) => {
              const value =
                e.target.value === ""
                  ? ""
                  : Math.max(1, Number(e.target.value));
              updateProperty("length", value);
            }}
          />
        </div>
      )}

      {/* SOURCE */}
      {showSource && (
        <div className="mb-3">
          <label className="form-label">Source</label>
          <select
            className="form-select"
            value={currentConfig?.source ?? ""}
            onChange={(e) => updateProperty("source", e.target.value)}
          >
            {["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4"].map(
              (opt) => (
                <option key={opt} value={opt.toLowerCase()}>
                  {opt}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {/* OFFSET */}
      {showOffset && (
        <div className="mb-3">
          <label className="form-label">Offset</label>
          <input
            type="number"
            className="form-control"
            min="0"
            value={currentConfig?.offset ?? ""}
            onChange={(e) => {
              const value =
                e.target.value === ""
                  ? ""
                  : Math.max(0, Number(e.target.value));
              updateProperty("offset", value);
            }}
          />
        </div>
      )}
    </section>
  );
});

/* =========================
   SMOOTHING SECTION
========================== */
const SmoothingSection = React.memo(function SmoothingSection({
  currentConfig,
  updateProperty,
}) {
  if (!currentConfig) return null;

  const smoothingTypes = [
    "None",
    "SMA",
    "EMA",
    "WMA",
    "SMA + Bollinger Bands",
    "VWMA",
    "SMMA (RMA)",
  ];

  return (
    <>
      <hr />
      <section className="px-3">
        {/* TYPE */}
        <div className="mb-3">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={currentConfig?.maType || "none"}
            onChange={(e) => updateProperty("maType", e.target.value)}
          >
            {smoothingTypes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* LENGTH */}
        <div className="mb-3">
          <label className="form-label">Length</label>
          <input
            type="number"
            className="form-control"
            min="1"
            value={currentConfig?.maLength}
            onChange={(e) => {
              const value =
                e.target.value === ""
                  ? ""
                  : Math.max(1, Number(e.target.value));
              updateProperty("maLength", value);
            }}
          />
        </div>

        {/* BB STD DEV */}
        <div className="mb-3">
          <label className="form-label">BB Std Dev</label>
          <input
            type="number"
            className="form-control"
            min="0"
            disabled={currentConfig?.maType !== "SMA + Bollinger Bands"}
            value={currentConfig?.bbStdDev}
            onChange={(e) => {
              const value =
                e.target.value === ""
                  ? ""
                  : Math.max(0, Number(e.target.value));
              updateProperty("bbStdDev", value);
            }}
          />
        </div>
      </section>
    </>
  );
});

export default function IndicatorPropertyDialog({
  setIndicatorProperty,
  indicatorProperty,
  activeBarIndicator,
  setIndicatorConfigs,
  indicatorConfigs,
  indicatorStyle,
  setIndicatorStyle,
  indicatorSeriesRef,
  selectedCurrency,
  timeframeValue,
  latestIndicatorValuesRef,
  fromDate,
  toDate,
  setIndicatorLoading,
}) {
  const labelStyle = {
    display: "inline-block",
    width: "60%",
    textAlign: "left",
  };

  // activeBarIndicator is now {id, type} — fall back to string for legacy compat
  const instanceId =
    typeof activeBarIndicator === "object"
      ? activeBarIndicator.id
      : activeBarIndicator;
  const activeType =
    typeof activeBarIndicator === "object"
      ? activeBarIndicator.type
      : activeBarIndicator;

  const currentConfig = {
    ...(indicatorConfigDefault[activeType] || {}),
    ...(indicatorConfigs[instanceId] || indicatorConfigs[activeType] || {}),
  };

  const updateProperty = (key, value) => {
    setIndicatorConfigs((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || prev[activeType] || {}),
        [key]: value,
      },
    }));
  };

  const handleBlur = (key, value) => {
    const defaults =
      indicatorConfigDefault[activeType] || indicatorConfigs[activeType] || {};
    const defaultValue = defaults[key];
    let val = value;
    if (val === "" || val === undefined || isNaN(val)) {
      val = defaultValue ?? 0;
    } else {
      val = Number(val);
    }
    updateProperty(key, val);
  };

  const handleChange = (key, value) => {
    updateProperty(key, value === "" ? "" : Number(value));
  };

  const updateNestedDoubleProperty = (band, key, value) => {
    setIndicatorConfigs((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || prev[activeType] || {}),
        [band]: {
          ...(prev[instanceId]?.[band] || prev[activeType]?.[band] || {}),
          [key]: value,
        },
      },
    }));
  };

  /* =========================
     OK BUTTON
  ========================== */
  const handleIndicatorPropertyChange = async () => {
    const config = currentConfig;
    const { maType } = config;

    const payload = {
      type: activeType,
      ...config,
    };

    console.log("[IndicatorProperty] Emitting updateIndicator:", payload);

    setIndicatorProperty(false);
    setIndicatorLoading(true); // START LOADER

    // Build the socket request
    const longInterval =
      timeframeValue === "1d"
        ? "ONE_DAY"
        : timeframeValue === "1h"
          ? "ONE_HOUR"
          : timeframeValue === "15m"
            ? "FIFTEEN_MINUTE"
            : timeframeValue === "5m"
              ? "FIVE_MINUTE"
              : "ONE_MINUTE";

    const socketPayload = {
      ...payload,
      type: activeType,
      instanceId,
      symbol: selectedCurrency?.name,
      interval: timeframeValue,
      fromDate: fromDate,
      toDate: toDate,
    };
    console.log("[IndicatorProperty] Final socketPayload:", socketPayload);

    const responseHandler = (response) => {
      console.log("[IndicatorProperty] updateIndicatorResponse:", response);
      setIndicatorLoading(false); // STOP LOADER

      const hasValidData =
        response?.success !== false &&
        (response?.data || response?.result || response?.rows);

      if (!hasValidData) {
        console.error(
          "Indicator update failed:",
          response?.message || response?.error || "Unknown or empty response",
        );
        return;
      }

      updateIndicatorFromInput(
        instanceId,
        activeType,
        response,
        indicatorSeriesRef,
        latestIndicatorValuesRef,
        maType,
      );
    };

    socket.once("updateIndicatorResponse", responseHandler);

    socket.emit("updateIndicator", socketPayload);

    // Safety fallback: if no response in 5 minutes, stop the loader
    setTimeout(() => {
      setIndicatorLoading((loading) => {
        if (loading) {
          console.warn(
            "[IndicatorProperty] updateIndicatorResponse timed out (5m)",
          );
          socket.off("updateIndicatorResponse", responseHandler);
        }
        return false;
      });
    }, 300000);
  };

  const handleCancel = () => {
    setIndicatorConfigs((prev) => ({
      ...prev,
      [activeType]: indicatorConfigs[activeType],
    }));
    setIndicatorProperty(false);
  };

  /* =========================
     RENDER PER INDICATOR
  ========================== */

  function renderIndicatorSetting() {
    switch (activeType) {
      case "SMA":
      case "EMA":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
            />

            <SmoothingSection
              currentConfig={currentConfig}
              updateProperty={updateProperty}
            />
          </>
        );

      case "MA_RIBBON":
        return (
          <>
            {["ma1", "ma2", "ma3", "ma4"].map((maKey, index) => (
              <div key={maKey} className="border rounded p-3 mb-3">
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={currentConfig[maKey]?.enabled ?? true}
                    onChange={(e) =>
                      updateProperty(maKey, {
                        ...currentConfig[maKey],
                        enabled: e.target.checked,
                      })
                    }
                  />
                  <label className="form-check-label">MA #{index + 1}</label>
                </div>

                {/* MA TYPE */}
                <div className="mb-3">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={currentConfig[maKey]?.type}
                    onChange={(e) =>
                      updateProperty(maKey, {
                        ...currentConfig[maKey],
                        type: e.target.value,
                      })
                    }
                  >
                    {["EMA", "SMA", "WMA", "VWMA"].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SOURCE */}
                <div className="mb-3">
                  <label className="form-label">Source</label>
                  <select
                    className="form-select"
                    value={currentConfig[maKey]?.source}
                    onChange={(e) =>
                      updateProperty(maKey, {
                        ...currentConfig[maKey],
                        source: e.target.value,
                      })
                    }
                  >
                    {[
                      "Close",
                      "Open",
                      "High",
                      "Low",
                      "HL2",
                      "HLC3",
                      "OHLC4",
                    ].map((opt) => (
                      <option key={opt} value={opt.toLowerCase()}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LENGTH */}
                <div className="mb-3">
                  <label className="form-label">Length</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={currentConfig[maKey]?.length}
                    onChange={(e) =>
                      updateProperty(maKey, {
                        ...currentConfig[maKey],
                        length: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </>
        );

      case "SSL_HYBRID":
        return (
          <>
            {/* =========================
    DISPLAY CONTROLS
========================= */}
            <h6 className="mb-3 fw-bold">Display Controls</h6>

            <div className="mb-3">
              <label className="form-label">Display Mode</label>

              <select
                className="form-select"
                value={currentConfig?.displayMode}
                onChange={(e) => updateProperty("displayMode", e.target.value)}
              >
                <option value="FULL_DISPLAY">Full Display</option>

                <option value="BASELINE_ONLY">Baseline Only</option>

                <option value="SSL_ONLY">SSL Only</option>

                <option value="BASELINE_SSL">Baseline + SSL</option>

                <option value="ENTRY_EXIT_ONLY">Entry/Exit Only</option>
              </select>
            </div>
            {/* =========================
          SSL SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">SSL Settings</h6>

            <div className="mb-3">
              <label className="form-label">Baseline Type</label>
              <select
                className="form-select"
                value={currentConfig?.maType}
                onChange={(e) => updateProperty("maType", e.target.value)}
              >
                {[
                  "SMA",
                  "EMA",
                  "DEMA",
                  "TEMA",
                  "LSMA",
                  "WMA",
                  "MF",
                  "VAMA",
                  "TMA",
                  "HMA",
                  "JMA",
                  "Kijun v2",
                  "EDSMA",
                  "McGinley",
                ].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Baseline Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.baseLen}
                onChange={(e) =>
                  updateProperty("baseLen", Math.max(1, Number(e.target.value)))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Source</label>
              <select
                className="form-select"
                value={currentConfig?.src}
                onChange={(e) => updateProperty("src", e.target.value)}
              >
                {["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4"].map(
                  (opt) => (
                    <option key={opt} value={opt.toLowerCase()}>
                      {opt}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Channel Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.multy}
                onChange={(e) =>
                  updateProperty("multy", Number(e.target.value))
                }
              />
            </div>

            {/* =========================
          SSL2 SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">SSL2 Settings</h6>

            <div className="mb-3">
              <label className="form-label">SSL2 Type</label>
              <select
                className="form-select"
                value={currentConfig?.ssl2Type}
                onChange={(e) => updateProperty("ssl2Type", e.target.value)}
              >
                {[
                  "SMA",
                  "EMA",
                  "DEMA",
                  "TEMA",
                  "WMA",
                  "MF",
                  "VAMA",
                  "TMA",
                  "HMA",
                  "JMA",
                  "McGinley",
                ].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">SSL2 Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.ssl2Len}
                onChange={(e) =>
                  updateProperty("ssl2Len", Math.max(1, Number(e.target.value)))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Continuation ATR Criteria</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.atrCrit}
                onChange={(e) =>
                  updateProperty("atrCrit", Number(e.target.value))
                }
              />
            </div>

            {/* =========================
          EXIT SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">Exit Settings</h6>

            <div className="mb-3">
              <label className="form-label">Exit Type</label>
              <select
                className="form-select"
                value={currentConfig?.ssl3Type}
                onChange={(e) => updateProperty("ssl3Type", e.target.value)}
              >
                {[
                  "DEMA",
                  "TEMA",
                  "LSMA",
                  "VAMA",
                  "TMA",
                  "HMA",
                  "JMA",
                  "Kijun v2",
                  "McGinley",
                  "MF",
                ].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Exit Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.ssl3Len}
                onChange={(e) =>
                  updateProperty("ssl3Len", Math.max(1, Number(e.target.value)))
                }
              />
            </div>

            {/* =========================
          ATR SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">ATR Settings</h6>

            <div className="mb-3">
              <label className="form-label">ATR Period</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.atrLen}
                onChange={(e) =>
                  updateProperty("atrLen", Math.max(1, Number(e.target.value)))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">ATR Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.atrMult}
                onChange={(e) =>
                  updateProperty("atrMult", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">ATR Smoothing</label>
              <select
                className="form-select"
                value={currentConfig?.atrSmoothing}
                onChange={(e) => updateProperty("atrSmoothing", e.target.value)}
              >
                {["RMA", "SMA", "EMA", "WMA"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={currentConfig?.showAtrBands}
                onChange={(e) =>
                  updateProperty("showAtrBands", e.target.checked)
                }
              />
              <label className="form-check-label">Show ATR Bands</label>
            </div>

            {/* =========================
          RISK SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">Risk Assessment</h6>

            <div className="mb-3">
              <label className="form-label">Risk Lookback Period</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.riskLookback}
                onChange={(e) =>
                  updateProperty(
                    "riskLookback",
                    Math.max(1, Number(e.target.value)),
                  )
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Risk Sensitivity</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.riskSensitivity}
                onChange={(e) =>
                  updateProperty("riskSensitivity", Number(e.target.value))
                }
              />
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={currentConfig?.enableRiskGradient}
                onChange={(e) =>
                  updateProperty("enableRiskGradient", e.target.checked)
                }
              />
              <label className="form-check-label">Enable Risk Gradient</label>
            </div>

            {/* =========================
          JMA SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">Jurik (JMA) Settings</h6>

            <div className="mb-3">
              <label className="form-label">Phase</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.phase}
                onChange={(e) =>
                  updateProperty("phase", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Power</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.power}
                onChange={(e) =>
                  updateProperty("power", Number(e.target.value))
                }
              />
            </div>

            {/* =========================
          KIJUN SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">Kijun Settings</h6>

            <div className="mb-3">
              <label className="form-label">Kijun Mod Divider</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.kijunDivider}
                onChange={(e) =>
                  updateProperty("kijunDivider", Number(e.target.value))
                }
              />
            </div>

            {/* =========================
          VAMA SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">VAMA Settings</h6>

            <div className="mb-3">
              <label className="form-label">Volatility Lookback Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.volatilityLookback}
                onChange={(e) =>
                  updateProperty(
                    "volatilityLookback",
                    Math.max(1, Number(e.target.value)),
                  )
                }
              />
            </div>

            {/* =========================
          MODULAR FILTER SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">Modular Filter Settings</h6>

            <div className="mb-3">
              <label className="form-label">Beta</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.beta}
                onChange={(e) => updateProperty("beta", Number(e.target.value))}
              />
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={currentConfig?.feedback}
                onChange={(e) => updateProperty("feedback", e.target.checked)}
              />
              <label className="form-check-label">Feedback</label>
            </div>

            <div className="mb-3">
              <label className="form-label">Feedback Weighting</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.feedbackWeighting}
                onChange={(e) =>
                  updateProperty("feedbackWeighting", Number(e.target.value))
                }
              />
            </div>

            {/* =========================
          EDSMA SETTINGS
      ========================= */}
            <h6 className="mb-3 fw-bold">EDSMA Settings</h6>

            <div className="mb-3">
              <label className="form-label">Super Smoother Filter Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.superSmootherLength}
                onChange={(e) =>
                  updateProperty(
                    "superSmootherLength",
                    Math.max(1, Number(e.target.value)),
                  )
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Super Smoother Filter Poles</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.superSmootherPoles}
                onChange={(e) =>
                  updateProperty(
                    "superSmootherPoles",
                    Math.max(1, Number(e.target.value)),
                  )
                }
              />
            </div>
          </>
        );

      case "SUPERSMOOTHER":
        return (
          <>
            {/* Price Smoothing Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Price Smoothing Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.smoothingLength}
                  onChange={(e) =>
                    updateProperty("smoothingLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            <hr />
            <h6 className="mb-3">Moving Average Settings</h6>

            {/* Fast MA */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Fast MA
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.fastLength}
                  onChange={(e) =>
                    updateProperty("fastLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Slow MA */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Slow MA
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.slowLength}
                  onChange={(e) =>
                    updateProperty("slowLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Source */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Source
              </Form.Label>
              <Col>
                <Form.Select
                  value={currentConfig?.source ?? "close"}
                  onChange={(e) => updateProperty("source", e.target.value)}
                >
                  {["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4"].map(
                    (opt) => (
                      <option key={opt} value={opt.toLowerCase()}>
                        {opt}
                      </option>
                    ),
                  )}
                </Form.Select>
              </Col>
            </Form.Group>

            <hr />
            <h6 className="mb-3">Signal Generation</h6>

            {/* ATR Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                ATR Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.atrLength}
                  onChange={(e) =>
                    updateProperty("atrLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* ATR Multiplier */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                ATR Multiplier
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.1"
                  value={currentConfig?.atrMultiplier}
                  onChange={(e) =>
                    updateProperty("atrMultiplier", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Signal Sensitivity */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Signal Sensitivity
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={currentConfig?.signalSensitivity}
                  onChange={(e) =>
                    updateProperty("signalSensitivity", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "HEALTHY_BOX":
        return (
          <>
            {/* ATR Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                ATR Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.atrLength}
                  onChange={(e) =>
                    updateProperty("atrLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Box Size */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Box Size = ATR x
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.05"
                  value={currentConfig?.atrMultiplier}
                  onChange={(e) =>
                    updateProperty("atrMultiplier", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Minimum Healthy Body Boxes */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Minimum Healthy Body Boxes
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.1"
                  value={currentConfig?.minBodyBox}
                  onChange={(e) =>
                    updateProperty("minBodyBox", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Max Total Wick / Body */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Max Total Wick / Body
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.05"
                  value={currentConfig?.maxWickBody}
                  onChange={(e) =>
                    updateProperty("maxWickBody", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Max Single Wick / Body */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Max Single Wick / Body
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.05"
                  value={currentConfig?.maxOneWick}
                  onChange={(e) =>
                    updateProperty("maxOneWick", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );
      case "WMA":
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
          />
        );

      case "HMA60_BOX_DISTANCE":
        return (
          <>
            {/* Hull MA Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Hull MA Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.hullLength}
                  onChange={(e) =>
                    updateProperty("hullLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* ATR Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                ATR Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.atrLength}
                  onChange={(e) =>
                    updateProperty("atrLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Box Size = ATR x */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Box Size = ATR ×
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.05"
                  value={currentConfig?.boxAtrMult}
                  onChange={(e) =>
                    updateProperty("boxAtrMult", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Show Current Box Values */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Show Current Box Values
              </Form.Label>
              <Col>
                <Form.Check
                  type="checkbox"
                  checked={currentConfig?.showTable}
                  onChange={(e) =>
                    updateProperty("showTable", e.target.checked)
                  }
                />
              </Col>
            </Form.Group>

            {/* Upper Extreme Box Level */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Upper Extreme Box Level
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.1"
                  value={currentConfig?.upperZone}
                  onChange={(e) =>
                    updateProperty("upperZone", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Lower Extreme Box Level */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Lower Extreme Box Level
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.1"
                  value={currentConfig?.lowerZone}
                  onChange={(e) =>
                    updateProperty("lowerZone", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );
      case "BODY915DNA":
        return (
          <>
            {/* Past 9:15 Candles Lookback */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Past 9:15 Candles Lookback
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.lookback915}
                  onChange={(e) =>
                    updateProperty("lookback915", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Average Body = How Many Boxes? */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Average Body = How Many Boxes?
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="1"
                  value={currentConfig?.boxDivisor}
                  onChange={(e) =>
                    updateProperty("boxDivisor", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Market Candle Hour */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Market Candle Hour
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  min={0}
                  max={23}
                  value={currentConfig?.marketHour}
                  onChange={(e) =>
                    updateProperty("marketHour", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Market Candle Minute */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Market Candle Minute
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  min={0}
                  max={59}
                  value={currentConfig?.marketMinute}
                  onChange={(e) =>
                    updateProperty("marketMinute", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Show 9:15 DNA Table */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Show 9:15 DNA Table
              </Form.Label>
              <Col>
                <Form.Check
                  type="checkbox"
                  checked={currentConfig?.showTable}
                  onChange={(e) =>
                    updateProperty("showTable", e.target.checked)
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "HMA":
      case "DEMA":
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
          />
        );

      case "TEMA":
      case "TRIX":
      case "FT":
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
            showSource={false}
          />
        );

      case "KAMA":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showLength={false}
            />

            <div className="mb-3">
              <label className="form-label">ER Length</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={currentConfig?.ERlength}
                onChange={(e) => {
                  const value = Math.max(1, Number(e.target.value));
                  updateProperty("ERlength", value);
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Fast Length</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={currentConfig?.fastLength}
                onChange={(e) => {
                  const value = Math.max(1, Number(e.target.value));
                  updateProperty("fastLength", value);
                }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Slow Length</label>
              <input
                type="number"
                className="form-control"
                min=""
                value={currentConfig?.slowLength}
                onChange={(e) => {
                  const value = Math.max(1, Number(e.target.value));
                  updateProperty("slowLength", value);
                }}
              />
            </div>
          </>
        );

      case "ICHIMOKU":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">Conversion Line</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.conversionLength}
                onChange={(e) =>
                  updateProperty("conversionLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Base Line</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.baseLength}
                onChange={(e) =>
                  updateProperty("baseLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Span B Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.spanBLength}
                onChange={(e) =>
                  updateProperty("spanBLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Lagging Span</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.laggingSpan}
                onChange={(e) =>
                  updateProperty("laggingSpan", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      // case "PSAR":
      //   return (
      //     <>
      //       <div className="mb-3">
      //         <label className="form-label">Start</label>
      //         <input
      //           type="number"
      //           className="form-control"
      //           value={currentConfig?.start}
      //           onChange={(e) =>
      //             updateProperty("start", Number(e.target.value))
      //           }
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label className="form-label">Increment</label>
      //         <input
      //           type="number"
      //           className="form-control"
      //           value={currentConfig?.increment}
      //           onChange={(e) =>
      //             updateProperty("increment", Number(e.target.value))
      //           }
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label className="form-label">Max Value</label>
      //         <input
      //           type="number"
      //           className="form-control"
      //           value={currentConfig?.maxValue}
      //           onChange={(e) =>
      //             updateProperty("maxValue", Number(e.target.value))
      //           }
      //         />
      //       </div>
      //     </>
      //   );

      case "SUPERTREND":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">ATR Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.atrLength}
                onChange={(e) =>
                  updateProperty("atrLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Factor</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.factor}
                onChange={(e) =>
                  updateProperty("factor", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "AROON":
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
            showSource={false}
          />
        );

      case "AO":
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
            showSource={false}
          />
        );

      case "AD":
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
            showSource={false}
          />
        );

      case "ADX":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">Smoothing</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.smoothing}
                onChange={(e) =>
                  updateProperty("smoothing", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">DI Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.diLength}
                onChange={(e) =>
                  updateProperty("diLength", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "Chande Kroll Stop":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">ATR Length (p)</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.atrLength}
                onChange={(e) =>
                  updateProperty("atrLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">ATR Coefficient (x)</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.atrCoefficient}
                onChange={(e) =>
                  updateProperty("atrCoefficient", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Stop Length (q)</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.stopLength}
                onChange={(e) =>
                  updateProperty("stopLength", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "RSI":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
            />
            <SmoothingSection
              currentConfig={currentConfig}
              updateProperty={updateProperty}
            />
          </>
        );

      case "STOCH":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">%K Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.kLength}
                onChange={(e) =>
                  updateProperty("kLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">%K Smoothing</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.kSmoothing}
                onChange={(e) =>
                  updateProperty("kSmoothing", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">%D Smoothing</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.dSmoothing}
                onChange={(e) =>
                  updateProperty("dSmoothing", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "STOCHRSI":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />

            <div className="mb-3">
              <label className="form-label">K</label>
              <input
                type="number"
                className="form-control"
                min={1}
                value={currentConfig?.kSmoothing}
                onChange={(e) =>
                  updateProperty("kSmoothing", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">D</label>
              <input
                type="number"
                className="form-control"
                min={1}
                value={currentConfig?.dSmoothing}
                onChange={(e) =>
                  updateProperty("dSmoothing", Number(e.target.value))
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">RSI Length</label>
              <input
                type="number"
                className="form-control"
                min={1}
                value={currentConfig?.lengthRSI}
                onChange={(e) =>
                  updateProperty("lengthRSI", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label"> RSI Source</label>
              <select
                className="form-select"
                value={currentConfig?.source}
                onChange={(e) => updateProperty("source", e.target.value)}
              >
                {["Close", "Open", "High", "Low", "HL2", "HLC3", "OHLC4"].map(
                  (opt) => (
                    <option key={opt} value={opt.toLowerCase()}>
                      {opt}
                    </option>
                  ),
                )}
              </select>
            </div>
          </>
        );

      case "MACD":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showLength={false}
              showOffset={false}
            />
            <div className="mb-3">
              <label className="form-label">Fast Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.fastLength}
                onChange={(e) =>
                  updateProperty("fastLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Slow Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.slowLength}
                onChange={(e) =>
                  updateProperty("slowLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Signal Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.signalLength}
                onChange={(e) =>
                  updateProperty("signalLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Oscillator MA Type</label>
              <select
                className="form-control"
                value={currentConfig?.oscillatorMAType}
                onChange={(e) =>
                  updateProperty("oscillatorMAType", e.target.value)
                }
              >
                <option value="EMA">EMA</option>
                <option value="SMA">SMA</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Signal MA Type</label>
              <select
                className="form-control"
                value={currentConfig?.signalMAType}
                onChange={(e) => updateProperty("signalMAType", e.target.value)}
              >
                <option value="EMA">EMA</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
          </>
        );

      case "CCI": {
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
            />
            <SmoothingSection
              currentConfig={currentConfig}
              updateProperty={updateProperty}
            />
          </>
        );
      }
      case "MOM": {
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
          />
        );
      }
      case "ROC": {
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
          />
        );
      }
      case "WPR": {
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
          />
        );
      }
      case "UO":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">Fast Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.fastLength}
                onChange={(e) =>
                  updateProperty("fastLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Middle Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.middleLength}
                onChange={(e) =>
                  updateProperty("middleLength", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Slow Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.slowLength}
                onChange={(e) =>
                  updateProperty("slowLength", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "VOLATILITY_MOMENTUM_PRO":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">Session Start Hour</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.sessionStartHour}
                onChange={(e) =>
                  updateProperty("sessionStartHour", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Session Start Minute</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.sessionStartMin}
                onChange={(e) =>
                  updateProperty("sessionStartMin", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">ATR Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.atrLen}
                onChange={(e) =>
                  updateProperty("atrLen", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Volume Average Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.volLen}
                onChange={(e) =>
                  updateProperty("volLen", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Angle Calculation Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.angleLen}
                onChange={(e) =>
                  updateProperty("angleLen", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Opening Range Bars</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.orBars}
                onChange={(e) =>
                  updateProperty("orBars", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Channel ATR Multiplier</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={currentConfig?.channelMult}
                onChange={(e) =>
                  updateProperty("channelMult", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Sharp Trend Angle</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.sharpAngle}
                onChange={(e) =>
                  updateProperty("sharpAngle", Number(e.target.value))
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Extreme Trend Angle</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.extremeAngle}
                onChange={(e) =>
                  updateProperty("extremeAngle", Number(e.target.value))
                }
              />
            </div>
          </>
        );
      case "CMO": {
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
          />
        );
      }

      case "TR": {
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
            showOffset={false}
            showSource={false}
          />
        );
      }
      case "VWMA": {
        return (
          <BaseSettings
            currentConfig={currentConfig}
            updateProperty={updateProperty}
          />
        );
      }
      case "ATR":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />

            <div className="mb-3">
              <label className="form-label">Smoothing</label>
              <select
                className="form-control"
                value={currentConfig?.smoothing}
                onChange={(e) => updateProperty("smoothing", e.target.value)}
              >
                <option value="RMA">RMA</option>
                <option value="SMA">SMA</option>
                <option value="EMA">EMA</option>
                <option value="WMA">WMA</option>
              </select>
            </div>
          </>
        );

      case "BB":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
            />
            <div className="mb-3">
              <label className="form-label">Basic MA Type</label>
              <select
                className="form-control"
                value={currentConfig?.maType}
                onChange={(e) => updateProperty("maType", e.target.value)}
              >
                <option value="SMA">SMA</option>
                <option value="EMA">EMA</option>
                <option value="SMMA">SMMA</option>
                <option value="WMA">WMA</option>
                <option value="VWMA">VWMA</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Standard Deviation</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.stdDev}
                onChange={(e) =>
                  updateProperty("stdDev", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "BBPERB":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
            />
            <div className="mb-3">
              <label className="form-label">Standard Deviation</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.stdDev}
                onChange={(e) =>
                  updateProperty("stdDev", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "BBW":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
            />
            <div className="mb-3">
              <label className="form-label">Standard Deviation</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.stdDev}
                onChange={(e) =>
                  updateProperty("stdDev", Number(e.target.value))
                }
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Highest Expansion Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.highestExpansionLength}
                onChange={(e) =>
                  updateProperty(
                    "highestExpansionLength",
                    Number(e.target.value),
                  )
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Lowest Contraction Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.lowestContractionLength}
                onChange={(e) =>
                  updateProperty(
                    "lowestContractionLength",
                    Number(e.target.value),
                  )
                }
              />
            </div>
          </>
        );

      case "HV":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />
          </>
        );

      case "KC":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
            />
            <div className="mb-3">
              <label className="form-label">Multiplier</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.multiplier}
                onChange={(e) =>
                  updateProperty("multiplier", Number(e.target.value))
                }
              />
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="useEMA"
                checked={currentConfig?.useEMA}
                onChange={(e) => updateProperty("useEMA", e.target.checked)}
              />
              <label className="form-check-label" htmlFor="useEMA">
                Use Exponential MA
              </label>
            </div>

            <div className="mb-3">
              <label className="form-label">Bands Style</label>
              <select
                className="form-control"
                value={currentConfig?.bandsStyle}
                onChange={(e) => updateProperty("bandsStyle", e.target.value)}
              >
                <option value="Average True Range">Average True Range</option>
                <option value="True Range">True Range</option>
                <option value="Range">Range</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">ATR Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.atrLength}
                onChange={(e) =>
                  updateProperty("atrLength", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "DC":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showSource={false}
            />
          </>
        );
      case "CHOP":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showSource={false}
            />
          </>
        );
      case "STDDEV":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
            />
          </>
        );

      case "VOL":
        return (
          <>
            <div className="mb-3">
              <label className="form-label">MA Length</label>
              <input
                type="number"
                className="form-control"
                value={currentConfig?.maLength}
                onChange={(e) =>
                  updateProperty("maLength", Number(e.target.value))
                }
              />
            </div>
          </>
        );

      case "OBV":
        return (
          <>
            <SmoothingSection
              currentConfig={currentConfig}
              updateProperty={updateProperty}
            />
          </>
        );

      case "PVO":
        return (
          <>
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="fastLength"
            >
              <Form.Label style={labelStyle} className="mb-0">
                Fast Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.fastLength}
                  onChange={(e) =>
                    updateProperty("fastLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Slow Length */}
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="slowLength"
            >
              <Form.Label style={labelStyle} className="mb-0">
                Slow Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.slowLength}
                  onChange={(e) =>
                    updateProperty("slowLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Signal Length */}
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="signalLength"
            >
              <Form.Label style={labelStyle} className="mb-0">
                Signal Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.signalLength}
                  onChange={(e) =>
                    updateProperty("signalLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Oscillator MA Type */}
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="oscMaType"
            >
              <Form.Label style={labelStyle} className="mb-0">
                Oscillator MA Type
              </Form.Label>
              <Col>
                <Form.Select
                  value={currentConfig?.oscMaType}
                  onChange={(e) => updateProperty("oscMaType", e.target.value)}
                >
                  <option value="EMA">EMA</option>
                  <option value="SMA">SMA</option>
                </Form.Select>
              </Col>
            </Form.Group>

            {/* Signal MA Type */}
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="signalMaType"
            >
              <Form.Label style={labelStyle} className="mb-0">
                Signal MA Type
              </Form.Label>
              <Col>
                <Form.Select
                  value={currentConfig?.signalMaType}
                  onChange={(e) =>
                    updateProperty("signalMaType", e.target.value)
                  }
                >
                  <option value="EMA">EMA</option>
                  <option value="SMA">SMA</option>
                </Form.Select>
              </Col>
            </Form.Group>
          </>
        );

      case "Chaikin Money Flow":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />
          </>
        );

      case "MFI":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />
          </>
        );

      case "EOM":
        return (
          <>
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="eomDivisor"
            >
              <Form.Label style={labelStyle} className="mb-0">
                Divisor
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.divisor}
                  onChange={(e) =>
                    updateProperty("divisor", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "NVI":
        return (
          <>
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="nviEmaLength"
            >
              <Form.Label style={labelStyle} className="mb-0">
                EMA Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.emaLength}
                  onChange={(e) =>
                    updateProperty("emaLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "PVI":
        return (
          <>
            <Form.Group
              as={Row}
              className="mb-3 align-items-center"
              controlId="pviEmaLength"
            >
              <Form.Label style={labelStyle} className="mb-0">
                EMA Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.emaLength}
                  onChange={(e) =>
                    updateProperty("emaLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "CKS":
        return (
          <>
            {/* ATR Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                ATR Length(p)
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.atrLength}
                  onChange={(e) =>
                    updateProperty("atrLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* ATR Multiplier */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                ATR Coefficient(x)
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  step="0.1"
                  value={currentConfig?.atrCoefficient}
                  onChange={(e) =>
                    updateProperty("atrCoefficient", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>

            {/* Stop Length */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Stop Length (q)
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.stopLength}
                  onChange={(e) =>
                    updateProperty("stopLength", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );
      case "CMF":
        return (
          <>
            {/* Base Settings */}
            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showOffset={false}
              showSource={false}
            />
          </>
        );
      case "NVI":
        return (
          <>
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Signal EMA Length
              </Form.Label>
              <Col>
                <Form.Control
                  type="number"
                  value={currentConfig?.signal?.length || 255} // default 255 agar undefined ho
                  onChange={(e) =>
                    updateProperty("signal.length", Number(e.target.value))
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "VWAP":
        return (
          <>
            {/* Hide VWAP */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Hide on 1D or Above
              </Form.Label>
              <Col>
                <Form.Check
                  type="checkbox"
                  checked={currentConfig?.hideOnDailyOrAbove}
                  onChange={(e) =>
                    updateProperty("hideOnDailyOrAbove", e.target.checked)
                  }
                />
              </Col>
            </Form.Group>

            {/* Anchor Period */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Anchor Period
              </Form.Label>
              <Col>
                <Form.Select
                  value={currentConfig?.anchorPeriod}
                  onChange={(e) =>
                    updateProperty("anchorPeriod", e.target.value)
                  }
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Yearly</option>
                </Form.Select>
              </Col>
            </Form.Group>

            <BaseSettings
              currentConfig={currentConfig}
              updateProperty={updateProperty}
              showLength={false}
            />

            {/* ========================= */}
            {/* Band Settings */}
            {/* ========================= */}

            <hr />
            <h6 className="mb-3">Band Settings</h6>

            {/* Band Calculation Mode */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Band Calculation Mode
              </Form.Label>
              <Col>
                <Form.Select
                  value={
                    currentConfig?.bandMode === "STD"
                      ? "Standard Deviation"
                      : "Percentage"
                  }
                  onChange={(e) =>
                    updateProperty(
                      "bandMode",
                      e.target.value === "Standard Deviation"
                        ? "STD"
                        : "PERCENTAGE",
                    )
                  }
                >
                  <option>Standard Deviation</option>
                  <option>Percentage</option>
                </Form.Select>
              </Col>
            </Form.Group>

            {/* Band Multiplier #1 */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Band Multiplier #1
              </Form.Label>
              <Col className="d-flex align-items-center gap-3">
                <Form.Check
                  type="checkbox"
                  checked={currentConfig?.band1.enabled}
                  onChange={(e) =>
                    updateNestedDoubleProperty(
                      "band1",
                      "enabled",
                      e.target.checked,
                    )
                  }
                />
                <Form.Control
                  type="number"
                  disabled={!currentConfig?.band1.enabled}
                  style={{ maxWidth: "120px" }}
                  value={currentConfig?.band1.multiplier}
                  onChange={(e) =>
                    updateNestedDoubleProperty(
                      "band1",
                      "multiplier",
                      Number(e.target.value),
                    )
                  }
                />
              </Col>
            </Form.Group>

            {/* Band Multiplier #2 */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Band Multiplier #2
              </Form.Label>
              <Col className="d-flex align-items-center gap-3">
                <Form.Check
                  type="checkbox"
                  checked={currentConfig?.band2.enabled}
                  onChange={(e) =>
                    updateNestedDoubleProperty(
                      "band2",
                      "enabled",
                      e.target.checked,
                    )
                  }
                />
                <Form.Control
                  type="number"
                  disabled={!currentConfig?.band2.enabled}
                  style={{ maxWidth: "120px" }}
                  value={currentConfig?.band2.multiplier}
                  onChange={(e) =>
                    updateNestedDoubleProperty(
                      "band2",
                      "multiplier",
                      Number(e.target.value),
                    )
                  }
                />
              </Col>
            </Form.Group>

            {/* Band Multiplier #3 */}
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label style={labelStyle} className="mb-0">
                Band Multiplier #3
              </Form.Label>
              <Col className="d-flex align-items-center gap-3">
                <Form.Check
                  type="checkbox"
                  checked={currentConfig?.band3.enabled}
                  onChange={(e) =>
                    updateNestedDoubleProperty(
                      "band3",
                      "enabled",
                      e.target.checked,
                    )
                  }
                />
                <Form.Control
                  type="number"
                  disabled={!currentConfig?.band3.enabled}
                  style={{ maxWidth: "120px" }}
                  value={currentConfig?.band3.multiplier}
                  onChange={(e) =>
                    updateNestedDoubleProperty(
                      "band3",
                      "multiplier",
                      Number(e.target.value),
                    )
                  }
                />
              </Col>
            </Form.Group>
          </>
        );

      case "ZIGZAG":
        return (
          <>
            {/* Price Deviation */}
            <div className="row mb-3 align-items-center">
              <div className="col-6">
                <label className="form-label">
                  Price Deviation for Reversal (%)
                </label>
              </div>
              <div className="col-6">
                <input
                  type="number"
                  className="form-control"
                  value={currentConfig?.deviation}
                  onChange={(e) =>
                    updateProperty("deviation", Number(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Pivot Legs */}
            <div className="row mb-3 align-items-center">
              <div className="col-6">
                <label className="form-label">Pivot Legs</label>
              </div>
              <div className="col-6">
                <input
                  type="number"
                  className="form-control"
                  value={currentConfig?.depth}
                  onChange={(e) =>
                    updateProperty("depth", Number(e.target.value))
                  }
                />
              </div>
            </div>

            {/* Extend to Last Bar */}
            {/* <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={currentConfig?.extendToLastBar}
                onChange={(e) =>
                  updateProperty("extendToLastBar", e.target.checked)
                }
              />
              <label className="form-check-label">Extend to Last Bar</label>
            </div> */}

            {/* Display Reversal Price */}
            {/* <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={currentConfig?.displayReversalPrice}
                onChange={(e) =>
                  updateProperty("displayReversalPrice", e.target.checked)
                }
              />
              <label className="form-check-label">Display Reversal Price</label>
            </div> */}

            {/* Display Cumulative Volume */}
            {/* <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                checked={currentConfig?.displayCumulativeVolume}
                onChange={(e) =>
                  updateProperty("displayCumulativeVolume", e.target.checked)
                }
              />
              <label className="form-check-label">
                Display Cumulative Volume
              </label>
            </div> */}

            {/* Display Reversal Price Change Mode */}
            {/* <div className="row mb-3 align-items-center">
              <div className="col-6">
                <label className="form-label">
                  Display Reversal Price Change
                </label>
              </div>
              <div className="col-6">
                <select
                  className="form-select"
                  value={currentConfig?.reversalPriceChangeMode}
                  onChange={(e) =>
                    updateProperty("reversalPriceChangeMode", e.target.value)
                  }
                >
                  <option value="absolute">Absolute</option>
                  <option value="percent">Percent</option>
                </select>
              </div>
            </div> */}
          </>
        );

      default:
        return <p className="text-muted text-center">No settings available</p>;
    }
  }

  /* =========================
     RETURN
  ========================== */

  return (
    <Modal
      show={indicatorProperty}
      onHide={() => setIndicatorProperty(false)}
      centered
      contentClassName="border-0 shadow-lg modal-dark-theme"
      style={{ borderRadius: 16 }}
    >
      <Modal.Header closeButton className="border-0 pb-0 px-4 pt-4">
        <Modal.Title
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.2px",
          }}
        >
          {activeType}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="px-0 pt-0 pb-0">
        <Tabs
          defaultActiveKey="inputs"
          className="px-4 mb-0"
          style={{
            borderBottom: "1.5px solid #f0f0f0",
            gap: 4,
          }}
        >
          {["inputs", "style", "visibility"].map(
            (key) =>
              // We still use Tab components, styling via CSS below
              null,
          )}

          <Tab
            eventKey="inputs"
            title={
              <span style={{ fontSize: 14, fontWeight: 600, padding: "0 2px" }}>
                Inputs
              </span>
            }
          >
            <div
              className="custom-scrollbar"
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <div className="px-4 py-3">{renderIndicatorSetting()}</div>
            </div>
          </Tab>

          <Tab
            eventKey="style"
            title={
              <span style={{ fontSize: 14, fontWeight: 600, padding: "0 2px" }}>
                Style
              </span>
            }
          >
            <div
              className="custom-scrollbar"
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <div className="px-4 py-3">
                <IndicatorStyle
                  indicatorStyle={indicatorStyle}
                  setIndicatorStyle={setIndicatorStyle}
                  activeBarIndicator={activeBarIndicator}
                  indicatorConfigs={indicatorConfigs}
                />
              </div>
            </div>
          </Tab>
        </Tabs>

        {/* Inline style overrides for Bootstrap nav-tabs */}
        <style>{`
      .modal-dark-theme {
        background-color: var(--bg-primary) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border-color) !important;
      }
      .modal-dark-theme .modal-header {
        border-bottom: 1px solid var(--border-color) !important;
      }
      .modal-dark-theme .modal-header .btn-close {
        filter: invert(1) grayscale(100%) brightness(200%);
      }
      .modal-dark-theme .form-control, .modal-dark-theme .form-select {
        background-color: var(--bg-secondary) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border-color) !important;
      }
      .modal-dark-theme .form-control:focus, .modal-dark-theme .form-select:focus {
        border-color: var(--accent-color) !important;
        box-shadow: none !important;
      }
      .modal-dark-theme .form-label, .modal-dark-theme .form-check-label {
        color: var(--text-secondary) !important;
      }
      .nav-tabs {
        border-bottom: 1.5px solid var(--border-color) !important;
      }
      .nav-tabs .nav-link {
        border: none !important;
        border-bottom: 2.5px solid transparent !important;
        color: var(--text-secondary) !important;
        font-weight: 600 !important;
        font-size: 14px !important;
        padding: 10px 14px !important;
        margin-bottom: -1.5px !important;
        border-radius: 0 !important;
        background: transparent !important;
        transition: color 0.15s ease, border-color 0.15s ease !important;
      }
      .nav-tabs .nav-link:hover {
        color: var(--text-primary) !important;
        border-bottom-color: var(--text-primary) !important;
      }
      .nav-tabs .nav-link.active {
        color: var(--accent-color) !important;
        border-bottom: 2.5px solid var(--accent-color) !important;
        background: transparent !important;
      }
      .tab-content {
        border: none !important;
      }
      .custom-scrollbar::-webkit-scrollbar {
        width: 5px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--text-primary);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
      }
    `}</style>
      </Modal.Body>

      <Modal.Footer className="border-0 px-4 pb-4 pt-2" style={{ gap: 8 }}>
        <Button
          variant="light"
          onClick={handleCancel}
          style={{
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            padding: "8px 20px",
            padding: "8px 20px",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            background: "var(--bg-secondary)",
          }}
        >
          Cancel
        </Button>

        <Button
          variant="dark"
          onClick={handleIndicatorPropertyChange}
          style={{
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            padding: "8px 20px",
            background: "var(--accent-color)",
            color: "#fff",
            border: "none",
            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          }}
        >
          Ok
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
