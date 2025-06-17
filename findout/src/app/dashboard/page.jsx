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

  // State to hold the groups fetched from the API route
  const [groups, setGroups] = useState([]);

  // State to control the visibility of the create group form
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const toggleCreateGroupForm = () => {
    setShowCreateGroupForm(!showCreateGroupForm);
  };

  // State to hold new group name and description
  const [newGroupName, setGroupName] = useState("");
  const [newDescription, setDescription] = useState("");

  // State to hold member emails and new email input
  const [memberEmails, setMemberEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  // Handler for adding a new email to the member list
  const handleAddEmail = () => {
    const trimmed = newEmail.trim();
    if (trimmed && !memberEmails.includes(trimmed)) {
      setMemberEmails([...memberEmails, trimmed]);
      setNewEmail("");
    }
  };
  // Handler for removing an email from the member list
  const handleRemoveEmail = (emailToRemove) => {
    setMemberEmails(memberEmails.filter((email) => email !== emailToRemove));
  };

  // Handler for creating a new group
  const handleCreateGroup = (e) => {
    e.preventDefault();

    console.log("Group Name:", newGroupName);
    console.log("Description:", newDescription);
    console.log("Member Emails:", memberEmails);

    // Call the API to create a new group later

    // Reset form values
    setGroupName("");
    setDescription("");
    setMemberEmails([]);
    setNewEmail(""); // optional, in case something is typed in the input

    // Hide the form
    toggleCreateGroupForm();
  };

  // handler for the cancel button

  const handleCancel = () => {
    setGroupName("");
    setDescription("");
    setMemberEmails([]);
    setNewEmail("");
    toggleCreateGroupForm();
  };

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
          <button
            className={styles.createGroup}
            onClick={toggleCreateGroupForm}
          >
            Create a new group
          </button>
        </div>
        {showCreateGroupForm && (
          <div className={styles.formDiv}>
            <form
              className={styles.createGroupForm}
              onSubmit={handleCreateGroup}
            >
              <button type="submit">Create</button>
              <button type="button" onClick={handleCancel}>
                Cancel
              </button>
              <input
                type="text"
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setDescription(e.target.value)}
                required
              />

              <div className={styles.emailInputContainer}>
                <input
                  type="email"
                  placeholder="Enter member email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <button type="button" onClick={handleAddEmail}>
                  Add
                </button>
              </div>

              <ul className={styles.emailList}>
                {memberEmails.map((email, index) => (
                  <li key={index}>
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            </form>
          </div>
        )}
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
