"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
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
        <Link href={`/dashboard/${groupId}/${memberId}`}>
          <span className={styles.mainTitle}>
            Your {groupId} {memberId}
          </span>
        </Link>
        {children}
      </div>
    );
  }
};
export default memberLayout;
