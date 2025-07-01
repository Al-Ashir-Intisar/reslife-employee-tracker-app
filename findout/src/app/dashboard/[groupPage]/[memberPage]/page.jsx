"use client";
import React from "react";
import styles from "./page.module.css";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { set } from "mongoose";
import { Salsa } from "next/font/google";

// const userRes = await fetch(`/api/users?id=${memberId}`);
// const user = await userRes.json();

async function getUsers(memberId) {
  const res = await fetch(`/api/users?id=${memberId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users from MongoDB");
  }
  return res.json();
}

async function getGroups(groupIds) {
  const res = await fetch("/api/groups/byids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ ids: groupIds }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch specific groups from MongoDB");
  }

  return res.json();
}

const member = () => {
  const session = useSession();
  const router = useRouter();

  // Getting the member ID and group ID from the URL parameters
  const params = useParams();
  const memberId = params.memberPage;
  const groupId = params.groupPage;

  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showEditDetailsForm, setEditDetailsForm] = useState(false);

  // state variables for storing form information for member details editting.
  const [role, setRole] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

  // variable to track edit mode for user info tables
  // const [editGroupAdminMode, setEditGroupAdminMode] = useState(false);
  const [editRoleMode, setEditRoleMode] = useState(false);
  const [editCertsMode, setEditCertsMode] = useState(false);
  const [editAttrsMode, setEditAttrsMode] = useState(false);

  // Form data user input state variables
  const [editedRole, setEditedRole] = useState("");
  const [editedCerts, setEditedCerts] = useState([]);
  const [editedAttrs, setEditedAttrs] = useState([]);
  const [removedCertIds, setRemovedCertIds] = useState([]);
  const [removedAttrIds, setRemovedAttrIds] = useState([]);

  const updateMemberField = async (payload) => {
    const errors = [];

    // --- Validate certifications if present ---
    if (payload.certifications) {
      payload.certifications.forEach((c, i) => {
        const nameOk = c.name?.trim() !== "";
        const dateOk =
          c.expiresAt?.trim() !== "" && !isNaN(Date.parse(c.expiresAt));

        if (!nameOk || !dateOk) {
          errors.push(
            `Certification ${
              i + 1
            } is invalid (missing name or valid expiration).`
          );
        }
      });
    }

    // --- Validate custom attributes if present ---
    if (payload.customAttributes) {
      payload.customAttributes.forEach((attr, i) => {
        const key = attr.key?.trim();
        const type = attr.type;
        const value = attr.value;

        if (!key) {
          errors.push(`Custom Attribute ${i + 1} key is empty.`);
          return;
        }

        if (
          value === undefined ||
          value === null ||
          value.toString().trim() === ""
        ) {
          errors.push(`Custom Attribute ${i + 1} value is empty.`);
          return;
        }

        switch (type) {
          case "number":
            if (isNaN(Number(value))) {
              errors.push(`Custom Attribute ${i + 1} must be a number.`);
            }
            break;
          case "boolean":
            if (!["true", "false"].includes(value.toString().toLowerCase())) {
              errors.push(`Custom Attribute ${i + 1} must be true or false.`);
            }
            break;
          case "date":
            const mmddyyyyRegex =
              /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
            if (!mmddyyyyRegex.test(value)) {
              errors.push(
                `Custom Attribute ${
                  i + 1
                } must be a valid date in "mm/dd/yyyy" format.`
              );
            }
            break;
          case "duration":
            if (isNaN(Number(value)) || Number(value) < 0) {
              errors.push(
                `Custom Attribute ${
                  i + 1
                } duration must be a non-negative number.`
              );
            }
            break;
          case "string":
            if (typeof value !== "string") {
              errors.push(`Custom Attribute ${i + 1} must be a string.`);
            }
            break;
          default:
            errors.push(`Custom Attribute ${i + 1} has unknown type.`);
        }
      });
    }

    // --- Error handling ---
    if (errors.length > 0) {
      alert("Validation Errors:\n\n" + errors.join("\n"));
      return;
    }

    // console.log("Payload: ", payload);
    // --- API call ---
    const res = await fetch("/api/users/updateMembership", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, memberId, ...payload }),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.message || "Update failed");
    }

    window.location.reload();
    // Reset edit states after update
    setEditedCerts([]);
    setEditedAttrs([]);
    setEditCertsMode(false);
    setEditAttrsMode(false);
  };

  // handler for removing certifications
  const removeMarkedCertifications = async (ids) => {
    if (!ids.length) return;

    const res = await fetch("/api/users/deleteMembershipItem", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        memberId,
        type: "certification",
        itemIds: ids, // send array
      }),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.message || "Delete failed");
    }
  };

  // handler for removing custom attributes
  const removeMarkedAttributes = async (ids) => {
    if (!ids.length) return;

    const res = await fetch("/api/users/deleteMembershipItem", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        memberId,
        type: "customAttribute", // important: matches route logic
        itemIds: ids, // array of _id strings
      }),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.message || "Failed to delete attributes");
    }
  };

  const handleRemoveMember = async ({ groupId, memberId }) => {
    const confirmed = window.confirm(
      "⚠️ This will permanently remove all information related to this member for this group.\n\n" +
        "This includes role, certifications, and attributes.\n\n" +
        "Are you sure you want to continue?"
    );

    if (!confirmed) return;

    try {
      const res = await fetch("/api/users/removeFromGroup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, memberId }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Member successfully removed from the group.");
        router.push(`/dashboard/${groupId}`);
      } else {
        throw new Error(result.message || "Failed to remove member.");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleToggleAdmin = async (userId, currentlyAdmin) => {
    try {
      const res = await fetch("/api/groups/toggleAdmin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroup._id,
          userId,
          makeAdmin: !currentlyAdmin,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed");

      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleEditDetailsForm = () => {
    setEditDetailsForm(!showEditDetailsForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    const hasValidRole = role.trim() !== "";

    // --- Validate Certifications ---
    let hasValidCerts = false;
    const certNames = new Set();
    certifications.forEach((c, i) => {
      const nameOk = c.name?.trim() !== "";
      const dateOk =
        c.expiresAt?.trim() !== "" && !isNaN(Date.parse(c.expiresAt));

      if (!nameOk || !dateOk) {
        errors.push(
          `Certification ${
            i + 1
          } is invalid (missing name or valid expiration).`
        );
        return;
      }

      const lowerName = c.name.trim().toLowerCase();
      if (certNames.has(lowerName)) {
        errors.push(`Duplicate certification name found: "${c.name}"`);
        return;
      }
      certNames.add(lowerName);
      hasValidCerts = true;
    });

    // --- Validate Custom Attributes ---
    let hasValidAttrs = false;
    const attrKeys = new Set();
    customAttributes.forEach((attr, i) => {
      const key = attr.key?.trim();
      const type = attr.type;
      const value = attr.value;

      if (!key) {
        errors.push(`Custom Attribute ${i + 1} key is empty.`);
        return;
      }

      const lowerKey = key.toLowerCase();
      if (attrKeys.has(lowerKey)) {
        errors.push(`Duplicate attribute key found: "${key}"`);
        return;
      }
      attrKeys.add(lowerKey);

      if (
        value === undefined ||
        value === null ||
        value.toString().trim() === ""
      ) {
        errors.push(`Custom Attribute ${i + 1} value is empty.`);
        return;
      }

      switch (type) {
        case "number":
          if (isNaN(Number(value))) {
            errors.push(`Custom Attribute ${i + 1} must be a number.`);
          }
          break;
        case "boolean":
          if (!["true", "false"].includes(value.toString().toLowerCase())) {
            errors.push(`Custom Attribute ${i + 1} must be true or false.`);
          }
          break;
        case "date":
          const mmddyyyyRegex =
            /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
          if (!mmddyyyyRegex.test(value)) {
            errors.push(
              `Custom Attribute ${
                i + 1
              } must be a valid date in "mm/dd/yyyy" format.`
            );
          }
          break;
        case "duration":
          if (isNaN(Number(value)) || Number(value) < 0) {
            errors.push(
              `Custom Attribute ${
                i + 1
              } duration must be a non-negative number.`
            );
          }
          break;
        case "string":
          if (typeof value !== "string") {
            errors.push(`Custom Attribute ${i + 1} must be a string.`);
          }
          break;
        default:
          errors.push(`Unknown attribute type: "${type}"`);
      }

      hasValidAttrs = true;
    });

    // --- At least one field must be valid ---
    if (!hasValidRole && !hasValidCerts && !hasValidAttrs) {
      alert(
        "Please enter at least one valid field to save changes.\n\n" +
          errors.join("\n")
      );
      return;
    }

    if (errors.length > 0) {
      alert("Please fix the following issues:\n\n" + errors.join("\n"));
      return;
    }

    const data = {
      ...(hasValidRole && { role }),
      ...(hasValidCerts && { certifications }),
      ...(hasValidAttrs && { customAttributes }),
    };

    const body = {
      groupId,
      memberId,
      ...data,
    };

    try {
      const res = await fetch("/api/users/updateMembership", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.message || "Failed to update membership.");
      }

      console.log("Member details updated successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Submit error:", err);
      alert("An error occurred while updating membership.");
    }

    setRole("");
    setCertifications([]);
    setCustomAttributes([]);
    setEditDetailsForm(false);
  };

  const cancelEditting = () => {
    setRole("");
    setCertifications([]);
    setCustomAttributes([]);
    setEditDetailsForm(false);
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
        // console.log("Fetched Group:", data);
        // console.log("ID of group to fetch", groupId);
        setSelectedGroup(data[0]);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };
    if (groupId) {
      fetchGroups();
    }
  }, [groupId]); // rerun when groupId changes

  useEffect(() => {
    if (selectedMember) {
      const membership = selectedMember.groupMemberships.find(
        (m) => m.groupId === groupId || m.groupId?._id === groupId
      );
      if (membership) {
        setEditedRole(membership.role || "");
        setEditedCerts(membership.certifications || []);
        setEditedAttrs(membership.customAttributes || []);
      }
    }
  }, [selectedMember, groupId]);

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
  // Check if the user is an admin or an owner
  const isOwner = selectedGroup?.ownerId === session?.data?.user?._id;
  const memberIsOwner = selectedGroup?.ownerId === memberId;
  const isAdmin = selectedGroup?.adminIds?.includes(session?.data?.user?._id);
  // console.log("Session User ID:", session?.data?.user?._id);
  // console.log("Group Admin IDs:", selectedGroup?.adminIds);
  // console.log("Group Owner ID:", selectedGroup?.ownerId);
  // console.log("Is Admin:", isAdmin);
  // console.log("Session user is the owner:", isOwner);
  // console.log("Member of this page is owner:", memberIsOwner);

  // states for tasks show and assign task and shift table
  const [weeksFilter, setWeeksFilter] = useState(1);
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");

  // Helpers for membership, shifts, tasks:
  function getMembership() {
    return selectedMember?.groupMemberships?.find(
      (m) => m.groupId === groupId || m.groupId?._id === groupId
    );
  }

  function getRecentShifts() {
    const membership = getMembership();
    if (!membership?.workShifts?.length) return [];
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7 * weeksFilter);
    return membership.workShifts
      .filter((shift) => new Date(shift.startTime) >= cutoff)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  function getFilteredTasks() {
    const membership = getMembership();
    if (!membership?.tasks?.length) return [];
    const now = new Date();

    return membership.tasks
      .filter((task) => {
        if (!deadlineFilter) return true;
        const taskDeadline = new Date(task.deadline);
        if (deadlineFilter === "past") return taskDeadline < now;
        if (deadlineFilter === "today") {
          const today = now.toISOString().slice(0, 10);
          return taskDeadline.toISOString().slice(0, 10) === today;
        }
        if (deadlineFilter === "upcoming") return taskDeadline > now;
        return true;
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  // Handlers for Task Actions
  async function updateTaskStatus(taskId, completed) {
    try {
      const res = await fetch("/api/users/task", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: memberId,
          taskId,
          completed,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to update task.");
      alert("Task status updated!");
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function removeTask(taskId) {
    try {
      const res = await fetch("/api/users/task", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: memberId,
          taskId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to delete task.");
      alert("Task removed!");
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function handleAssignTask(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/users/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: memberId,
          description: taskDescription,
          deadline: taskDeadline,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to assign task.");
      alert("Task assigned!");
      setShowTaskForm(false);
      setTaskDescription("");
      setTaskDeadline("");
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  if (session.status === "authenticated") {
    return (
      <>
        <div className={styles.dashButtons}>
          <button
            className={styles.editMember}
            disabled={!isAdmin}
            onClick={toggleEditDetailsForm}
          >
            Add Member Details
          </button>
          <button
            className={styles.deleteMember}
            disabled={!isAdmin || memberIsOwner}
            onClick={() => handleRemoveMember({ groupId, memberId })}
          >
            Remove member from this Group
          </button>
          <button
            className={styles.editMember}
            disabled={!isAdmin}
            onClick={() => setShowTaskForm(true)}
          >
            Assign Task
          </button>
        </div>

        {/* Add member details form */}
        <div className={styles.formDiv}>
          {showEditDetailsForm && (
            <form className={styles.editDetailsForm} onSubmit={handleSubmit}>
              <div className={styles.cancelButtonDiv}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={cancelEditting}
                >
                  Cancel
                </button>
              </div>

              {/* Role Input */}
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
                      const updated = certifications.filter(
                        (_, idx) => idx !== i
                      );
                      setCertifications(updated);
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
                      const updated = customAttributes.filter(
                        (_, idx) => idx !== i
                      );
                      setCustomAttributes(updated);
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
          )}
          {/* Assign Task Modal */}
          {showTaskForm && isAdmin && (
            <div className={styles.formDiv}>
              <form
                className={styles.editDetailsForm}
                onSubmit={handleAssignTask}
              >
                <h3>Assign Task</h3>
                <label>Description (max 280 chars):</label>
                <textarea
                  className={styles.input}
                  maxLength={280}
                  value={taskDescription}
                  required
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the task"
                  style={{ minHeight: 60, resize: "vertical" }}
                />
                <label>Deadline:</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={taskDeadline}
                  required
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
                <div className={styles.cancelButtonDiv}>
                  <button type="submit" className={styles.submitFormButton}>
                    Assign Task
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowTaskForm(false);
                      setTaskDescription("");
                      setTaskDeadline("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Member Info Tables */}
        <div className={styles.memberDetails}>
          {selectedMember && (
            <>
              {/* Primary Info */}
              <h2>Primary Details</h2>
              <table className={styles.memberTable}>
                <tbody>
                  <tr>
                    <th>Name</th>
                    <td>{selectedMember.name}</td>
                    <th>Group Owner</th>
                    <td>
                      {selectedGroup?.ownerId === selectedMember._id
                        ? "Yes"
                        : "No"}
                    </td>
                  </tr>
                  <tr>
                    <th>Email</th>
                    <td>{selectedMember.email}</td>
                    <th>Group Admin</th>
                    <td>
                      {selectedGroup?.adminIds?.includes(selectedMember._id)
                        ? "Yes"
                        : "No"}

                      {isOwner &&
                        selectedGroup?.ownerId !== selectedMember._id && (
                          <button
                            className={styles.editButton}
                            onClick={() =>
                              handleToggleAdmin(
                                selectedMember._id,
                                selectedGroup.adminIds.includes(
                                  selectedMember._id
                                )
                              )
                            }
                          >
                            🖊️{" "}
                            {selectedGroup.adminIds.includes(selectedMember._id)
                              ? "Remove Admin Access"
                              : "Give Admin Access"}
                          </button>
                        )}
                    </td>
                  </tr>
                  <tr>
                    <th>ID</th>
                    <td>{selectedMember._id}</td>
                    <th>Team Role</th>
                    <td>
                      {editRoleMode ? (
                        <>
                          <input
                            type="text"
                            value={editedRole}
                            onChange={(e) => setEditedRole(e.target.value)}
                          />
                          <button
                            className={styles.saveButton}
                            onClick={async () => {
                              try {
                                await updateMemberField({ role: editedRole });
                              } catch (err) {
                                alert(err.message);
                              }
                            }}
                          >
                            Save
                          </button>
                          <button
                            className={styles.cancelEditButton}
                            onClick={() => {
                              setEditRoleMode(false);
                              setEditedRole("");
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {editedRole || "N/A"}
                          {isAdmin && (
                            <button
                              className={styles.editButton}
                              onClick={() => setEditRoleMode(true)}
                            >
                              🖊️ Edit Field
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className={styles.rowWiseElementDiv}>
                <h2>Certifications</h2>
                {isAdmin && !editCertsMode && (
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => {
                      const found = selectedMember.groupMemberships.find(
                        (m) =>
                          m.groupId === groupId || m.groupId?._id === groupId
                      );
                      setEditedCerts(
                        (found?.certifications || []).map((c) => ({
                          _id: c._id,
                          name: c.name,
                          expiresAt: c.expiresAt,
                        }))
                      );

                      setEditCertsMode(true);
                    }}
                  >
                    🖊️ Edit Table
                  </button>
                )}
              </div>

              {editCertsMode ? (
                <>
                  {editedCerts.map((cert, i) => (
                    <div key={i} className={styles.editRow}>
                      <input
                        className={styles.input}
                        value={cert.name}
                        onChange={(e) => {
                          const copy = [...editedCerts];
                          copy[i].name = e.target.value;
                          setEditedCerts(copy);
                        }}
                      />
                      <input
                        type="date"
                        className={styles.input}
                        value={cert.expiresAt?.split("T")[0] || ""}
                        onChange={(e) => {
                          const copy = [...editedCerts];
                          copy[i].expiresAt = e.target.value;
                          setEditedCerts(copy);
                        }}
                      />
                      <button
                        type="button"
                        className={styles.removeFieldButton}
                        onClick={() => {
                          const toRemove = editedCerts[i]?._id;
                          // console.log(editedCerts[i]);
                          if (toRemove) {
                            setRemovedCertIds((prev) => [...prev, toRemove]);
                          }
                          setEditedCerts(
                            editedCerts.filter((_, idx) => idx !== i)
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className={styles.rowWiseElementDiv}>
                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={async () => {
                        try {
                          await removeMarkedCertifications(removedCertIds);
                          // console.log(removedCertIds);
                          await updateMemberField({
                            certifications: editedCerts,
                          });
                          setEditCertsMode(false);
                          setEditedCerts([]);
                          setRemovedCertIds([]);
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.cancelEditButton}
                      onClick={() => {
                        setEditCertsMode(false);
                        setEditedCerts([]);
                        setRemovedCertIds([]);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <table className={styles.memberTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Expires At</th>
                        <th>Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMember.groupMemberships
                        .find(
                          (m) =>
                            m.groupId === groupId || m.groupId?._id === groupId
                        )
                        ?.certifications?.map((cert, i) => (
                          <tr key={i}>
                            <td>{cert.name}</td>
                            <td>
                              {cert.expiresAt
                                ? new Date(cert.expiresAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td>
                              {selectedGroup?.adminIds
                                ?.map((id) => id.toString())
                                .includes(cert.addedBy?.toString())
                                ? "admin"
                                : "user"}
                            </td>
                          </tr>
                        )) ?? (
                        <tr>
                          <td colSpan="3">No certifications found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {/* Custom Attributes */}
              <div className={styles.rowWiseElementDiv}>
                <h2>Custom Attributes</h2>
                {isAdmin && !editAttrsMode && (
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => {
                      const found = selectedMember.groupMemberships.find(
                        (m) =>
                          m.groupId === groupId || m.groupId?._id === groupId
                      );

                      const formatted =
                        found?.customAttributes?.map((attr) => {
                          let value = "";
                          switch (attr.type) {
                            case "string":
                              value = attr.valueString ?? "";
                              break;
                            case "number":
                              value = attr.valueNumber?.toString() ?? "";
                              break;
                            case "boolean":
                              value =
                                typeof attr.valueBoolean === "boolean"
                                  ? attr.valueBoolean.toString()
                                  : "";
                              break;
                            case "date":
                              value = attr.valueDate?.split("T")[0] ?? "";
                              break;
                            case "duration":
                              value =
                                attr.valueDurationMinutes?.toString() ?? "";
                              break;
                            default:
                              value = "";
                          }

                          return {
                            _id: attr._id,
                            key: attr.key,
                            type: attr.type,
                            value,
                          };
                        }) || [];

                      setEditedAttrs(formatted);
                      setEditAttrsMode(true);
                    }}
                  >
                    🖊️ Edit Table
                  </button>
                )}
              </div>
              {editAttrsMode ? (
                <>
                  {editedAttrs.map((attr, i) => (
                    <div key={i} className={styles.editRow}>
                      <input
                        className={styles.input}
                        value={attr.key}
                        onChange={(e) => {
                          const copy = [...editedAttrs];
                          copy[i].key = e.target.value;
                          setEditedAttrs(copy);
                        }}
                        placeholder="Key"
                      />
                      <select
                        className={styles.input}
                        value={attr.type}
                        onChange={(e) => {
                          const copy = [...editedAttrs];
                          copy[i].type = e.target.value;
                          setEditedAttrs(copy);
                        }}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                        <option value="duration">Duration</option>
                      </select>
                      <input
                        className={styles.input}
                        type="text"
                        value={attr.value || ""}
                        placeholder="Value"
                        onChange={(e) => {
                          const copy = [...editedAttrs];
                          copy[i].value = e.target.value;
                          setEditedAttrs(copy);
                        }}
                      />
                      <button
                        type="button"
                        className={styles.removeFieldButton}
                        onClick={() => {
                          const toRemoveAttr = editedAttrs[i]?._id;
                          // console.log(toRemoveAttr);
                          if (toRemoveAttr) {
                            setRemovedAttrIds((prev) => [
                              ...prev,
                              toRemoveAttr,
                            ]);
                          }
                          setEditedAttrs((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className={styles.rowWiseElementDiv}>
                    <button
                      type="button"
                      className={styles.saveButton}
                      onClick={async () => {
                        try {
                          await removeMarkedAttributes(removedAttrIds);
                          await updateMemberField({
                            customAttributes: editedAttrs,
                          }); // update
                          setEditAttrsMode(false);
                          setEditedAttrs([]);
                          setRemovedAttrIds([]);
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                    >
                      Save
                    </button>

                    <button
                      type="button"
                      className={styles.cancelEditButton}
                      onClick={() => {
                        setEditAttrsMode(false);
                        setEditedAttrs([]);
                        setRemovedAttrIds([]);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                      {selectedMember.groupMemberships
                        .find(
                          (m) =>
                            m.groupId === groupId || m.groupId?._id === groupId
                        )
                        ?.customAttributes?.map((attr, i) => {
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
                                {selectedGroup?.adminIds
                                  ?.map((id) => id.toString())
                                  .includes(attr.addedBy?.toString())
                                  ? "admin"
                                  : "user"}
                              </td>
                            </tr>
                          );
                        }) ?? (
                        <tr>
                          <td colSpan="4">No attributes found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
              {isAdmin && (
                <>
                  {/* Shifts Table & Filter */}
                  <div
                    className={styles.rowWiseElementDiv}
                    style={{ marginTop: "2rem" }}
                  >
                    <h2>
                      Shifts{" "}
                      <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
                        (last{" "}
                        <select
                          value={weeksFilter}
                          onChange={(e) =>
                            setWeeksFilter(Number(e.target.value))
                          }
                          style={{ fontSize: "1rem" }}
                        >
                          {[1, 2, 3, 4].map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        {weeksFilter === 1 ? " week" : " weeks"})
                      </span>
                    </h2>
                  </div>
                  <table className={styles.memberTable}>
                    <thead>
                      <tr>
                        <th>Start Time</th>
                        <th>Start Location</th>
                        <th>Estimated End</th>
                        <th>Actual End</th>
                        <th>End Location</th>
                        <th>Duration (min)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRecentShifts().length > 0 ? (
                        getRecentShifts().map((shift, i) => {
                          const estEnd = shift.estimatedEndTime
                            ? new Date(shift.estimatedEndTime)
                            : null;
                          const actualEnd = shift.actualEndTime
                            ? new Date(shift.actualEndTime)
                            : null;
                          const start = shift.startTime
                            ? new Date(shift.startTime)
                            : null;

                          let status = "Open";
                          if (shift.actualEndTime) status = "Closed";
                          else if (estEnd && new Date() > estEnd)
                            status = "Timed Out";

                          let duration = "";
                          if (start && (actualEnd || estEnd)) {
                            const endTime =
                              shift.actualEndTime || shift.estimatedEndTime;
                            duration =
                              Math.round(
                                (new Date(endTime) - new Date(start)) / 60000
                              ) + "";
                          }

                          return (
                            <tr key={i}>
                              <td>{start ? start.toLocaleString() : "N/A"}</td>
                              <td>
                                {shift.startLocation
                                  ? `${shift.startLocation.lat?.toFixed(
                                      5
                                    )}, ${shift.startLocation.lng?.toFixed(5)}`
                                  : "N/A"}
                              </td>
                              <td>
                                {estEnd ? estEnd.toLocaleString() : "N/A"}
                              </td>
                              <td>
                                {actualEnd ? actualEnd.toLocaleString() : ""}
                              </td>
                              <td>
                                {shift.endLocation
                                  ? `${shift.endLocation.lat?.toFixed(
                                      5
                                    )}, ${shift.endLocation.lng?.toFixed(5)}`
                                  : ""}
                              </td>
                              <td>{duration}</td>
                              <td>{status}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7">No shift records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* TASKS SECTION */}
                  <div
                    className={styles.rowWiseElementDiv}
                    style={{ marginTop: "2rem" }}
                  >
                    <h2>
                      Tasks{" "}
                      <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
                        <select
                          value={deadlineFilter}
                          onChange={(e) => setDeadlineFilter(e.target.value)}
                          style={{ fontSize: "1rem" }}
                        >
                          <option value="">All</option>
                          <option value="today">Due Today</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="past">Past Due</option>
                        </select>
                      </span>
                    </h2>
                  </div>
                  <table className={styles.memberTable}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Deadline</th>
                        <th>Assigned By</th>
                        <th>Assigned At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredTasks().length > 0 ? (
                        getFilteredTasks().map((task) => (
                          <tr
                            key={task._id}
                            style={{
                              backgroundColor: task.completed
                                ? "lightgreen"
                                : "black",
                              color: task.completed ? "black" : "white",
                            }}
                          >
                            <td>{task.description}</td>
                            <td>
                              {task.deadline
                                ? new Date(task.deadline).toLocaleString()
                                : "N/A"}
                            </td>
                            <td>
                              {selectedGroup?.adminIds
                                ?.map((id) => id.toString())
                                .includes(task.assignedBy?.toString())
                                ? "admin"
                                : "user"}
                            </td>
                            <td>
                              {task.assignedAt
                                ? new Date(task.assignedAt).toLocaleString()
                                : "N/A"}
                            </td>
                            <td>
                              {task.completed ? (
                                <button
                                  title="Mark as Incomplete"
                                  className={styles.editButton}
                                  onClick={async () => {
                                    if (
                                      window.confirm("Mark task as incomplete?")
                                    ) {
                                      await updateTaskStatus(task._id, false);
                                    }
                                  }}
                                >
                                  ⏳
                                </button>
                              ) : (
                                <button
                                  title="Mark as Completed"
                                  className={styles.editButton}
                                  onClick={async () => {
                                    if (
                                      window.confirm("Mark task as complete?")
                                    ) {
                                      await updateTaskStatus(task._id, true);
                                    }
                                  }}
                                >
                                  ✔️
                                </button>
                              )}
                              <button
                                title="Remove Task"
                                className={styles.deleteButton}
                                onClick={async () => {
                                  if (window.confirm("Remove this task?")) {
                                    await removeTask(task._id);
                                  }
                                }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5">No tasks found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </>
    );
  }
};

export default member;
