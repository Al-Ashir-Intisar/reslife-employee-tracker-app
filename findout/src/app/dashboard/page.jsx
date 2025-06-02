"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import useSWR from "swr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Ensure userId is defined in your environment variables
const userId = process.env.NEXT_PUBLIC_USER_ID;


const fetcher = (url) =>
  fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  }).then((res) => res.json());

const Dashboard = () => {
  const { data, error, isLoading } = useSWR(
    `${SUPABASE_URL}/rest/v1/groups?user_id=eq.${userId}&select=group_id,group_name,group_desc`,
    fetcher
  );

  if (error) return <div className="pageContent">Error loading groups</div>;
  if (isLoading) return <div className="pageContent">Loading...</div>;

  // If data is not an array, show fallback
  if (!Array.isArray(data)) return <div className="pageContent">No Groups Found!</div>;

  return (
    <div className="pageContent">
      <div className={styles.groups}>
        {data.length === 0 ? (
          <div>No groups assigned to you.</div>
        ) : (
          data.map((group) => (
            <Link
              key={group.group_id}
              href={`/dashboard/${group.group_id}`}
              className={styles.group}
            >
              <span className={styles.title}>{group.group_name}</span>
              <span className={styles.description}>{group.group_desc}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
