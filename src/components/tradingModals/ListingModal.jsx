import { useState, useEffect } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import { GrBitcoin } from "react-icons/gr";
import { Link } from "react-router-dom";
import { Form, InputGroup, ListGroup } from "react-bootstrap";
import { Spinner } from "./Spinner";
import apiService from "../../services/apiServices";
import { useDebounce } from "../../util/common";

export const ListingModal = ({
  isOpen,
  onClose,
  title,
  selectedCurrency,
  setSelectedCurrency,
  selectedIndicator,
  setSelectedIndicator,
  toggleIndicator,
}) => {
  const [activeTab] = useState("Indicators");
  const [indicators, setIndicators] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchIndicator, setSearchIndicator] = useState("");
  const [searchCurrency, setSearchCurrency] = useState("");

  const debouncedIndicator = useDebounce(searchIndicator, 500);

  // 🔥 Fetch Indicators
  async function fetchIndicators() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post(
        debouncedIndicator
          ? `/equity/getIndicators?q=${debouncedIndicator}`
          : `/equity/getIndicators`,
      );

      setIndicators(response?.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch indicators");
    } finally {
      setLoading(false);
    }
  }

  // 🔥 Fetch Stocks (Currencies replaced)
  async function fetchCurrencies() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get(`equity/stocks`);
      console.log("stocks API response:", response);

      setCurrencies(response?.stocks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (title === "Indicators") fetchIndicators();
    if (title === "Symbol Search") fetchCurrencies();
  }, [title, debouncedIndicator]);

  // 🔍 Indicator Filter
  const filteredIndicators = (indicators ?? []).filter((item) => {
    if (!searchIndicator) return true;

    const search = searchIndicator.toLowerCase().trim();

    const getInitials = (text) =>
      text
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toLowerCase();

    return (
      item.label.toLowerCase().includes(search) ||
      getInitials(item.label).includes(search) ||
      item.slug?.toLowerCase().includes(search)
    );
  });

  // 🔍 Stock Filter
const filteredCurrencies = currencies?.filter((curr) => {
  if (!searchCurrency) return true;

  const search = searchCurrency.toLowerCase().trim();

  const name = curr?.name?.toLowerCase() || "";
  const symbol = curr?.actualSymbol?.toLowerCase() || "";
  const cleanSymbol = symbol.replace("-eq", ""); // 🔥 important
  const userCode = curr?.userCode?.toLowerCase() || "";
  const fullName = curr?.fullName?.toLowerCase() || "";

  return (
    name.includes(search) ||
    symbol.includes(search) ||
    cleanSymbol.includes(search) || // 🔥 handles ABB vs ABB-EQ
    userCode.includes(search) ||
    fullName.includes(search)
  );
});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-99 flex items-center justify-center bg-black/60">
      <div className="w-full px-5 py-4 max-w-3xl h-[90vh] rounded-md bg-white border border-slate-700 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl text-black">{title}</h2>
          <IoCloseSharp
            size={20}
            onClick={onClose}
            className="cursor-pointer text-slate-400"
          />
        </div>

        {/* ================= SYMBOL SEARCH ================= */}

        {title === "Symbol Search" && (
          <div className="py-3">
            {/* Search */}
            <InputGroup className="mb-3">
              <InputGroup.Text>
                <FiSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                autoFocus
                placeholder="Search symbol..."
                value={searchCurrency}
                onChange={(e) => setSearchCurrency(e.target.value)}
              />
            </InputGroup>

            {/* List */}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {loading ? (
                <Spinner />
              ) : filteredCurrencies?.length > 0 ? (
                <ListGroup variant="flush">
                  {filteredCurrencies.map((curr, index) => (
                    <ListGroup.Item
                      key={curr.token || index}
                      action
                      onClick={() => {
                        setSelectedCurrency({
                          symbol: curr.actualSymbol,
                          name: curr.name,
                          token: curr.token,
                        });
                        onClose();
                      }}
                      className="d-flex justify-content-between align-items-center"
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        {/* <span className="text-warning">
                          <GrBitcoin />
                        </span> */}

                        <div className="text-uppercase fw-medium small">
                          {curr?.name} ({curr?.actualSymbol})
                        </div>
                      </div>

                      <div>
                        <small className="text-muted">{curr?.userCode}</small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-center text-dark py-3">No Data found</p>
              )}
            </div>
          </div>
        )}

        {/* ================= INDICATORS ================= */}
        {title === "Indicators" && (
          <div className="mt-3" style={{ maxHeight: "70vh" }}>
            {/* Search */}
            <InputGroup className="mb-3">
              <InputGroup.Text>
                <FiSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                autoFocus
                placeholder="Search indicators"
                value={searchIndicator}
                onChange={(e) => setSearchIndicator(e.target.value)}
              />
            </InputGroup>

            {/* List */}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {loading ? (
                <Spinner />
              ) : filteredIndicators.length > 0 ? (
                <ListGroup variant="flush">
                  {filteredIndicators.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Form.Check
                        type="checkbox"
                        label={`${item.label} -- ${item.slug}`}
                        checked={selectedIndicator.includes(item.slug)}
                        onChange={() => toggleIndicator(item.slug)}
                      />
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted">No Data found</p>
              )}
            </div>
          </div>
        )}

        {/* ================= ALERT ================= */}
        {title === "Alerts" && (
          <div>
            <h1>Create Alert</h1>
          </div>
        )}
      </div>
    </div>
  );
};
