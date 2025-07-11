"use client";
import React, { use } from "react";
import styles from "./page.module.css";
// import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
// import { headers } from "next/headers";

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

  // Fetching the user by email and then setting both currentUser and groups
  useEffect(() => {
    const fetchUserAndGroups = async () => {
      if (session.status !== "authenticated" || !session.data?.user?.email)
        return;

      try {
        const res = await fetch(`/api/users?email=${session.data.user.email}`);
        const user = await res.json();
        setCurrentUser(user);

        if (user?.groupIds?.length) {
          const grps = await getGroups(user.groupIds);
          setGroups(grps);
        } else {
          setGroups([]);
        }
      } catch (error) {
        console.error("Failed to fetch user or groups:", error);
        setGroups([]);
      }
    };

    fetchUserAndGroups();
  }, [session.status, session.data?.user?.email]);
  console.log("Current User-State:", currentUser);
  console.log("Groups-State:", groups);

  // State to hold new group name and description and member IDs
  const [newGroupName, setGroupName] = useState("");
  const [newDescription, setDescription] = useState("");
  const [membersIds, setMembersIds] = useState([]);

  // State to hold member emails and new email input
  const [memberEmails, setMemberEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  // Handler for adding a new email and id to the member lists
  const handleAddEmail = async () => {
    // Split input by comma, space, or newline
    const emails = newEmail
      .split(/[\s,]+/) // split by space(s) or comma(s)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    // No valid emails
    if (!emails.length) return;

    let anyAdded = false;
    for (const email of emails) {
      if (
        memberEmails.includes(email) ||
        email === sessionEmail // Already in list or current user
      )
        continue;

      try {
        const res = await fetch(`/api/users?email=${email}`);
        if (!res.ok) continue;

        const user = await res.json();
        if (!user || !user._id) continue;

        setMemberEmails((prev) => [...prev, email]);
        setMembersIds((prev) => [...prev, user._id]);
        anyAdded = true;
      } catch (err) {
        // silently skip invalid emails
        continue;
      }
    }
    setNewEmail(""); // Clear input after adding
    if (!anyAdded) alert("No new valid emails were added.");
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

    // console.log("Group Name:", newGroupName);
    // console.log("Description:", newDescription);
    // console.log("Member Emails:", uniqueMemberEmails);
    // console.log("Members IDs:", uniqueMembersIds);
    // console.log("Admin IDs:", uniqueAdminIds);
    // console.log("Owner ID:", groupOwnerId);

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
            Create Group +
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
                    type="text"
                    placeholder="Enter member emails (i.e. example@stolaf.edu,example1@stolaf.edu example2@stolaf.edu...)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <small
                    style={{
                      color: "#1d7e75",
                      marginLeft: 8,
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    You can paste multiple emails separated by commas or spaces
                  </small>

                  <button
                    className={styles.addEmailButton}
                    type="button"
                    onClick={handleAddEmail}
                    disabled={!newEmail.trim()}
                  >
                    Add Emails
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
            <h1 className={styles.mainTitle}>Your Groups</h1>
            <div className={styles.groupsGrid}>
              {groups && groups.length > 0 ? (
                groups.map((group) => (
                  <div
                    key={group._id}
                    className={styles.groupCard}
                    tabIndex={0}
                    onClick={() => router.push(`/dashboard/${group._id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        router.push(`/dashboard/${group._id}`);
                      }
                    }}
                  >
                    <div className={styles.groupCardHeader}>
                      <span className={styles.groupCardName}>{group.name}</span>
                    </div>
                    <span className={styles.groupCardBadge}>
                      {(group.membersId || []).length} members
                    </span>
                    <div className={styles.groupCardDescription}>
                      {group.description}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", width: "100%" }}>
                  No groups found.
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
};

export default Dashboard;
