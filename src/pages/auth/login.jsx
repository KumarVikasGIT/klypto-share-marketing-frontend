import { useState, useEffect } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import apiService from "../../services/apiServices";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "./protected";
import Swal from "sweetalert2";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateOneByOne = () => {
    if (!form.email) return { field: "email", message: "Email is required" };
    if (!/\S+@\S+\.\S+/.test(form.email))
      return { field: "email", message: "Invalid email format" };
    if (!form.password)
      return { field: "password", message: "Password is required" };
    if (form.password.length < 6)
      return { field: "password", message: "Minimum 6 characters required" };
    return null;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstError = validateOneByOne();
    if (firstError) {
      setErrors({ [firstError.field]: firstError.message });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password };
      const response = await apiService.post("/auth/login", payload);
      console.log("LOGIN RESPONSE 👉", response);

      const token = response?.token || response?.data?.token;
      const user = response?.user || response?.data?.user;
      if (!token) throw new Error("Token not received");

      const sessionData = { token, user };
      if (form.remember)
        localStorage.setItem("session", JSON.stringify(sessionData));
      else sessionStorage.setItem("session", JSON.stringify(sessionData));

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: "Welcome back!",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/");
    } catch (error) {
      const message =
        error?.response?.data?.message || error.message || "Login failed";
      console.error("Login error:", error);
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: message,
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#090e16",
      fontFamily: "'Inter', sans-serif",
    },
    card: {
      width: 400,
      borderRadius: 16,
      background: "var(--bg-primary)",
      border: "1px solid var(--bg-secondary)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      padding: 32,
    },
    logoWrap: {
      width: 42,
      height: 42,
      borderRadius: 10,
      background: "linear-gradient(135deg,var(--accent-color),#7c3aed)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
    },
    title: {
      textAlign: "center",
      fontWeight: 700,
      fontSize: "1.15rem",
      color: "#f3f4f6",
      marginBottom: 4,
    },
    sub: {
      textAlign: "center",
      fontSize: "0.8rem",
      color: "#6b7280",
      marginBottom: 28,
    },
    label: {
      display: "block",
      fontSize: "0.75rem",
      fontWeight: 600,
      color: "var(--text-secondary)",
      marginBottom: 6,
      letterSpacing: "0.04em",
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: 8,
      color: "#f3f4f6",
      padding: "10px 14px",
      fontSize: "0.875rem",
      outline: "none",
      transition: "border-color 0.15s",
    },
    inputError: { borderColor: "#ef4444" },
    errorMsg: { fontSize: "0.72rem", color: "#f87171", marginTop: 5 },
    group: { marginBottom: 18 },
    btn: {
      width: "100%",
      padding: "11px",
      borderRadius: 8,
      border: "none",
      background: "linear-gradient(135deg,var(--accent-color),#7c3aed)",
      color: "#fff",
      fontWeight: 700,
      fontSize: "0.875rem",
      cursor: "pointer",
      marginTop: 8,
      letterSpacing: "0.03em",
      transition: "opacity 0.15s",
    },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    eyeBtn: {
      position: "absolute",
      top: "50%",
      right: 12,
      transform: "translateY(-50%)",
      cursor: "pointer",
      color: "#6b7280",
      background: "none",
      border: "none",
      padding: 0,
      display: "flex",
      alignItems: "center",
    },
    checkRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 20,
    },
    checkLabel: { fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="white"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <div style={s.title}>Welcome back</div>
        <div style={s.sub}>Sign in to your account to continue</div>

        <form noValidate onSubmit={handleSubmit}>
          {/* Email */}
          <div style={s.group}>
            <label style={s.label}>Email address</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              style={{ ...s.input, ...(errors.email ? s.inputError : {}) }}
              onFocus={(e) =>
                (e.target.style.borderColor = errors.email
                  ? "#ef4444"
                  : "var(--accent-color)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = errors.email
                  ? "#ef4444"
                  : "var(--border-color)")
              }
              placeholder="you@example.com"
            />
            {errors.email && <div style={s.errorMsg}>⚠ {errors.email}</div>}
          </div>

          {/* Password */}
          <div style={s.group}>
            <label style={s.label}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                style={{
                  ...s.input,
                  paddingRight: 40,
                  ...(errors.password ? s.inputError : {}),
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.password
                    ? "#ef4444"
                    : "var(--accent-color)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.password
                    ? "#ef4444"
                    : "var(--border-color)")
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {errors.password && (
              <div style={s.errorMsg}>⚠ {errors.password}</div>
            )}
          </div>

          {/* Remember me */}
          <div style={s.checkRow}>
            <input
              type="checkbox"
              id="remember"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
              style={{
                accentColor: "var(--accent-color)",
                width: 15,
                height: 15,
                cursor: "pointer",
              }}
            />
            <label htmlFor="remember" style={s.checkLabel}>
              Remember me
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.opacity = "1";
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
