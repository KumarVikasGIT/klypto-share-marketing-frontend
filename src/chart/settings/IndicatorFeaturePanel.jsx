import InputControl from "./InputControl";
import StyleControl from "./StyleControl";
import VisibilityControl from "./VisibilityControl";

const SECTION_TITLES = {
  inputs: "Inputs",
  style: "Style",
  visibility: "Visibility",
  levels: "Levels",
  colors: "Colors",
  alerts: "Alerts",
};

const PANEL_STYLE = {
  display: "grid",
  gap: 14,
  color: "var(--text-primary)",
};

const SECTION_STYLE = {
  border: "1px solid var(--border-color)",
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.68)",
  padding: "12px 14px",
};

const TITLE_STYLE = {
  margin: "0 0 8px",
  color: "var(--text-primary)",
  fontSize: "0.8rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function getFeatureGroups(contract) {
  const features = contract?.features || {};
  return {
    inputs: Array.isArray(features.inputs) ? features.inputs : [],
    style: Array.isArray(features.style) ? features.style : [],
    visibility: Array.isArray(features.visibility) ? features.visibility : [],
    levels: Array.isArray(features.levels) ? features.levels : [],
    colors: Array.isArray(features.colors) ? features.colors : [],
    alerts: Array.isArray(features.alerts) ? features.alerts : [],
  };
}

function ControlForGroup({ group, item, values, onFieldChange }) {
  const value = values?.[group]?.[item.key] ?? values?.[item.key] ?? item.default;

  if (group === "style" || group === "colors" || group === "levels") {
    return (
      <StyleControl
        key={item.key}
        item={item}
        value={value}
        onChange={(key, nextValue) => onFieldChange(group, key, nextValue)}
      />
    );
  }

  if (group === "visibility") {
    return (
      <VisibilityControl
        key={item.key}
        item={item}
        value={value}
        onChange={(key, nextValue) => onFieldChange(group, key, nextValue)}
      />
    );
  }

  return (
    <InputControl
      key={item.key}
      item={item}
      value={value}
      onChange={(key, nextValue) => onFieldChange(group, key, nextValue)}
    />
  );
}

const IndicatorFeaturePanel = ({
  contract,
  values = {},
  onChange,
  onRerun,
}) => {
  const groups = getFeatureGroups(contract);
  const hasFeatures = Object.values(groups).some((items) => items.length > 0);

  const handleFieldChange = (group, key, value) => {
    const nextValues = {
      ...values,
      [group]: {
        ...(values[group] || {}),
        [key]: value,
      },
    };
    onChange?.(nextValues);
    onRerun?.(nextValues);
  };

  if (!hasFeatures) {
    return (
      <div style={SECTION_STYLE}>
        <h3 style={TITLE_STYLE}>Indicator Settings</h3>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.82rem" }}>
          This indicator did not publish configurable features yet.
        </p>
      </div>
    );
  }

  return (
    <div style={PANEL_STYLE}>
      {Object.entries(groups).map(([group, items]) => {
        if (items.length === 0) return null;
        return (
          <section key={group} style={SECTION_STYLE}>
            <h3 style={TITLE_STYLE}>{SECTION_TITLES[group] || group}</h3>
            {items.map((item) => (
              <ControlForGroup
                key={item.key}
                group={group}
                item={item}
                values={values}
                onFieldChange={handleFieldChange}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
};

export default IndicatorFeaturePanel;
