import React, { ReactNode } from "react";
import ComingSoonOverlay from "./ComingSoonOverlay";

type FeaturePlaceholderProps = {
  children?: ReactNode;
  showOverlay?: boolean;
};

/** Wraps page content with optional semi-transparent coming-soon overlay. */
export default function FeaturePlaceholder({
  children,
  showOverlay = true,
}: FeaturePlaceholderProps) {
  return (
    <div style={{ position: "relative", minHeight: "60vh" }}>
      {children}
      {showOverlay && <ComingSoonOverlay />}
    </div>
  );
}
