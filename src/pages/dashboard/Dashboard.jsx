import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import Navbar from "../../components/layout/Navbar";
import Stepper from "../../components/dashboard/Stepper";
import OrderPanel from "../../components/dashboard/OrderPanel";
import SidePanel from "../../components/dashboard/SidePanel";
import { useLocation, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tradeKey = searchParams.get("tradeKey");

  const passedState = tradeKey
    ? JSON.parse(sessionStorage.getItem(tradeKey) || "{}")
    : location.state || {};

  const passedStock = passedState.stock || null;
  const passedAction = passedState.action || null;
  const passedExpiry = passedState.expiry || null;
  const passedPrice = passedState.price || null;

  // 1. Redirect if accessed without a valid stock payload
  useEffect(() => {
    if (!passedStock) {
      navigate("/");
    }
  }, [passedStock, navigate]);

  const [stock, setStock] = useState(passedStock || "");
  const [expiry, setExpiry] = useState(passedExpiry || "");
  const [price, setPrice] = useState(passedPrice || null);
  const [strategy, setStrategy] = useState("Nearest ATM");
  const [preference, setPreference] = useState("ATM");
  
  const isCE = passedStock?.toUpperCase?.().includes(" CE");
  const isPE = passedStock?.toUpperCase?.().includes(" PE");
  
  // 2. Add instrumentType state
  const defaultInstrument = passedExpiry || isCE || isPE ? "OPTIONS" : "EQUITY";
  const [instrumentType, setInstrumentType] = useState(defaultInstrument);

  // Set default product based on instrument type
  const [product, setProduct] = useState(defaultInstrument === "EQUITY" ? "DELIVERY" : "CARRYFORWARD");
  const [orderType, setOrderType] = useState(passedPrice ? "LIMIT" : "MARKET");
  const [qty, setQty] = useState(1);
  const [validity, setValidity] = useState("DAY");

  let initialAction = passedAction;
  if (isCE) {
    initialAction = passedAction === "BUY" ? "BUY_CALL" : passedAction === "SELL" ? "SQ_CALL" : passedAction;
  } else if (isPE) {
    initialAction = passedAction === "BUY" ? "BUY_PUT" : passedAction === "SELL" ? "SQ_PUT" : passedAction;
  } else if (defaultInstrument === "EQUITY") {
    initialAction = passedAction === "BUY" ? "BUY_EQ" : passedAction === "SELL" ? "SELL_EQ" : passedAction;
  }

  const [action, setAction] = useState(initialAction || null);
  const [orders, setOrders] = useState([]);

  // Step 1 = stock selected, Step 2 = strike configured (or N/A), Step 3 = order details, Step 4 = action selected
  const currentStep = (() => {
    if (action) return 4;
    if (product && orderType) return 3;
    if (instrumentType === "OPTIONS") {
      if (strategy && preference) return 2;
    } else {
      // Step 2 is skipped/N/A for Equity
      if (stock) return 2;
    }
    if (stock && (instrumentType === "EQUITY" || expiry)) return 1;
    return 1;
  })();

  const orderState = {
    stock,
    setStock,
    expiry,
    setExpiry,
    price,
    setPrice,
    strategy,
    setStrategy,
    preference,
    setPreference,
    product,
    setProduct,
    orderType,
    setOrderType,
    qty,
    setQty,
    validity,
    setValidity,
    action,
    setAction,
    orders,
    setOrders,
    instrumentType,
    setInstrumentType
  };

  if (!passedStock) return null; // Prevent rendering if redirecting

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <Stepper
          currentStep={currentStep}
          filledSteps={{
            step1: instrumentType === "EQUITY" ? !!stock : !!(stock && expiry),
            step2: instrumentType === "EQUITY" ? true : !!(strategy && preference),
            step3: !!(product && orderType),
            step4: !!action,
          }}
        />
        {/* Order Panel */}
        <div className="main-grid" style={{ display: instrumentType === "EQUITY" ? "block" : "grid" }}>
          <OrderPanel {...orderState} />
          {/* Conditionally render SidePanel based on instrumentType */}
          {instrumentType === "OPTIONS" && (
            <SidePanel stock={stock} expiry={expiry} />
          )}
        </div>
      </div>
      <style>{`
        .x-small { font-size: 0.65rem; }
      `}</style>
    </>
  );
};

export default Dashboard;
