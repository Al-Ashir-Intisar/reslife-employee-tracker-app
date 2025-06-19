"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const memberLayout = ({ children }) => {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupPage;
  const memberId = params.memberPage;

  const handleRefresh = () => {
    router.push(`/dashboard/${groupId}/${memberId}`); // Navigate to dashboard
    router.refresh(); // Force a reload of the route
  };

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  if (session.status === "loading") {
    return (
      <div className="pageContent">
        <p>Loading...</p>
      </div>
    );
  }
  if (session.status !== "authenticated") {
    return null;
  }
  if (session.status === "authenticated") {
    return (
      <div className="layoutContainer">
          <span className={styles.mainTitle} onClick={handleRefresh}>
            Your {groupId} {memberId}{" "}
            <span style={{ marginLeft: "0.5rem" }}>🔄</span>
          </span>
        {children}
      </div>
    );
  }
};
export default memberLayout;
