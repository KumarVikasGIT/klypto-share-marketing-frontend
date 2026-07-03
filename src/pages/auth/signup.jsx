import { useState, useEffect } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import apiService from "../../services/apiServices";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "./protected";
import PhoneInputImport from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Swal from "sweetalert2";
const PhoneInput = PhoneInputImport.default;

export default function Signup() {
  console.log("PhoneInput:", PhoneInput);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    country: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneUI, setPhoneUI] = useState("");

  // Returns the first error found as { field, message }, or null if all valid
  const validateOneByOne = () => {
    if (!form.firstName.trim())
      return { field: "firstName", message: "First name is required" };

    if (!form.lastName.trim())
      return { field: "lastName", message: "Last name is required" };

    if (!form.email) return { field: "email", message: "Email is required" };
    if (!/\S+@\S+\.\S+/.test(form.email))
      return { field: "email", message: "Invalid email format" };

    if (!form.password)
      return { field: "password", message: "Password is required" };
    if (form.password.length < 6)
      return { field: "password", message: "Minimum 6 characters required" };

    if (!form.mobile || form.mobile.length < 10) {
      return { field: "mobile", message: "Invalid mobile number" };
    }

    if (!form.country.trim())
      return { field: "country", message: "Country is required" };

    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field as user types
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
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out after 40 seconds. Please try again.")), 40000)
      );

      const response = await Promise.race([
        apiService.post("/auth/register", { ...form }),
        timeoutPromise
      ]);
      const token = response?.data?.token;
      const userData = response?.data?.user;

      // ✅ validate before storing
      if (!token) {
        throw new Error("Token not received from API");
      }

      const sessionData = {
        token,
        user: userData,
      };

      localStorage.setItem("session", JSON.stringify(sessionData));

      await Swal.fire({
        icon: "success",
        title: "Signup Successful",
        text: "Welcome to Klypto Share Marketing!",
        showConfirmButton: true,
        confirmButtonText: "Okay",
      });
      navigate("/");
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Signup failed";
      console.error("SignUp error:", error);
      await Swal.fire({
        icon: "error",
        title: "Signup Failed",
        text: message,
        showConfirmButton: true,
        confirmButtonText: "Okay",
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
      padding: "20px 0",
    },
    card: {
      width: "100%",
      maxWidth: 440,
      margin: "0 16px",
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
    group: { marginBottom: 18, flex: 1 },
    row: { display: "flex", gap: 12, flexWrap: "wrap" },
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
    signupRow: {
      textAlign: "center",
      marginTop: 20,
      fontSize: "0.8rem",
      color: "var(--text-secondary)",
    },
    signupLink: {
      color: "var(--accent-color)",
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "none",
      marginLeft: 4,
    },
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* PhoneInput Dark Theme Styles */}
        <style>{`
          .react-tel-input .flag-dropdown {
            background-color: var(--bg-secondary) !important;
            border-color: var(--border-color) !important;
          }
          .react-tel-input .selected-flag {
            background-color: transparent !important;
          }
          .react-tel-input .selected-flag:hover,
          .react-tel-input .selected-flag:focus {
            background-color: var(--bg-primary) !important;
          }
          .react-tel-input .country-list {
            background-color: var(--bg-primary) !important;
            color: #f3f4f6 !important;
          }
          .react-tel-input .country-list .country:hover,
          .react-tel-input .country-list .country.highlight {
            background-color: var(--bg-secondary) !important;
          }
          .react-tel-input .country-list .search {
            background-color: var(--bg-primary) !important;
            color: #f3f4f6 !important;
          }
          .react-tel-input .country-list .search-box {
            background-color: var(--bg-secondary) !important;
            color: #f3f4f6 !important;
            border: 1px solid var(--border-color) !important;
          }
        `}</style>
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

        <div style={s.title}>Create your account</div>
        <div style={s.sub}>Start trading crypto in minutes</div>

        <form noValidate onSubmit={handleSubmit}>
          {/* First Name + Last Name */}
          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>First Name</label>
              <input
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.firstName ? s.inputError : {}) }}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.firstName ? "#ef4444" : "var(--accent-color)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.firstName ? "#ef4444" : "var(--border-color)")
                }
                placeholder="John"
              />
              {errors.firstName && <div style={s.errorMsg}>⚠ {errors.firstName}</div>}
            </div>

            <div style={s.group}>
              <label style={s.label}>Last Name</label>
              <input
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.lastName ? s.inputError : {}) }}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.lastName ? "#ef4444" : "var(--accent-color)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.lastName ? "#ef4444" : "var(--border-color)")
                }
                placeholder="Doe"
              />
              {errors.lastName && <div style={s.errorMsg}>⚠ {errors.lastName}</div>}
            </div>
          </div>

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
                (e.target.style.borderColor = errors.email ? "#ef4444" : "var(--accent-color)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = errors.email ? "#ef4444" : "var(--border-color)")
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
                style={{ ...s.input, paddingRight: 40, ...(errors.password ? s.inputError : {}) }}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.password ? "#ef4444" : "var(--accent-color)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.password ? "#ef4444" : "var(--border-color)")
                }
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {errors.password && <div style={s.errorMsg}>⚠ {errors.password}</div>}
          </div>

          {/* Mobile + Country */}
          <div style={s.row}>
            <div style={{...s.group, minWidth: "200px"}}>
              <label style={s.label}>Mobile</label>
              <PhoneInput
                country={"in"}
                enableSearch={true}
                value={phoneUI}
                onChange={(value) => {
                  setPhoneUI(value);
                  setForm((prev) => ({ ...prev, mobile: value }));
                }}
                inputStyle={{
                  width: "100%",
                  background: "var(--bg-secondary)",
                  border: errors.mobile ? "1px solid #ef4444" : "1px solid var(--border-color)",
                  borderRadius: 8,
                  color: "#f3f4f6",
                  height: "40.5px", // Match new input height (~40px)
                  fontSize: "0.875rem",
                }}
                buttonStyle={{
                  background: "var(--bg-secondary)",
                  border: errors.mobile ? "1px solid #ef4444" : "1px solid var(--border-color)",
                  borderRight: "none",
                  borderRadius: "8px 0 0 8px",
                }}
                dropdownStyle={{
                  background: "var(--bg-primary)",
                  color: "#f3f4f6",
                }}
              />
              {errors.mobile && <div style={s.errorMsg}>⚠ {errors.mobile}</div>}
            </div>

            <div style={s.group}>
              <label style={s.label}>Country</label>
              <input
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.country ? s.inputError : {}) }}
                onFocus={(e) =>
                  (e.target.style.borderColor = errors.country ? "#ef4444" : "var(--accent-color)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = errors.country ? "#ef4444" : "var(--border-color)")
                }
                placeholder="Country"
              />
              {errors.country && <div style={s.errorMsg}>⚠ {errors.country}</div>}
            </div>
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
            {loading ? "Signing up…" : "Sign Up"}
          </button>
        </form>

        {/* Sign in link */}
        <div style={s.signupRow}>
          Already have an account?
          <span
            style={s.signupLink}
            onClick={() => navigate("/login")}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}
