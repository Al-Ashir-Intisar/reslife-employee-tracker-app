"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// function for fetching user details
async function getUsers(memberId) {
  const res = await fetch(`http://localhost:3000/api/users?id=${memberId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users from MongoDB");
  }
  return res.json();
}

// function for fetching group details
async function getGroups(groupIds) {
  const res = await fetch("http://localhost:3000/api/groups/byids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ ids: groupIds }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch specific groups from MongoDB");
  }

  return res.json(); // this will be an array of groups
}

const sessionUserProfile = () => {
  const session = useSession();
  const router = useRouter();

  // get group id and session user id
  const params = useParams();
  const groupId = params.groupPage;
  const sessionUserId = session?.data?.user?._id;

  // state variable for storing group details
  const [group, setGroup] = useState(null);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupsArr = await getGroups([groupId]);
        setGroup(groupsArr[0]);
      } catch (e) {
        console.error(e);
      }
    };
    if (groupId) fetchGroup();
  }, [groupId]);

  // state variables for storing the session user information related to this group
  const [sessionUserData, setSessionUserData] = useState(null);
  const [sessionUserGroupMembership, setSessionUserGroupmembership] =
    useState(null);

  // check to ensure user is authenticated
  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    document.title = "Member Details";
  }, []);

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

  // fetchung the user data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers(sessionUserId);
        setSessionUserData(data);
        const groupMembership = data.groupMemberships?.find(
          (m) =>
            m.groupId?.toString() === groupId?.toString() ||
            m.groupId === groupId
        );
        setSessionUserGroupmembership(groupMembership);
        console.log("GroupMembership: ", groupMembership);
      } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
      }
    };
    if (sessionUserId && groupId) {
      fetchUsers();
    }
  }, [sessionUserId, groupId]); // rerun when user id or group id changes

  if (session.status === "authenticated") {
    return (
      <div className="pageContent">
        {/* Primary Details Table */}
        <div className={styles.memberDetails}>
          <h1>Your Profile for: {group?.name || "..."}</h1>

          <h2>Primary Details</h2>
          <table className={styles.memberTable}>
            <tbody>
              <tr>
                <th>Name</th>
                <td>{sessionUserData?.name || "N/A"}</td>
              </tr>
              <tr>
                <th>Email</th>
                <td>{sessionUserData?.email || "N/A"}</td>
              </tr>
              <tr>
                <th>ID</th>
                <td>{sessionUserData?._id || "N/A"}</td>
              </tr>
              <tr>
                <th>Team Role</th>
                <td>{sessionUserGroupMembership?.role || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          {/* Certifications Table */}
          <div className={styles.rowWiseElementDiv}>
            <h2>Certifications</h2>
          </div>
          <table className={styles.memberTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Expires At</th>
                <th>Added By</th>
              </tr>
            </thead>
            <tbody>
              {sessionUserGroupMembership?.certifications?.length > 0 ? (
                sessionUserGroupMembership.certifications.map((cert, i) => (
                  <tr key={i}>
                    <td>{cert.name}</td>
                    <td>
                      {cert.expiresAt
                        ? new Date(cert.expiresAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td>
                      {group?.adminIds
                        ?.map((id) => id.toString())
                        .includes(cert.addedBy?.toString())
                        ? "admin"
                        : "user"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No certifications found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Custom Attributes Table */}
          <div className={styles.rowWiseElementDiv}>
            <h2>Custom Attributes</h2>
          </div>
          <table className={styles.memberTable}>
            <thead>
              <tr>
                <th>Key</th>
                <th>Type</th>
                <th>Value</th>
                <th>Added By</th>
              </tr>
            </thead>
            <tbody>
              {sessionUserGroupMembership?.customAttributes?.length > 0 ? (
                sessionUserGroupMembership.customAttributes.map((attr, i) => {
                  let value;
                  switch (attr.type) {
                    case "string":
                      value = attr.valueString ?? "N/A";
                      break;
                    case "number":
                      value = attr.valueNumber?.toString() ?? "N/A";
                      break;
                    case "boolean":
                      value =
                        typeof attr.valueBoolean === "boolean"
                          ? attr.valueBoolean.toString()
                          : "N/A";
                      break;
                    case "date":
                      value = attr.valueDate
                        ? new Date(attr.valueDate).toLocaleDateString()
                        : "N/A";
                      break;
                    case "duration":
                      value =
                        attr.valueDurationMinutes != null
                          ? `${attr.valueDurationMinutes} min`
                          : "N/A";
                      break;
                    default:
                      value = "N/A";
                  }
                  return (
                    <tr key={i}>
                      <td>{attr.key}</td>
                      <td>{attr.type}</td>
                      <td>{value}</td>
                      <td>
                        {group?.adminIds
                          ?.map((id) => id.toString())
                          .includes(attr.addedBy?.toString())
                          ? "admin"
                          : "user"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4">No attributes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
};

export default sessionUserProfile;
