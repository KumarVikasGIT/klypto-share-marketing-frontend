import React, { useState } from "react";
import { IoEyeOutline, IoEyeOffOutline, IoSettingsOutline, IoCloseSharp } from "react-icons/io5";
import { FiMoreHorizontal } from "react-icons/fi";
import { FaCode } from "react-icons/fa";

export default function IndicatorBar({
  indicator,
  timeframeValue,
  value,
  renderValue,
  indicatorVisibility,
  toggleIndicatorVisibility,
  removeIndicator,
  setActiveBarIndicator,
  setIndicatorProperty,
  setActiveSourceIndicator,
  setShowSourcePanel,
  type,
  indicatorConfigDefault,
  indicatorConfigs
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Reconstruct configuration string (e.g., "14 close")
  const cfg = {
    ...(indicatorConfigDefault?.[type] || {}),
    ...(indicatorConfigs?.[indicator] || {}),
  };
  const len = cfg?.length ?? cfg?.baseLen ?? "";
  const src = cfg?.source ?? "";
  const configString = `${len}${src ? " " + src : ""}`;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: isHovered ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.2)",
        border: isHovered ? "1px solid white" : "1px solid transparent",
        borderRadius: 6,
        color: "var(--text-primary)",
        padding: "2px 8px",
        height: 24,
        fontSize: 12,
        whiteSpace: "nowrap",
        transition: "all 0.2s ease-in-out"
      }}
    >

      <span className="flex items-center gap-2 text-[var(--text-secondary)]">

        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {type}
        </span>
        {" : "}
        {configString && <span>{configString}</span>}

        <span style={{ display: "flex", gap: 6 }}>
          {renderValue(indicator, value)}
        </span>

      </span>

      <div 
        className="text-[var(--text-secondary)]"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: isHovered ? 1 : 0,
          visibility: isHovered ? "visible" : "hidden",
          transition: "opacity 0.2s ease-in-out"
        }}
      >

        <button
          onClick={() => toggleIndicatorVisibility(indicator)}
        >
          {indicatorVisibility[indicator] ?
            <IoEyeOutline size={16} /> :
            <IoEyeOffOutline size={16} />
          }
        </button>

        <button
          onClick={() => {
            setActiveBarIndicator(indicator);
            setIndicatorProperty((prev) => !prev);
          }}
        >
          <IoSettingsOutline size={16} />
        </button>

        <button
          onClick={() => {
            setActiveSourceIndicator(indicator);
            setShowSourcePanel(true);
          }}
        >
          <FaCode size={16} />
        </button>

        <button onClick={() => removeIndicator(indicator)}>
          <IoCloseSharp size={16} />
        </button>

        <FiMoreHorizontal size={16} />

      </div>

    </div>
  );
}