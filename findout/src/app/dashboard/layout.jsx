"use client";
import React from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";

const DashboardLayout = ({ children }) => {
  const router = useRouter();

  const handleRefresh = () => {
    router.push("/dashboard"); // Navigate to dashboard
    router.refresh(); // Force a reload of the route
  };

  return (
    <div className="layoutContainer">
      <span
        className={styles.mainTitle}
        onClick={handleRefresh}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        Your DashBoard
        <span
          style={{
            marginLeft: "0.5rem",
            display: "inline-flex",
            verticalAlign: "middle",
          }}
        >
          <Image
            src="/refreshIcon.png"
            alt="Refresh"
            width={15}
            height={15}
            style={{ display: "block", filter: "brightness(0) invert(1)" }}
          />
        </span>
      </span>

      {children}
    </div>
  );
};

export default DashboardLayout;
