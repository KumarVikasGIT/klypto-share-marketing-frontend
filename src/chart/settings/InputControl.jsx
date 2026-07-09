const FIELD_STYLE = {
  display: "grid",
  gap: 6,
  padding: "10px 0",
};

const LABEL_STYLE = {
  color: "var(--text-secondary)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const INPUT_STYLE = {
  width: "100%",
  minHeight: 34,
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  padding: "7px 9px",
};

function getDefaultValue(item) {
  if (item?.default !== undefined) return item.default;
  if (item?.type === "boolean") return false;
  return "";
}

function coerceValue(item, rawValue) {
  const type = String(item?.type || "").toLowerCase();
  if (type === "number" || type === "slider") {
    const numberValue = Number(rawValue);
    return Number.isFinite(numberValue) ? numberValue : getDefaultValue(item);
  }
  if (type === "boolean") return Boolean(rawValue);
  return rawValue;
}

const InputControl = ({ item, value, onChange }) => {
  const type = String(item?.type || "text").toLowerCase();
  const currentValue = value ?? getDefaultValue(item);
  const label = item?.label || item?.key || "Setting";

  if (type === "boolean") {
    return (
      <label style={{ ...FIELD_STYLE, gridTemplateColumns: "1fr auto", alignItems: "center" }}>
        <span style={LABEL_STYLE}>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(currentValue)}
          onChange={(event) => onChange?.(item.key, event.target.checked)}
        />
      </label>
    );
  }

  if (type === "color") {
    return (
      <label style={FIELD_STYLE}>
        <span style={LABEL_STYLE}>{label}</span>
        <input
          type="color"
          value={currentValue || "#3b82f6"}
          onChange={(event) => onChange?.(item.key, event.target.value)}
          style={{ ...INPUT_STYLE, height: 38, padding: 4 }}
        />
      </label>
    );
  }

  if (type === "source" || Array.isArray(item?.options)) {
    return (
      <label style={FIELD_STYLE}>
        <span style={LABEL_STYLE}>{label}</span>
        <select
          value={currentValue}
          onChange={(event) => onChange?.(item.key, event.target.value)}
          style={INPUT_STYLE}
        >
          {(item.options || []).map((option) => {
            const optionValue = typeof option === "object" ? option.value : option;
            const optionLabel = typeof option === "object" ? option.label : option;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  if (type === "slider") {
    return (
      <label style={FIELD_STYLE}>
        <span style={LABEL_STYLE}>
          {label}: {currentValue}
        </span>
        <input
          type="range"
          min={item.min}
          max={item.max}
          step={item.step || 1}
          value={currentValue}
          onChange={(event) =>
            onChange?.(item.key, coerceValue(item, event.target.value))
          }
        />
      </label>
    );
  }

  return (
    <label style={FIELD_STYLE}>
      <span style={LABEL_STYLE}>{label}</span>
      <input
        type={type === "number" ? "number" : "text"}
        min={item?.min}
        max={item?.max}
        step={item?.step || (type === "number" ? 1 : undefined)}
        value={currentValue}
        onChange={(event) =>
          onChange?.(item.key, coerceValue(item, event.target.value))
        }
        style={INPUT_STYLE}
      />
    </label>
  );
};

export default InputControl;
