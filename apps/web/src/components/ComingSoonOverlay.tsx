import React from "react";
import styles from "./ComingSoonOverlay.module.css";

export const ComingSoonOverlay: React.FC = () => {
  return (
    <div className={styles.overlay} data-testid="coming-soon-overlay">
      <div className={styles.content}>Coming Soon</div>
    </div>
  );
};

export default ComingSoonOverlay;
