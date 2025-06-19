"use client";
import React from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

const DashboardLayout = ({ children }) => {
  const router = useRouter();

  const handleRefresh = () => {
    router.push("/dashboard"); // Navigate to dashboard
    router.refresh(); // Force a reload of the route
  };

  return (
    <div className="layoutContainer">
      <span className={styles.mainTitle} onClick={handleRefresh}>
        Your DashBoard <span style={{ marginLeft: "0.5rem" }}>🔄</span>
      </span>
      {children}
    </div>
  );
};

export default DashboardLayout;
