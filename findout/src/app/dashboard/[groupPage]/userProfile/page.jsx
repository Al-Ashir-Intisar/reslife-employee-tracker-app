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

  // state variables for showing form for user info update
  const [showEditDetailsForm, setShowEditDetailsForm] = useState(false);
  const [role, setRole] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

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
        console.log(groupsArr);
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
        console.log("Session User", data);
        const groupMembership = data.groupMemberships?.find(
          (m) =>
            m.groupId?.toString() === groupId?.toString() ||
            m.groupId === groupId
        );
        setSessionUserGroupmembership(groupMembership);
        // console.log("GroupMembership: ", groupMembership);
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
          <div className={styles.dashButtons}>
            <button
              className={styles.editMember}
              onClick={() => {
                setRole(""); // Always blank
                setCertifications([]); // Always blank
                setCustomAttributes([]); // Always blank
                setShowEditDetailsForm(true);
              }}
            >
              Add Member Details
            </button>

            <button
              className={styles.deleteMember}
              onClick={async () => {
                if (
                  window.confirm(
                    "Are you sure you want to remove yourself from this group?"
                  )
                ) {
                  try {
                    const res = await fetch("/api/users/removeFromGroup", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        groupId,
                        memberId: sessionUserId,
                      }),
                    });
                    if (!res.ok) {
                      const result = await res.json();
                      throw new Error(
                        result?.message || "Failed to remove from group"
                      );
                    }
                    alert("Removed from group.");
                    router.push("/dashboard");
                  } catch (err) {
                    alert("Error: " + err.message);
                  }
                }
              }}
            >
              Remove yourself from this Group
            </button>
          </div>

          {showEditDetailsForm && (
            <div className={styles.formDiv}>
              <form
                className={styles.editDetailsForm}
                onSubmit={async (e) => {
                  e.preventDefault();
                  // You can add validation here if desired

                  const data = {
                    role,
                    certifications,
                    customAttributes,
                  };

                  try {
                    const res = await fetch("/api/users/updateMembership", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        groupId,
                        memberId: sessionUserId,
                        ...data,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to update membership");
                    setShowEditDetailsForm(false);
                    window.location.reload();
                  } catch (err) {
                    alert("Error saving details: " + err.message);
                  }
                }}
              >
                <div className={styles.cancelButtonDiv}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowEditDetailsForm(false)}
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <h3>Role:</h3>
                  <input
                    type="text"
                    placeholder="Assign a custom role"
                    className={styles.input}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                {/* Certifications */}
                <h3>Certifications</h3>
                {certifications.map((cert, i) => (
                  <div key={i}>
                    <input
                      type="text"
                      placeholder="Name"
                      className={styles.input}
                      value={cert.name}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[i].name = e.target.value;
                        setCertifications(updated);
                      }}
                    />
                    <label>Expiration</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={cert.expiresAt || ""}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[i].expiresAt = e.target.value;
                        setCertifications(updated);
                      }}
                    />
                    <button
                      type="button"
                      className={styles.removeCertificationsButton}
                      onClick={() => {
                        setCertifications(
                          certifications.filter((_, idx) => idx !== i)
                        );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addCertificationsButton}
                  onClick={() =>
                    setCertifications([
                      ...certifications,
                      { name: "", expiresAt: "" },
                    ])
                  }
                >
                  Add Certification
                </button>
                {/* Custom Attributes */}
                <h3>Custom Attributes</h3>
                {customAttributes.map((attr, i) => (
                  <div key={i}>
                    <input
                      type="text"
                      placeholder="Key"
                      className={styles.input}
                      value={attr.key}
                      onChange={(e) => {
                        const updated = [...customAttributes];
                        updated[i].key = e.target.value;
                        setCustomAttributes(updated);
                      }}
                    />
                    <select
                      value={attr.type}
                      onChange={(e) => {
                        const updated = [...customAttributes];
                        updated[i].type = e.target.value;
                        setCustomAttributes(updated);
                      }}
                    >
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
                      value={attr.value || ""}
                      onChange={(e) => {
                        const updated = [...customAttributes];
                        updated[i].value = e.target.value;
                        setCustomAttributes(updated);
                      }}
                    />
                    <button
                      type="button"
                      className={styles.removeAttributesButton}
                      onClick={() => {
                        setCustomAttributes(
                          customAttributes.filter((_, idx) => idx !== i)
                        );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addAttributesButton}
                  onClick={() =>
                    setCustomAttributes([
                      ...customAttributes,
                      { key: "", type: "string", value: "" },
                    ])
                  }
                >
                  Add Attribute
                </button>
                <button type="submit" className={styles.submitFormButton}>
                  Save Changes
                </button>
              </form>
            </div>
          )}

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
