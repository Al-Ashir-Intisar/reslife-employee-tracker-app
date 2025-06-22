"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function getUsers(memberId) {
  const res = await fetch(`http://localhost:3000/api/users?id=${memberId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users from MongoDB");
  }
  return res.json();
}

const memberLayout = ({ children }) => {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupPage;
  const memberId = params.memberPage;

  const [selectedMember, setSelectedMember] = useState(null);

  const handleRefresh = () => {
    router.push(`/dashboard/${groupId}/${memberId}`); // Navigate to dashboard
    router.refresh(); // Force a reload of the route
  };

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch users from MongoDB
        const data = await getUsers(memberId);
        console.log("Fetched Users:", data);
        // Find the user that matches the ID from the URL
        // const member = data.find((u) => u._id === memberId);
        setSelectedMember(data);
      } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
      }
    };
    fetchUsers();
  }, [memberId]); // rerun when memberId changes

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
          Member: {selectedMember?.name}{" "}
          <span style={{ marginLeft: "0.5rem" }}>🔄</span>
        </span>
        {children}
      </div>
    );
  }
};
export default memberLayout;
