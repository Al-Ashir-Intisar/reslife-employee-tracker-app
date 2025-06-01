"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";

const DashboardLayout = ({ children }) => {
    return (
        <div>
             <Link href="/dashboard">
                    <span className={styles.mainTitle}>Your DashBoard</span>
            </Link>
            {children}
        </div>
    );
}
export default DashboardLayout;