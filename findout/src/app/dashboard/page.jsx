"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

async function getGroups(ids) {
  const res = await fetch("/api/groups/byids", {
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
  // console.log("Session:", session);
  // console.log("Session email:", session.data?.user?.email);
  const sessionEmail = session.data?.user?.email;
  const router = useRouter();

  // State to hold the groups fetched from the API route
  const [groups, setGroups] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  // State to control the visibility of the create group form
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const toggleCreateGroupForm = () => {
    setShowCreateGroupForm(!showCreateGroupForm);
  };

  useEffect(() => {
    const fetchUserId = async () => {
      if (!sessionEmail) return;
      const res = await fetch(`/api/users?email=${sessionEmail}`);
      const user = await res.json();
      // console.log("Current user:", user);
      setCurrentUser(user);
    };
    fetchUserId();
  }, [sessionEmail]);

  // State to hold new group name and description and member IDs
  const [newGroupName, setGroupName] = useState("");
  const [newDescription, setDescription] = useState("");
  const [membersIds, setMembersIds] = useState([]);

  // State to hold member emails and new email input
  const [memberEmails, setMemberEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");


  // Handler for adding a new email and id to the member lists
  const handleAddEmail = async () => {
    const trimmed = newEmail.trim();

    if (!trimmed) {
      alert("Email cannot be empty.");
      return;
    }
    if (memberEmails.includes(trimmed)) {
      alert("This email is already in the list.");
      return;
    }
    if (trimmed === sessionEmail) {
      alert("You are already a member.");
      return;
    }

    try {
      const res = await fetch(`/api/users?email=${trimmed}`);
      if (!res.ok) throw new Error("Request failed");

      const user = await res.json();

      if (!user || !user._id) {
        alert("User with this email does not exist.");
        return;
      }

      // Setting the new email, user ID, and updating member lists
      setMemberEmails((prev) => [...prev, trimmed]);
      setMembersIds((prev) => [...prev, user._id]);
      setNewEmail("");
    } catch (err) {
      console.error("Error checking user:", err);
      alert("Failed to verify user. Please try again.");
    }
  };

  // Handler for removing an email from the member list
  const handleRemoveEmail = (emailToRemove) => {
    const index = memberEmails.indexOf(emailToRemove);

    if (index === -1) return; // Email not found

    setMemberEmails((prev) => prev.filter((_, i) => i !== index));
    setMembersIds((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler for creating a new group
  const handleCreateGroup = async (e) => {
    e.preventDefault();

    // Ensure currentUser is loaded in member ids and owner id and admin ids
    const groupOwnerId = currentUser?._id;
    const uniqueAdminIds = [groupOwnerId];
    const uniqueMembersIds = [...membersIds, groupOwnerId];
    const uniqueMemberEmails = [...memberEmails, currentUser?.email];

    if (!groupOwnerId || uniqueMembersIds.length - 1 === 0) {
      alert("Please add at least one valid member email.");
      return;
    }

    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newDescription,
          membersId: uniqueMembersIds,
          ownerId: groupOwnerId,
          adminIds: uniqueAdminIds,
        }),
      });

      if (res.status === 201) {
        window.location.reload();
        console.log("Group created successfully");
      } else {
        const text = await res.text();
        alert("Failed to create group: " + text);
      }
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Something went wrong.");
    }

    console.log("Group Name:", newGroupName);
    console.log("Description:", newDescription);
    console.log("Member Emails:", uniqueMemberEmails);
    console.log("Members IDs:", uniqueMembersIds);
    console.log("Admin IDs:", uniqueAdminIds);
    console.log("Owner ID:", groupOwnerId);

    // Reset
    setGroupName("");
    setDescription("");
    setMemberEmails([]);
    setNewEmail("");
    setMembersIds([]);
    toggleCreateGroupForm();
  };

  // handler for the cancel button

  const handleCancel = () => {
    setGroupName("");
    setDescription("");
    setMemberEmails([]);
    setNewEmail("");
    setMembersIds([]);
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
  // console.log("Groups fetched:", groups);

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
          {/* <button className={styles.sendInvite}>Invite a new user</button> */}
        </div>
        {showCreateGroupForm && (
          <div className="pageContent">
            <div className={styles.formDiv}>
              <form
                className={styles.createGroupForm}
                onSubmit={handleCreateGroup}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              >
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Description"
                  value={newDescription}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />

                <div className={styles.emailInputContainer}>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="Enter member email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <button
                    className={styles.addEmailButton}
                    type="button"
                    onClick={handleAddEmail}
                    disabled={!newEmail.trim()}
                  >
                    Add
                  </button>
                </div>
                <div className={styles.formButtonGroup}>
                  <button className={styles.createGroupButton} type="submit">
                    Create
                  </button>
                  <button
                    className={styles.cancleCreateGroupButton}
                    type="button"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>

                <ul className={styles.emailList}>
                  {memberEmails.map((email, index) => (
                    <li key={index}>
                      {email}
                      <button
                        className={styles.removeEmailButton}
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
          </div>
        )}
        {!showCreateGroupForm && (
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
        )}
      </>
    );
  }
};

export default Dashboard;
