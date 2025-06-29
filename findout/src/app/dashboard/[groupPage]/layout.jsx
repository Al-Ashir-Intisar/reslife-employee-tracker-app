"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function getGroups(ids) {
  const res = await fetch("/api/groups/byids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch groups from MongoDB");
  }

  return res.json();
}

const groupLayout = ({ children }) => {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupPage;

  const handleRefresh = () => {
    router.push(`/dashboard/${groupId}`); // Navigate to dashboard
    router.refresh(); // Force a reload of the route
  };

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  const [groupName, setGroupName] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (session.status !== "authenticated") return;
      try {
        const data = await getGroups([groupId]);
        setGroupName(data[0].name);
        // console.log("Fetched Groups:", data);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };
    fetchGroups();
  }, [groupId, session.status]);

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
          Group: {groupName} <span style={{ marginLeft: "0.5rem" }}>🔄</span>
        </span>
        {children}
      </div>
    );
  }
};
export default groupLayout;
