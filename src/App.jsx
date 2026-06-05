import { Link, Route, Routes } from "react-router-dom";
import "./App.css";
import Chart from "./pages/Chart";
import Candlestick from "./pages/CandleStick";
import "bootstrap/dist/css/bootstrap.min.css";
import Dashboard from "./pages/dashboard/Dashboard";
import Signup from "./pages/auth/signup";
import Login from "./pages/auth/login";
import { ProtectedRoute } from "./pages/auth/ProtectedRoute";
import Testing from "./pages/Testing";
import Backtest from "./pages/backtest/Backtest";
import "./indicatorLogger";

function App() {
  return (
    <>
      <div>
        {/* Navigation */}
        {/* <nav style={{ display: "flex", gap: "20px" }}>
          <Link to="/">Chart</Link>
          <Link to="/candleStick">CandleStick</Link>
        </nav> */}

        {/* Routes */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/testing" element={<Testing />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/goldchart" element={<Chart />} />
            <Route path="/" element={<Candlestick />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/backtest" element={<Backtest />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
