"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

async function getUsers() {
  const res = await fetch("http://localhost:3000/api/users", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users from MongoDB");
  }
  return res.json();
}

const member = () => {
  const session = useSession();
  const router = useRouter();
  // Get the member ID from the URL parameters
  const params = useParams();
  const memberId = params.memberPage; // e.g. "member1"

  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    document.title = "Member Details";
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch users from MongoDB
        const data = await getUsers();
        // Find the user that matches the ID from the URL
        const member = data.find((u) => u._id === memberId);
        setSelectedMember(member);
      } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
      }
    };
    fetchUsers();
  }, [memberId]); // rerun when memberId changes

  // console.log("Selected Member:", selectedMember);
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
      <div className="pageContent">
        <h1 className={styles.title}>
          {selectedMember?.name || "Member not found"}
        </h1>
      </div>
    );
  }
};

export default member;
