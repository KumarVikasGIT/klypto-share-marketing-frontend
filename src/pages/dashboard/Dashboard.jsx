import React, { useState } from "react";
import "./Dashboard.css";
import Header from "./components/Header";
import Stepper from "./components/Stepper";
import OrderPanel from "./components/OrderPanel";
import SidePanel from "./components/SidePanel";
import OrderBook from "./components/OrderBook";

const Dashboard = () => {
  const [stock, setStock] = useState("");
  const [expiry, setExpiry] = useState("");
  const [strategy, setStrategy] = useState("");
  const [preference, setPreference] = useState("");
  const [product, setProduct] = useState("");
  const [orderType, setOrderType] = useState("");
  const [qty, setQty] = useState(1);
  const [validity, setValidity] = useState("DAY");
  const [action, setAction] = useState(null);
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
  };

  return (
    <div className="dashboard-container">
      <Header />
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
        <SidePanel stock={stock} />
      </div>
      {/* Order Book */}
      <div>
        <OrderBook orders={orders} setOrders={setOrders} />
      </div>
      <style>{`
        .x-small { font-size: 0.65rem; }
        select.input-dark {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 30px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
