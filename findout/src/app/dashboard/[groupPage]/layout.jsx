"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const groupLayout = ({ children }) => {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupPage;

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
        <Link href={`/dashboard/${groupId}`}>
          <span className={styles.mainTitle}>Your {groupId}</span>
        </Link>
        {children}
      </div>
    );
  }
};
export default groupLayout;
