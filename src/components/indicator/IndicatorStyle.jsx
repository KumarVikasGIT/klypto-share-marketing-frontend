import { Row, Col, Form } from "react-bootstrap";
import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import ColorPalettePanel from "./ColorPalettePanel";
import { getRowsByIndicator } from "../../util/common";

export default function IndicatorStyle({
  indicatorStyle,
  setIndicatorStyle,
  activeBarIndicator,
  indicatorConfigs,
}) {
  // activeBarIndicator is now {id, type} â€” fall back to string for legacy compat
  const instanceId = typeof activeBarIndicator === "object" ? activeBarIndicator.id   : activeBarIndicator;
  const normalizedType = typeof activeBarIndicator === "object" ? activeBarIndicator.type : activeBarIndicator.replace(/[\s/%]+/g, "");

  // Read style by instance id (so two RSIs are independent); fall back to type key
  const selectedStyle = indicatorStyle?.[instanceId] ?? indicatorStyle?.[normalizedType];
  const config = indicatorConfigs?.[instanceId] || indicatorConfigs?.[normalizedType] || {};
  const { maType, maLength } = config;
  const rows = getRowsByIndicator(normalizedType, maType, indicatorConfigs);

  const [activePalette, setActivePalette] = useState(null);
  const [palettePos, setPalettePos] = useState({ top: 0, left: 0 });
  const paletteRef = useRef(null);

  /* ================= UPDATE FUNCTION ================= */
  const update = (section, key, value) => {
    setIndicatorStyle((prev) => {
      const indicator = prev[instanceId] ?? prev[normalizedType] ?? {};

      // ---------------- HISTOGRAM / VOLUME / AWO / AO PALETTE ----------------
      if (
        (section === "histogram" &&
          [
            "pf",
            "pr",
            "nf",
            "nr",
            "color0",
            "color1",
            "color2",
            "color3",
          ].includes(key)) ||
        (section === "volumeBars" && ["up", "down"].includes(key)) ||
        (section === "awoBars" && ["up", "down"].includes(key)) ||
        // âœ… AO oscillator palette
        (section === "oscillator" && ["up", "down"].includes(key)) ||
        // âœ… AO fill palette
        (section === "oscillatorFill" &&
          ["topFillColor1", "topFillColor2"].includes(key))
      ) {
        return {
          ...prev,
          [instanceId]: {
            ...indicator,
            [section]: {
              ...indicator[section],
              palette: {
                ...indicator[section]?.palette,
                [key]: value,
              },
            },
          },
        };
      }

      // ---------------- NORMAL STYLE UPDATE ----------------
      return {
        ...prev,
        [instanceId]: {
          ...indicator,
          [section]: {
            ...indicator?.[section],
            [key]: value,
          },
        },
      };
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target)) {
        setActivePalette(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ================= FILL / COLOR PREVIEW ================= */
  const getFillPreview = (row, selectedStyle) => {
    // HISTOGRAM + VOLUME + AWO + AO (PALETTE CHILDREN)
    if (
      (row.parent === "histogram" &&
        selectedStyle?.histogram?.palette?.[row.key]) ||
      (row.parent === "volumeBars" &&
        selectedStyle?.volumeBars?.palette?.[row.key]) ||
      (row.parent === "awoBars" &&
        selectedStyle?.awoBars?.palette?.[row.key]) ||
      // âœ… AO oscillator palette preview
      (row.parent === "oscillator" &&
        selectedStyle?.oscillator?.palette?.[row.key]) ||
      // âœ… AO fill palette preview
      (row.parent === "oscillatorFill" &&
        selectedStyle?.oscillatorFill?.palette?.[row.key])
    ) {
      const section = row.parent;
      return selectedStyle?.[section]?.palette?.[row.key] || "#888";
    }

    // ---------------- NORMAL STYLE ----------------
    const style = {
      ...row,
      ...(selectedStyle?.[row.key] || {}),
    };

    return (
      style.topFillColor1 ||
      style.bottomFillColor1 ||
      style.topFillColor2 ||
      style.bottomFillColor2 ||
      style.color ||
      "#888"
    );
  };

  /* ================= RENDER ROWS ================= */
  return (
    <div style={{ padding: "4px 0" }}>
      {rows
        .flatMap((row) => (row.children ? [row, ...row.children] : [row]))
        .map((row) => (
          <Row
            key={row.key + (row.parent ? `-${row.parent}` : "")}
            className="align-items-center mx-0"
            style={{
              borderBottom: "1px solid #ebebeb",
              minHeight: 48,
              transition: "background 0.15s ease",
              flexWrap: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {/* CHECKBOX + LABEL */}
            <Col
              className="pe-1 py-2"
              style={{
                minWidth: 0,
                paddingLeft: row.parent ? "29px" : "5px",
              }}
            >
              {!row.parent ? (
                <Form.Check
                  id={`check-${row.key}`}
                  type="checkbox"
                  checked={
                    selectedStyle?.[row.key]?.visible ?? row.visible ?? true
                  }
                  onChange={(e) => update(row.key, "visible", e.target.checked)}
                  label={
                    <span
                      style={{
                        fontSize: "14.5px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        letterSpacing: "-0.15px",
                        display: "block",
                      }}
                    >
                      {row.label}
                    </span>
                  }
                />
              ) : (
                <span
                  style={{
                    fontSize: "14.5px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {row.label}
                </span>
              )}
            </Col>

            {/* SWATCH COLUMN */}
            <Col
              xs="auto"
              className="px-1 py-2 d-flex justify-content-center align-items-center"
              style={{ width: 50, position: "relative" }}
            >
              {!row.children && (
                <>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPalettePos({ top: rect.bottom + 8, left: rect.left });
                      setActivePalette(
                        activePalette === row.key ? null : row.key,
                      );
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      border: "1.5px solid var(--text-primary)",
                      borderRadius: 7,
                      cursor: "pointer",
                      background:
                        row.type !== "fill"
                          ? (selectedStyle?.[row.key]?.color ??
                            row.color ??
                            "var(--accent-color)")
                          : getFillPreview(row, selectedStyle),
                      boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                      transition: "box-shadow 0.15s, transform 0.1s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.18)";
                      e.currentTarget.style.transform = "scale(1.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(0,0,0,0.10)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  />

                  {activePalette === row.key && createPortal(
                    <div
                      ref={paletteRef}
                      style={{
                        position: "fixed",
                        top: palettePos.top,
                        left: palettePos.left,
                        zIndex: 99999,
                        borderRadius: 10,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                        overflow: "hidden",
                      }}
                    >
                      <ColorPalettePanel
                        mode={row.type !== "fill" ? "line" : row.key}
                        currentStyle={
                          row.parent === "histogram"
                            ? {
                                color:
                                  selectedStyle?.histogram?.palette?.[row.key],
                              }
                            : row.parent === "volumeBars"
                              ? {
                                  color:
                                    selectedStyle?.volumeBars?.palette?.[
                                      row.key
                                    ],
                                }
                              : (selectedStyle?.[row.key] ?? row)
                        }
                        onChange={(style) => {
                          if (row.parent === "histogram") {
                            update("histogram", row.key, style.color);
                          } else if (row.parent === "volumeBars") {
                            update("volumeBars", row.key, style.color);
                          } else {
                            Object.entries(style).forEach(([k, v]) =>
                              update(row.key, k, v),
                            );
                          }
                        }}
                      />
                    </div>,
                    document.body
                  )}
                </>
              )}
            </Col>

            {/* INPUT COLUMN */}
            <Col
              xs="auto"
              className="pe-3 ps-1 py-2 d-flex align-items-center justify-content-center"
              style={{ width: 170 }}
            >
              {row.value !== undefined ? (
                <Form.Control
                  type="number"
                  value={selectedStyle?.[row.key]?.value ?? row.value ?? ""}
                  onChange={(e) =>
                    update(row.key, "value", Number(e.target.value))
                  }
                  style={{
                    width: 160,
                    height: 34,
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "2px 10px",
                    borderRadius: 7,
                    border: "1px solid var(--border-color)",
                    textAlign: "left",
                    color: "var(--text-primary)",
                    background: "var(--bg-secondary)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-color)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(41,98,255,0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px rgba(0,0,0,0.06)";
                  }}
                />
              ) : (
                <div style={{ width: 58, height: 34 }} />
              )}
            </Col>
          </Row>
        ))}
    </div>
  );
}
