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
}) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const active = chartOptions.find((c) => c.value === chartType);

  const [modalConfig, setModalConfig] = useState({
    open: false,
    title: "",
    items: [],
  });

  const openModal = (title, items) => {
    setModalConfig({
      open: true,
      title,
      items,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, open: false }));
  };

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

  useEffect(() => {
    fetchTimeframe();
  }, []);

  return (
    <div className="w-100 d-flex flex-column gap-3 small">
      <div className="d-flex align-items-center gap-3 px-3 py-2 bg-white shadow-sm">
        {/* Name/Symbol Button */}
        <button
          title="Symbol Search"
          onClick={() => openModal("Symbol Search")}
          className="btn btn-light fw-bold rounded-pill px-4"
          style={{ height: 40 }}
        >
          {selectedCurrency?.name || "TCS"}
        </button>

        {/* Divider */}
        <div className="vr" />

        {/* TimeFrame Dropdown */}
        <div title={timeframeValue}>
          <select
            value={timeframeValue ? timeframeValue : "1m"}
            onChange={(e) => setTimeframeValue(e.target.value)}
            className="form-select form-select-sm "
            style={{ height: 40, width: 120 }}
          >
            {!timeframe && <option value="1m">1 Minute</option>}

            {timeframe && Object.keys(timeframe).length === 0 && (
              <option value="1m">1 Minute</option>
            )}

            {timeframe &&
              Object.entries(timeframe)?.map(([group, items]) => (
                <optgroup key={group} label={group?.toUpperCase()}>
                  {items?.map((item) => (
                    <option key={item?.seconds} value={item?.value}>
                      {item?.label}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </div>

        {/* Divider */}
        <div className="vr" />

        {/* Chart Type Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="btn btn-light d-flex align-items-center gap-2">
              {active?.icon && <active.icon size={16} />}
              <span>{active?.label}</span>
              <FiChevronDown size={14} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              className="bg-white border rounded shadow z-999 p-2"
            >
              {chartOptions.map((item) => (
                <DropdownMenu.Item
                  key={item.value}
                  onClick={() => setChartType(item.value)}
                  className="d-flex align-items-center gap-2 px-3 py-2 rounded"
                >
                  <item.icon size={16} />
                  <span className="flex-grow-1">{item.label}</span>

                  {chartType === item.value && (
                    <span className="badge bg-primary">✓</span>
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Divider */}
        <div className="vr" />

        {/* Action Buttons */}
        <div className="d-flex align-items-center w-full gap-2">
          {/* Range */}
          {/* <div className="d-flex align-items-center gap-2">
            <label className="mb-0">Range:</label>
            <input
              type="number"
              min="10"
              defaultValue="10"
              className="form-control form-control-sm"
              style={{ width: 90, height: 40 }}
            />
          </div> */}

          {/* Indicators */}
          <button
            title="Indicators"
            onClick={() => openModal("Indicators")}
            className="btn btn-light d-flex align-items-center gap-2"
          >
            <VscGraphLine />
            <span>Indicators</span>
          </button>

          {/* Alert */}
          {/* <button
            title="Create Alert"
            onClick={() => openModal("Alerts")}
            className="btn btn-light d-flex align-items-center gap-2"
          >
            <MdAlarmAdd />
            <span>Alert</span>
          </button> */}

          {/* Simulation */}
          {/* <button
            title="Simulation"
            onClick={() => openModal("Simulation")}
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <FiPlus />
            <span>Simulation</span>
          </button> */}

          <div className="d-flex align-items-center gap-2 ms-3">
            {/* FROM DATE */}
            <Form.Group controlId="fromDate">
              <Form.Control
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ height: "36px", fontSize: "12px" }}
              />
            </Form.Group>

            {/* TO DATE */}
            <Form.Group controlId="toDate">
              <Form.Control
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ height: "36px", fontSize: "12px" }}
              />
            </Form.Group>
          </div>
        </div>
        <div className="flex justify-end ">
          {isAuthenticated ? (
            <button
              title="Logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <span>Logout</span>
            </button>
          ) : (
            <button
              title="Signup"
              onClick={() => {
                navigate("/signup");
              }}
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <span>Signup</span>
            </button>
          )}
        </div>
        <ProfileDropDown />
      </div>

      {/* MODAL (UNCHANGED) */}
      <ListingModal
        isOpen={modalConfig.open}
        onClose={closeModal}
        title={modalConfig.title}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        selectedIndicator={selectedIndicator}
        setSelectedIndicator={setSelectedIndicator}
        toggleIndicator={toggleIndicator}
      />
    </div>
  );
}
