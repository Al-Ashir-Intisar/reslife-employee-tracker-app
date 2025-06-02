"use client"
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";

// const SUPABASE_URL = "https://gbchlhkkknasrcfqymiz.supabase.co";
// const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiY2hsaGtra25hc3JjZnF5bWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NDQ5NDEsImV4cCI6MjA2NDQyMDk0MX0.SW2c__7JGQenWuFh4m8_3WdFVze7gnNgbjMIkDCTsdw";
// const userId = "3c32b7cb-6a23-4eba-bb28-8bf0b49aec75"; // Example user ID, replace with actual user ID logic

// export async function getGroups(userId) {
//   const res = await fetch(
//     `${SUPABASE_URL}/rest/v1/groups?user_id=eq.${userId}&select=group_id,group_name,group_desc`,
//     {
//       headers: {
//         apikey: SUPABASE_ANON_KEY,
//         Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
//       },
//       cache: "no-store",
//     }
//   );

//   if (!res.ok) {
//     throw new Error("Failed to fetch groups");
//   }

//   return res.json();
// }

const dashboard = () => {
    const groups = [
    { id: "group1", name: "Engineering" },
    { id: "group2", name: "Design" }
    ];


    return (
        <div className="pageContent">
            <div className={styles.groups}>
                {groups.map(group => (
                    <Link key={group.id} href={`/dashboard/${group.id}`} className={styles.group}>
                        <span className={styles.title}>{group.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default dashboard;