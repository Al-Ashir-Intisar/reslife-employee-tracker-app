"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

async function getGroups() {
  const res = await fetch("http://localhost:3000/api/groups", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch groups from MongoDB");
  }

  return res.json();
}

const group = () => {
  // Set the document title when the component mounts
  useEffect(() => {
    document.title = "Group Members";
  }, []);

  // Simulated list of member data
  // This is just a placeholder; replace with actual member data fetching logic
  // const members = [
  //   { id: "member1", name: "Alice" },
  //   { id: "member2", name: "Bob" },
  //   { id: "member3", name: "Charlie" },
  // ];

  // Get the group ID from the URL parameters
  const params = useParams();
  const groupId = params.groupPage; // e.g. "683fab7f8f5ad44d032100fb"

  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Fetch groups from MongoDB
        const data = await getGroups();
        // Find the group that matches the ID from the URL
        const group = data.find((g) => g._id === groupId);
        setSelectedGroup(group);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };
    fetchGroups();
  }, [groupId]); // rerun when groupId changes

  // console.log("Selected Group:", selectedGroup);
  // console.log("Member IDs:", selectedGroup?.membersId);

  const memberIds = selectedGroup?.membersId || [];

  return (
    <div className="pageContent">
      <div className={styles.members}>
        {memberIds.map((memberId) => (
          <Link
            key={memberId}
            href={`/dashboard/${groupId}/${memberId}`}
            className={styles.member}
          >
            <span className={styles.title}>{memberId}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default group;
