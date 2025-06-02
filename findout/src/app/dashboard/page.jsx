"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import useSWR from "swr";

const SUPABASE_URL = "https://gbchlhkkknasrcfqymiz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiY2hsaGtra25hc3JjZnF5bWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NDQ5NDEsImV4cCI6MjA2NDQyMDk0MX0.SW2c__7JGQenWuFh4m8_3WdFVze7gnNgbjMIkDCTsdw";
// Replace with actual Supabase Auth or hardcoded user id
const userId = "7b1b1d5c-e79d-4f09-960f-df89fbfa07d4"; // e.g., 'd45ef2b2-1234-456a-9988-b9c4eaad7391'


const fetcher = (url) =>
  fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  }).then((res) => res.json());

const Dashboard = () => {
  const { data, error, isLoading } =  useSWR(
    `${SUPABASE_URL}/rest/v1/groups?user_id=eq.${userId}&select=group_id,group_name,group_desc`,
    fetcher
  );
  console.log("Data:", data);
  console.log("Error:", error);
  console.log("Is Loading:", isLoading);
//   if (error) return <div>Error loading groups</div>;
//   if (isLoading || !data) return <div>Loading...</div>;

  return (
    <div className="pageContent">
      <div className={styles.groups}>
        {data && data.map((group) => (
          <Link
            key={group.group_id}
            href={`/dashboard/${group.group_id}`}
            className={styles.group}
          >
            <span className={styles.title}>{group.group_name}</span>
            <span className={styles.description}>{group.group_desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
