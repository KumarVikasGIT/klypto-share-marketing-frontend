import React, { useState, useEffect } from "react";
import { Form } from "react-bootstrap";

const COLORS = [
  "#ffffff","#d9d9d9","#bfbfbf","#a6a6a6","#8c8c8c","#737373","#595959","#404040","#262626","#000000",
  "#f28b82","#fbbc04","#fff475","#ccff90","#a7ffeb","#a0e7e5","#8ab4f8","var(--accent-color)","#d580ff","#ff8fab",
  "#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd","#f4cccc","#ead1dc",
  "#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0","#f4b6c2","#e6b8af",
  "#cc0000","#ff9900","#ffff00","#00ff00","#00ffff","#00a2e8","#3c78d8","#674ea7","#a64d79","#ff00ff",
  "#990000","#e69138","#f1c232","#274e13","#134f5c","#0b5394","#351c75","#741b47",
];

/* ================= UTILS ================= */

export const getColorFromRGBA = (colorStr) => {
  if (!colorStr) return "var(--accent-color)";
  if (colorStr.startsWith("#")) return colorStr;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "var(--accent-color)";
  const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
  const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
  const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
};

export const getOpacityFromRGBA = (colorStr) => {
  if (!colorStr || colorStr.startsWith("#")) return 100;
  // This captures the last number (the alpha) in the rgba string
  const match = colorStr.match(/rgba?\(.*,\s*([\d.]+)\)/);
  return match ? Math.round(parseFloat(match[1]) * 100) : 100;
};

const hexToRGBA = (hex, op) => {
  if (!hex || hex.includes('NaN') || hex?.length < 7) return `rgba(41, 98, 255, ${op / 100})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${op / 100})`;
};

/* ================= COMPONENT ================= */

export default function ColorPalettePanel({
  mode = "line", // "line" or "fill"
  currentStyle = {},
  onChange,
}) {
  /**
   * ⭐ AGNOSTIC SOURCE DETECTION
   * Instead of checking for "obFill", we check which key exists in the object.
   * We prioritize the "main" color (index 2) so the opacity slider doesn't get stuck at 2%.
   */
  const getPrimarySource = () => {
    return (
      currentStyle.topFillColor2 || 
      currentStyle.bottomFillColor2 || 
      currentStyle.color || 
      currentStyle.topFillColor1 || 
      currentStyle.bottomFillColor1 || 
      "var(--accent-color)"
    );
  };

  const [color, setColor] = useState(() => getColorFromRGBA(getPrimarySource()));
  const [opacity, setOpacity] = useState(() => getOpacityFromRGBA(getPrimarySource()));
  const [width, setWidth] = useState(currentStyle.width ?? 2);
  const [lineStyle, setLineStyle] = useState(currentStyle.lineStyle ?? 0);

  // Sync internal state when the user selects a different row
  useEffect(() => {
    const source = getPrimarySource();
    setColor(getColorFromRGBA(source));
    setOpacity(getOpacityFromRGBA(source));
    setWidth(currentStyle.width ?? 2);
    setLineStyle(currentStyle.lineStyle ?? 0);
  }, [currentStyle]);

  const previewColor = hexToRGBA(color, opacity);

  const updateLine = (updates = {}) => {
    const newColor = updates.color ?? color;
    const newOpacity = updates.opacity ?? opacity;
    onChange({
      color: hexToRGBA(newColor, newOpacity),
      opacity: newOpacity,
      width: updates.width ?? width,
      lineStyle: updates.lineStyle ?? lineStyle,
    });
  };

 const updateFill = (hexColor, op = opacity) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const main = `rgba(${r},${g},${b},${op / 100})`;
  const faint = `rgba(${r},${g},${b},${(op / 100) * 0.25})`;

  if (currentStyle.topFillColor2 !== undefined) {
    onChange({ topFillColor1: faint, topFillColor2: main });
  } 
  else if (currentStyle.bottomFillColor2 !== undefined) {
    onChange({ bottomFillColor1: faint, bottomFillColor2: main });
  } 
  else if (currentStyle.topFillColor1 !== undefined) {
    onChange({ topFillColor1: main });
  } 
  else if (currentStyle.bottomFillColor1 !== undefined) {
    onChange({ bottomFillColor1: faint });
  } 
  else {
    onChange({ color: main });
  }
};

  const selectColor = (c) => {
    setColor(c);
    if (mode === "line") updateLine({ color: c });
    else updateFill(c, opacity);
  };

  const updateOpacity = (v) => {
    setOpacity(v);
    if (mode === "line") updateLine({ opacity: v });
    else updateFill(color, v);
  };

  return (
    <div style={{ width: 300, padding: 14, background: "var(--bg-secondary, #f7f7f7)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", color: "var(--text-primary)" }}>
      {/* PREVIEW BOX */}
      <div style={{ height: 40, background: "var(--bg-primary, #fff)", borderRadius: 6, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-color, #ddd)" }}>
        {mode === "line" ? (
          <div style={{ width: 80, borderTop: lineStyle === 2 ? `${width}px dashed ${previewColor}` : lineStyle === 1 ? `${width}px dotted ${previewColor}` : `${width}px solid ${previewColor}` }} />
        ) : (
          <div style={{ width: 80, height: 20, borderRadius: 4, background: previewColor }} />
        )}
      </div>

      {/* COLOR GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 6, marginBottom: 12 }}>
        {COLORS.map((c, i) => (
          <div key={i} onClick={() => selectColor(c)} style={{ width: 22, height: 22, borderRadius: 4, background: c, cursor: "pointer", border: c.toLowerCase() === color.toLowerCase() ? "2px solid #4c8bf5" : "1px solid var(--border-color, #ccc)" }} />
        ))}
      </div>

      {/* OPACITY SLIDER */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span>Opacity</span>
          <span>{opacity}%</span>
        </div>
        <Form.Range min={0} max={100} value={opacity} onChange={(e) => updateOpacity(Number(e.target.value))} />
      </div>

      {mode === "line" && (
        <>
          {/* THICKNESS */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>Thickness</div>
            <div style={{ display: "flex" }}>
              {[1, 2, 3, 4].map((w) => (
                <div key={w} onClick={() => updateLine({ width: w })} style={{ flex: 1, height: 36, background: width === w ? "var(--bg-primary, #2c2c2e)" : "transparent", border: "1px solid var(--border-color, #e9ecef)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <div style={{ height: w, width: 28, background: width === w ? "var(--text-primary, #fff)" : "var(--text-secondary, #333)" }} />
                </div>
              ))}
            </div>
          </div>

          {/* LINE STYLE */}
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>Line style</div>
            <div style={{ display: "flex" }}>
              {[{ v: 0 }, { v: 2 }, { v: 1 }].map(({ v }) => (
                <div key={v} onClick={() => updateLine({ lineStyle: v })} style={{ flex: 1, height: 36, background: lineStyle === v ? "var(--bg-primary, #2c2c2e)" : "transparent", border: "1px solid var(--border-color, #e9ecef)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <div style={{ width: 30, borderTop: v === 2 ? "2px dashed " + (lineStyle === v ? "var(--text-primary, #fff)" : "var(--text-secondary, #333)") : v === 1 ? "2px dotted " + (lineStyle === v ? "var(--text-primary, #fff)" : "var(--text-secondary, #333)") : "2px solid " + (lineStyle === v ? "var(--text-primary, #fff)" : "var(--text-secondary, #333)") }} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}