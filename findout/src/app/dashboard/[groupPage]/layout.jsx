"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams } from "next/navigation";

const groupLayout = ({ children }) => {
  const params = useParams();
  const groupId = params.groupPage;

  return (
    <div className="layoutContainer">
      <Link href={`/dashboard/${groupId}`}>
        <span className={styles.mainTitle}>Your {groupId}</span>
      </Link>
      {children}
    </div>
  );
};
export default groupLayout;
