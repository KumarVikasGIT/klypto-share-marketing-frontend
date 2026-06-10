import { FiPlus } from "react-icons/fi";
import { VscGraphLine } from "react-icons/vsc";
import { useState, useEffect } from "react";
import { ListingModal } from "./ListingModal";
import apiService from "../../services/apiServices";
import { Form } from "react-bootstrap";
import { MdAlarmAdd } from "react-icons/md";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FiChevronDown } from "react-icons/fi";
import { chartOptions } from "../../util/common";
import { EditableNumber } from "../indicator/EditTableLabel";
import { isAuthenticated, logout } from "../../pages/auth/protected";
import { Navigate, useNavigate } from "react-router-dom";
import ProfileDropDown from "../auth/profile/ProfileDropDown";

const d = {
  bar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "4px 16px",
    background: "var(--bg-primary)",
    borderBottom: "1px solid var(--bg-secondary)",
    flexWrap: "wrap",
  },
  btn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    color: "var(--text-primary)",
    padding: "6px 14px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    height: 36,
    whiteSpace: "nowrap",
  },
  btnPrimary: {
    display: "flex", alignItems: "center", gap: 6,
    background: "var(--accent-color)",
    border: "1px solid var(--accent-color)",
    borderRadius: 6,
    color: "var(--text-primary)",
    padding: "6px 14px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    height: 36,
  },
  select: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    color: "var(--text-primary)",
    padding: "6px 10px",
    fontSize: "0.8rem",
    height: 36,
    width: 120,
    cursor: "pointer",
  },
  dateInput: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    color: "var(--text-primary)",
    height: 36,
    fontSize: "0.78rem",
    padding: "0 8px",
  },
  divider: {
    width: 1, height: 24, background: "var(--bg-secondary)", flexShrink: 0,
  },
  dropdownContent: {
    background: "var(--bg-primary)",
    border: "1px solid var(--bg-secondary)",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    padding: 6,
    zIndex: 999,
    minWidth: 160,
  },
  dropdownItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px",
    borderRadius: 6,
    color: "var(--text-primary)",
    fontSize: "0.8rem",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    width: "100%",
  },
};

export default function ChartHeader({
  timeframeValue,
  setTimeframeValue,
  selectedCurrency,
  selectedIndicator,
  setSelectedIndicator,
  setSelectedCurrency,
  toggleIndicator,
  setChartType,
  chartType,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  setAlertResult,
  alertResult,
  addAlert,
  onOpenScanner,
}) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const active = chartOptions.find((c) => c.value === chartType);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = tomorrow.toISOString().split("T")[0];

  const [modalConfig, setModalConfig] = useState({ open: false, title: "", items: [] });

  const openModal  = (title, items) => setModalConfig({ open: true, title, items });
  const closeModal = () => setModalConfig((prev) => ({ ...prev, open: false }));

  async function fetchTimeframe() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.post("/equity/getTimeFrames");
      setTimeframe(response.data);
      setTimeframeValue(timeframeValue);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch timeframes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTimeframe(); }, []);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0, fontSize: "0.85rem" }}>
      <div style={d.bar}>

        {/* Symbol button */}
        <button title="Symbol Search" onClick={() => openModal("Symbol Search")} style={{ ...d.btn, fontWeight: 700, borderRadius: 20, padding: "6px 18px" }}>
          {selectedCurrency?.name || "TCS"}
        </button>

        {/* <div style={d.divider} /> */}

        {/* Timeframe select */}
        <div title={timeframeValue}>
          <select
            value={timeframeValue || "1m"}
            onChange={(e) => setTimeframeValue(e.target.value)}
            style={d.select}
          >
            {!timeframe && <option value="1m">1 Minute</option>}
            {timeframe && Object.keys(timeframe).length === 0 && <option value="1m">1 Minute</option>}
            {timeframe && Object.entries(timeframe)?.map(([group, items]) => (
              <optgroup key={group} label={group?.toUpperCase()} style={{ background: "var(--bg-secondary)" }}>
                {items?.map((item) => (
                  <option key={item?.seconds} value={item?.value} style={{ background: "var(--bg-secondary)" }}>
                    {item?.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div style={d.divider} />

        {/* Chart type dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button style={d.btn}>
              {active?.icon && <active.icon size={15} />}
              <span>{active?.label}</span>
              <FiChevronDown size={13} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content sideOffset={6} style={d.dropdownContent}>
              {chartOptions.map((item) => (
                <DropdownMenu.Item key={item.value} asChild>
                  <button
                    onClick={() => setChartType(item.value)}
                    style={{
                      ...d.dropdownItem,
                      background: chartType === item.value ? "var(--bg-secondary)" : "transparent",
                      color: chartType === item.value ? "var(--accent-color)" : "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => { if (chartType !== item.value) e.currentTarget.style.background = "var(--bg-secondary)"; }}
                    onMouseLeave={(e) => { if (chartType !== item.value) e.currentTarget.style.background = "transparent"; }}
                  >
                    <item.icon size={15} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {chartType === item.value && <span style={{ color: "var(--accent-color)", fontSize: "0.7rem" }}>✓</span>}
                  </button>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <div style={d.divider} />

        {/* Indicators */}
        <button title="Indicators" onClick={() => openModal("Indicators")} style={d.btn}>
          <VscGraphLine size={15} />
          <span>Indicators</span>
        </button>

        {/* Date pickers */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
          <input
            type="date"
            value={fromDate}
            max={maxDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={d.dateInput}
          />
          <input
            type="date"
            value={toDate}
            max={maxDate}
            onChange={(e) => setToDate(e.target.value)}
            style={d.dateInput}
          />
        </div>

        {/* Spacer */}
        {/* <div style={{ flex: 1 }} /> */}
        <button title="Create Alert" onClick={onOpenScanner} style={d.btn}>
          Create Alert
        </button>

        {/* Auth button
        {isAuthenticated ? (
          <button title="Logout" onClick={() => { logout(); navigate("/login"); }} style={d.btnPrimary}>
            <span>Logout</span>
          </button>
        ) : (
          <button title="Signup" onClick={() => navigate("/signup")} style={d.btnPrimary}>
            <span>Signup</span>
          </button>
        )} */}

        {/* <ProfileDropDown /> */}
      </div>

      <ListingModal
        isOpen={modalConfig.open}
        onClose={closeModal}
        title={modalConfig.title}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        selectedIndicator={selectedIndicator}
        setSelectedIndicator={setSelectedIndicator}
        toggleIndicator={toggleIndicator}
        setAlertResult={setAlertResult}
        alertResult={alertResult}
        timeframeValue={timeframeValue}
        onSubmit={(data) => {
          if (addAlert) addAlert(data);
          closeModal();
        }}
      />
    </div>
  );
}