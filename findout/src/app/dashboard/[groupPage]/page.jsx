"use client";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

async function getGroups() {
  const res = await fetch("http://localhost:3000/api/groups", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch groups from MongoDB");
  return res.json();
}

const GroupPage = () => {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupPage;

  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    document.title = "Group Members";
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        const group = data.find((g) => g._id === groupId);
        setSelectedGroup(group);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };

    if (groupId) fetchGroups();
  }, [groupId]);

  const memberIds = selectedGroup?.membersId || [];

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
          <button className={styles.createMember}>Add a new Member</button>
          <button className={styles.sendInvite}>Invite a new user</button>
        </div>
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
      </>
    );
  }
};

export default GroupPage;
