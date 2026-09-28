import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import { useAuth } from "../context/AuthContext";
import { useAuthStore } from "../store/useAuthStore";

const PASSWORD_RULES = {
  minLength: 8,
  hasUpper: /[A-Z]/,
  hasLower: /[a-z]/,
  hasDigit: /\d/,
  hasSymbol: /[^A-Za-z0-9]/,
};

const getStrength = (value: string) => {
  if (!value) return { label: "", pct: 0, color: "#e5e7eb" };
  const checks = [
    value.length >= PASSWORD_RULES.minLength,
    PASSWORD_RULES.hasUpper.test(value),
    PASSWORD_RULES.hasLower.test(value),
    PASSWORD_RULES.hasDigit.test(value),
    PASSWORD_RULES.hasSymbol.test(value),
  ].filter(Boolean).length;

  if (checks <= 2) return { label: "Weak", pct: 30, color: "#ef4444" };
  if (checks === 3) return { label: "Fair", pct: 55, color: "#f97316" };
  if (checks === 4) return { label: "Good", pct: 80, color: "#6366f1" };
  return { label: "Strong", pct: 100, color: "#10b981" };
};

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);

  if (!user) return <Navigate to="/login" replace />;

  const validate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return "All fields are mandatory.";
    }
    if (newPassword !== confirmPassword) {
      return "New password and confirm password must match.";
    }
    if (newPassword.length < PASSWORD_RULES.minLength) {
      return "Password must be at least 8 characters long.";
    }
    if (!PASSWORD_RULES.hasUpper.test(newPassword)) {
      return "Password must include at least one uppercase letter.";
    }
    if (!PASSWORD_RULES.hasLower.test(newPassword)) {
      return "Password must include at least one lowercase letter.";
    }
    if (!PASSWORD_RULES.hasDigit.test(newPassword)) {
      return "Password must include at least one number.";
    }
    if (!PASSWORD_RULES.hasSymbol.test(newPassword)) {
      return "Password must include at least one symbol.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.data?.success) {
        useAuthStore.getState().setMustChangePassword(false);
        navigate("/");
      } else {
        setError(res.data?.message || "Unable to change password.");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Unable to change password.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">Change Password</div>
        <div className="login-sub">
          Please update your password to continue.
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <div style={{ marginTop: 6 }}>
              <div
                style={{ height: 4, background: "#f3f4f6", borderRadius: 6 }}
              >
                <div
                  style={{
                    height: 4,
                    width: `${strength.pct}%`,
                    background: strength.color,
                    borderRadius: 6,
                    transition: "width .2s ease",
                  }}
                />
              </div>
              {strength.label && (
                <div
                  style={{ fontSize: 11, color: strength.color, marginTop: 4 }}
                >
                  {strength.label}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
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
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
