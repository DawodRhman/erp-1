import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold">403</h1>
        <p className="mb-4 text-lg text-muted-foreground">
          Insufficient permissions to view this page.
        </p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
