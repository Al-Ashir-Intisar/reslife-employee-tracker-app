"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

async function getGroups(ids) {
  const res = await fetch("http://localhost:3000/api/groups/byids", {
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

const Dashboard = () => {
  const session = useSession();
  console.log("Session:", session);
  const router = useRouter();

  // Fetch groups from MongoDB
  const [groups, setGroups] = useState([]);

  // Set the document title when the component mounts
  useEffect(() => {
    document.title = "Dashboard";
  }, []);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (session.status !== "authenticated") return;

      try {
        // 1. Get user info by email
        const userRes = await fetch(
          `/api/users?email=${session.data.user.email}`
        );
        const user = await userRes.json();
        // console.log("User fetched:", user);

        // 2. Fetch groups based on groupIds
        if (user?.groupIds?.length) {
          // console.log("User groupIds:", user.groupIds);
          const groups = await getGroups(user.groupIds);
          setGroups(groups);
        } else {
          setGroups([]);
        }
      } catch (error) {
        console.error("Failed to fetch user groups:", error);
      }
    };

    fetchUserGroups();
  }, [session.status]);
  // console.log("✅ Groups fetched:", groups);


  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status]);

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
      <>
        <div className={styles.dashButtons}>
          <button className={styles.createGroup}>Create a new group</button>
        </div>
        <div className="pageContent">
          <div className={styles.groups}>
            {groups &&
              groups.map((group) => (
                <Link
                  key={group.name}
                  href={`/dashboard/${group._id}`}
                  className={styles.group}
                >
                  <span className={styles.title}>{group.name}</span>
                  <span className={styles.description}>
                    {group.description}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </>
    );
  }
};

export default Dashboard;
