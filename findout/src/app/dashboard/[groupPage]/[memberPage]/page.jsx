"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { set } from "mongoose";

// const userRes = await fetch(`/api/users?id=${memberId}`);
// const user = await userRes.json();

async function getUsers(memberId) {
  const res = await fetch(`http://localhost:3000/api/users?id=${memberId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users from MongoDB");
  }
  return res.json();
}

async function getGroups(groupIds) {
  const res = await fetch(`http://localhost:3000/api/groups?id=${groupIds}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch group from MongoDB");
  }
  return res.json();
}

const member = () => {
  const session = useSession();
  const router = useRouter();
  // Get the member ID from the URL parameters
  const params = useParams();
  const memberId = params.memberPage; // e.g. "member1"
  const groupId = params.groupPage; // e.g. "group1"

  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showEditDetailsForm, setEditDetailsForm] = useState(false);

  const toggleEditDetailsForm = () => {
    setEditDetailsForm(!showEditDetailsForm);
  };

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    document.title = "Member Details";
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch users from MongoDB
        const data = await getUsers(memberId);
        // console.log("Fetched Users:", data);
        // Find the user that matches the ID from the URL
        // const member = data.find((u) => u._id === memberId);
        setSelectedMember(data);
      } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
      }
    };
    fetchUsers();
  }, [memberId]); // rerun when memberId changes

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // Fetch groups from MongoDB
        const data = await getGroups([groupId]);
        console.log("Fetched Group:", data[0]);
        setSelectedGroup(data[0]);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };
    if (groupId) {
      fetchGroups();
    }
  }, [groupId]); // rerun when groupId changes

  // console.log("Selected Member:", selectedMember);
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
  // Check if the user is an admin
  const isAdmin = selectedGroup?.adminIds?.includes(session?.data?.user?._id);
  // console.log("Session User ID:", session?.data?.user?._id);
  // console.log("Group Admin IDs:", selectedGroup?.adminIds);
  // console.log("Is Admin:", isAdmin);

  if (session.status === "authenticated") {
    return (
      <>
        <div className={styles.dashButtons}>
          <button
            className={styles.editMember}
            disabled={!isAdmin}
            onClick={toggleEditDetailsForm}
          >
            Edit Member Details
          </button>
        </div>
        <div className={styles.formDiv}>
          {showEditDetailsForm && (
            <form className={styles.editDetailsForm}>
              <div>
                <h3>Role:</h3>
                <input
                  type="text"
                  placeholder="Assign a custom role"
                  className={styles.input}
                />
              </div>

              <h3>Certifications</h3>
              {[1].map((_, i) => (
                <div key={i}>
                  <input
                    type="text"
                    placeholder="Name"
                    className={styles.input}
                  />
                  <label>Expiration</label>
                  <input type="date" className={styles.input} />
                  <button
                    type="button"
                    className={styles.removeCertificationsButton}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addCertificationsButton}>
                Add Certification
              </button>

              <h3>Custom Attributes</h3>
              {[1].map((_, i) => (
                <div key={i}>
                  <input
                    type="text"
                    placeholder="Key"
                    className={styles.input}
                  />
                  <select>
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="duration">Duration</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={styles.removeAttributesButton}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addAttributesButton}>
                Add Attribute
              </button>

              <button type="submit" className={styles.submitFormButton}>
                Save Changes
              </button>
            </form>
          )}
        </div>
        <div className={styles.memberDetails}>
          {selectedMember && (
            <table className={styles.memberTable}>
              <tbody>
                <tr>
                  <th>Name</th>
                  <td>{selectedMember.name}</td>
                </tr>
                <tr>
                  <th>Email</th>
                  <td>{selectedMember.email}</td>
                </tr>
                <tr>
                  <th>ID</th>
                  <td>{selectedMember._id}</td>
                </tr>
                {/* Add more rows as needed */}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  }
};

export default member;
