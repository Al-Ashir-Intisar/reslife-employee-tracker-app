"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Replace with actual Supabase Auth or hardcoded user id
const userId = process.env.NEXT_PUBLIC_SUPABASE_USER_ID; // e.g., 'd45ef2b2-1234-456a-9988-b9c4eaad7391'

async function getGroups() {
  const res = await fetch("http://172.30.64.1:3000/api/groups", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch groups from MongoDB");
  }

  return res.json();
}

const fetcher = (url) =>
  fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  }).then((res) => res.json());

const Dashboard = () => {
  // Set the document title when the component mounts
  useEffect(() => {
    document.title = "Dashboard";
  }, []);

  // Fetch groups from MongoDB (if needed)
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        setGroups(data);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };
    fetchGroups();
  }, []);
  // console.log("MongoDB Groups:", groups[0]);

  // Fetch groups from Supabase using SWR
  const { data, error, isLoading } = useSWR(
    `${SUPABASE_URL}/rest/v1/groups?user_id=eq.${userId}&select=group_id,group_name,group_desc`,
    fetcher
  );
  // console.log("Data:", data);
  // console.log("Error:", error);
  // console.log("Is Loading:", isLoading);
  //   if (error) return <div>Error loading groups</div>;
  //   if (isLoading || !data) return <div>Loading...</div>;

  const session =  useSession();
  console.log("Session:", session); 

  return (
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
              <span className={styles.description}>{group.description}</span>
            </Link>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;
