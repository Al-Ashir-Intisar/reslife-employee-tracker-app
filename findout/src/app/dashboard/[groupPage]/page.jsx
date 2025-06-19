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

  // State to control the visibility of the add member form
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const toggleAddMemberForm = () => {
    setShowAddMemberForm(!showAddMemberForm);
  };

  const [membersIds, setMembersIds] = useState([]);

  // State to hold member emails and new email input
  const [memberEmails, setMemberEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  // Handler for adding a new email and id to the member lists
  const handleAddEmail = async () => {
    const trimmed = newEmail.trim();

    if (!trimmed || memberEmails.includes(trimmed)) return;

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

  // handler for the cancel button
  const handleCancel = () => {
    setMemberEmails([]);
    setNewEmail("");
    setMembersIds([]);
    toggleAddMemberForm();
  };

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting member IDs:", membersIds);
    console.log("To group ID:", groupId);
    console.log("With emails:", memberEmails);

    if (!groupId || membersIds.length === 0) {
      alert("Please add at least one valid member email.");
      return;
    }

    try {
      const res = await fetch("/api/groups/addMembers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          newMemberIds: membersIds,
        }),
      });

      if (res.ok) {
        console.log("Members added successfully");
        window.location.reload(); // Refresh to show updated group
      } else {
        const message = await res.text();
        alert("Failed to add members: " + message);
      }
    } catch (error) {
      console.error("Error submitting members:", error);
      alert("An unexpected error occurred.");
    }

    setMemberEmails([]);
    setNewEmail("");
    setMembersIds([]);
    toggleAddMemberForm();
  };

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
          <button className={styles.createMember} onClick={toggleAddMemberForm}>
            Add new Members
          </button>
          <button className={styles.sendInvite}>Invite a new user</button>
          <button className={styles.deleteGroup}>Delete this Group</button>
        </div>
        {showAddMemberForm && (
          <div className={styles.formDiv}>
            <form className={styles.addMemberForm}>
              <div>
                <input
                  type="text"
                  placeholder="Enter member email"
                  className={styles.input}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
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
              </div>

              <div className={styles.formButtonGroup}>
                <button
                  type="button"
                  className={styles.addToListButton}
                  onClick={handleAddEmail}
                  disabled={!newEmail.trim()}
                >
                  Add to List
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  onClick={handleSubmit}
                >
                  Submit
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

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
