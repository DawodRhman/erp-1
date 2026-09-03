import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import logo from "../images/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const fieldNonce = useMemo(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    [],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fieldsUnlocked, setFieldsUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clearAutofill = () => {
      setEmail("");
      setPassword("");
      if (emailInputRef.current) emailInputRef.current.value = "";
      if (passwordInputRef.current) passwordInputRef.current.value = "";
    };

    clearAutofill();
    const timers = [
      window.setTimeout(clearAutofill, 50),
      window.setTimeout(clearAutofill, 250),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    (async () => {
      try {
        const result = await login(email, password);
        if (result.ok) {
          if (result.mustChangePassword) {
            navigate("/change-password");
          } else {
            navigate("/");
          }
        } else {
          setError(result.error);
        }
      } catch (e) {
        setError("Login failed");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="login-page">
      <main className="login-shell">
        <div className="login-card">
        <div className="login-brand">
          <img
            src={logo}
            alt="ESSPL Logo"
            className="login-logo"
          />
        </div>
        <div className="login-title">ESSPL Enterprise Operations Portal</div>
        <div className="login-sub">Secure access to your assigned business workspace</div>
        <div className="login-secure-label"><ShieldCheck size={14} /> Secure role-based access</div>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: -9999,
              width: 1,
              height: 1,
              overflow: "hidden",
            }}
          >
            <input type="text" name="username" autoComplete="username" tabIndex={-1} />
            <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={`ems-email-${fieldNonce}`}>Email</label>
            <input
              ref={emailInputRef}
              id={`ems-email-${fieldNonce}`}
              name={`ems_email_${fieldNonce}`}
              className="input"
              type="email"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              readOnly={!fieldsUnlocked}
              value={email}
              onFocus={() => setFieldsUnlocked(true)}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={`ems-password-${fieldNonce}`}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                ref={passwordInputRef}
                id={`ems-password-${fieldNonce}`}
                name={`ems_password_${fieldNonce}`}
                className="input"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                autoCorrect="off"
                spellCheck={false}
                readOnly={!fieldsUnlocked}
                value={password}
                onFocus={() => setFieldsUnlocked(true)}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--t3)",
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <div
              style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}
            >
              {error}
            </div>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px 14px",
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
          <div className="login-portal-note">
            CRM <span /> Inventory <span /> Finance <span /> Administration
          </div>
          <div className="login-footer">Electronic Safety &amp; Security (Pvt.) Ltd.</div>
        </div>
      </main>
    </div>
  );
}
