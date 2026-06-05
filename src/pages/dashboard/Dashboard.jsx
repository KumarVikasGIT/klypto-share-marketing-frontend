import React, { useState } from "react";
import "./Dashboard.css";
import Navbar from "../../components/layout/Navbar";
// import Header from "../../components/dashboard/Header";
import Stepper from "../../components/dashboard/Stepper";
import OrderPanel from "../../components/dashboard/OrderPanel";
import SidePanel from "../../components/dashboard/SidePanel";
import OrderBook from "../../components/dashboard/OrderBook";
import { useLocation } from "react-router-dom";

const Dashboard = () => {
  const location = useLocation();

  const passedStock = location.state?.stock || null;
  const passedAction = location.state?.action || null;
  const passedExpiry = location.state?.expiry || null;
  const [stock, setStock] = useState(passedStock || "");
  const [expiry, setExpiry] = useState(passedExpiry || "");
  const [strategy, setStrategy] = useState("Nearest ATM");
  const [preference, setPreference] = useState("ATM");
  const [product, setProduct] = useState("CARRYFORWARD");
  const [orderType, setOrderType] = useState("MARKET");
  const [qty, setQty] = useState(1);
  const [validity, setValidity] = useState("DAY");
  const [action, setAction] = useState(
    passedAction === "BUY"
      ? "BUY_CALL"
      : passedAction === "SELL"
        ? "BUY_PUT"
        : null,
  );
  const [orders, setOrders] = useState([]);

  // Step 1 = stock selected, Step 2 = strike configured, Step 3 = order details, Step 4 = action selected
  const currentStep = (() => {
    if (action) return 4;
    if (product && orderType) return 3;
    if (strategy && preference) return 2;
    if (stock && expiry) return 1;
    return 1;
  })();

  const orderState = {
    stock,
    setStock,
    expiry,
    setExpiry,
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
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        {/* <Header /> */}
      <Stepper
        currentStep={currentStep}
        filledSteps={{
          step1: !!(stock && expiry),
          step2: !!(strategy && preference),
          step3: !!(product && orderType),
          step4: !!action,
        }}
      />
      {/* Order Panel */}
      <div className="main-grid">
        <OrderPanel {...orderState} />
        <SidePanel stock={stock} expiry={expiry} />
      </div>

      </div>
      <style>{`
        .x-small { font-size: 0.65rem; }
      `}</style>
    </>
  );
};

export default Dashboard;
