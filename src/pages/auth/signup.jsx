import { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";
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
      navigate("/candleStick", { replace: true });
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
      const response = await apiService.post("/auth/register", { ...form });
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

      Swal.fire({
        icon: "success",
        title: "Signup Successful",
        text: "Welcome to Klypto Share Marketing!",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/candleStick");
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Signup failed";
      console.error("SignUp error:", error);
      Swal.fire({
        icon: "error",
        title: "Signup Failed",
        text: message,
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-secondary py-4">
        <div
          className="card border-0 shadow-sm"
          style={{ width: 420, borderRadius: 16 }}
        >
          <div className="card-body p-4">
            {/* Logo */}
            <div
              className="d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{
                width: 40,
                height: 40,
                background: "#185FA5",
                borderRadius: 10,
              }}
            >
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>

            <h5 className="text-center fw-semibold mb-1">
              Create your account
            </h5>
            <p className="text-center text-muted small mb-4">
              Start trading crypto in minutes
            </p>

            <Form noValidate onSubmit={handleSubmit} className="text-start">
              {/* First Name + Last Name */}
              <div className="d-flex gap-2 mb-3">
                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small fw-medium text-secondary">
                    First Name
                  </Form.Label>
                  <Form.Control
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={form.firstName}
                    onChange={handleChange}
                    isInvalid={!!errors.firstName}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.firstName}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small fw-medium text-secondary">
                    Last Name
                  </Form.Label>
                  <Form.Control
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={handleChange}
                    isInvalid={!!errors.lastName}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.lastName}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* Email */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium text-secondary">
                  Email address
                </Form.Label>
                <Form.Control
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Password */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium text-secondary">
                  Password
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    isInvalid={!!errors.password}
                    style={{ paddingRight: 40 }}
                  />
                  <span
                    onClick={() => setShowPassword((s) => !s)}
                    className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                    style={{ cursor: "pointer", fontSize: 16, zIndex: 5 }}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </span>
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </div>
              </Form.Group>

              {/* Mobile + Country */}
              <div className="d-flex gap-2 mb-3">
                <div style={{ flex: 1 }}>
                  <Form.Label className="small fw-medium text-secondary">
                    Mobile
                  </Form.Label>

                  <PhoneInput
                    country={"in"}
                    enableSearch={true}
                    value={phoneUI}
                    onChange={(value) => {
                      setPhoneUI(value);
                      setForm((prev) => ({
                        ...prev,
                        mobile: value,
                      }));
                    }}
                    inputStyle={{
                      width: "100%",
                      height: "38px",
                      borderRadius: "6px",
                      border: "1px solid #ced4da",
                    }}
                  />

                  {errors.mobile && (
                    <div className="text-danger small">{errors.mobile}</div>
                  )}
                </div>

                <Form.Group style={{ flex: 1 }}>
                  <Form.Label className="small fw-medium text-secondary">
                    Country
                  </Form.Label>
                  <Form.Control
                    name="country"
                    type="text"
                    value={form.country}
                    onChange={handleChange}
                    isInvalid={!!errors.country}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.country}
                  </Form.Control.Feedback>
                </Form.Group>

              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-100 fw-medium"
                style={{ background: "#185FA5", border: "none" }}
                disabled={loading}
              >
                {loading ? "Signing up…" : "Sign Up"}
              </Button>

              {/* Divider */}
              <div className="d-flex align-items-center gap-2 my-3">
                <hr className="flex-grow-1 m-0" />
                <span className="text-muted small">or</span>
                <hr className="flex-grow-1 m-0" />
              </div>

              {/* Sign in link */}
              <p className="text-center small text-muted mb-0">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-primary fw-medium text-decoration-none"
                >
                  Sign in
                </a>
              </p>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
