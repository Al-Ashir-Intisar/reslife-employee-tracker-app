"use client";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import MapModal from "@/components/mapmodal/MapModal"; // adjust the path if necessary

// Fetch user details
async function getUsers(memberId) {
  const res = await fetch(`/api/users?id=${memberId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch users from MongoDB");
  return res.json();
}

// Fetch group details
async function getGroups(groupIds) {
  const res = await fetch("/api/groups/byids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ ids: groupIds }),
  });
  if (!res.ok) throw new Error("Failed to fetch specific groups from MongoDB");
  return res.json();
}

const WEEK_OPTIONS = [1, 2, 3, 4];

const sessionUserProfile = () => {
  const session = useSession();
  const router = useRouter();

  // states for map display for locations
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCoords, setModalCoords] = useState(null);
  const [modalTitle, setModalTitle] = useState("");

  // State for user info form
  const [showEditDetailsForm, setShowEditDetailsForm] = useState(false);
  const [role, setRole] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

  // Shift state
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState("");
  const [endingShift, setEndingShift] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Edit shift taskIds state
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [editingTaskIds, setEditingTaskIds] = useState([]);
  const [showEditShiftTasksModal, setShowEditShiftTasksModal] = useState(false);

  // Shift table filter
  const [weeksFilter, setWeeksFilter] = useState(1);
  const [taskFilter, setTaskFilter] = useState(""); // "" means all tasks

  // Session, group, and membership
  const params = useParams();
  const groupId = params.groupPage;
  const sessionUserId = session?.data?.user?._id;
  const [group, setGroup] = useState(null);
  const [sessionUserData, setSessionUserData] = useState(null);
  const [sessionUserGroupMembership, setSessionUserGroupmembership] =
    useState(null);

  // Auth redirect
  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

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

  useEffect(() => {
    document.title = "Group User Profile";
  }, []);

  // Fetch group
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

  // Fetch user and membership
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
      } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
      }
    };
    if (sessionUserId && groupId) {
      fetchUsers();
    }
  }, [sessionUserId, groupId]);

  // state for tasks display table and filter
  const [deadlineFilter, setDeadlineFilter] = useState(""); // "" means show all

  // function for filtering tasks based on deadline
  function getFilteredTasks() {
    if (!sessionUserGroupMembership?.tasks?.length) return [];
    const now = new Date();

    return sessionUserGroupMembership.tasks
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

  //  State for Showing the Form and Task Details
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");

  // Assign Task Handler Function
  async function handleAssignTask(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/users/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: sessionUserId, // assigning to self; change if assigning to others
          description: taskDescription,
          deadline: taskDeadline,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to assign task.");
      alert("Task assigned!");
      // console.log(
      //   "Assigned task",
      //   sessionUserId,
      //   taskDescription,
      //   taskDeadline
      // );
      setShowTaskForm(false);
      setTaskDescription("");
      setTaskDeadline("");
      window.location.reload(); // update table
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // Helper: get open shift if exists
  function getOpenShift() {
    if (!sessionUserGroupMembership?.workShifts?.length) return null;
    // Open shift: actualEndTime is null, estimatedEndTime is in future
    const now = new Date();
    return sessionUserGroupMembership.workShifts.find(
      (shift) =>
        !shift.actualEndTime &&
        shift.estimatedEndTime &&
        now < new Date(shift.estimatedEndTime)
    );
  }
  const openShift = getOpenShift();

  // Helper: filter shifts for last N weeks/for specific tasks
  function getRecentShifts() {
    if (!sessionUserGroupMembership?.workShifts?.length) return [];
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7 * weeksFilter);
    return sessionUserGroupMembership.workShifts
      .filter((shift) => new Date(shift.startTime) >= cutoff)
      .filter((shift) => {
        // If taskFilter is set, only include shifts linked to that task
        if (!taskFilter) return true;
        return (
          Array.isArray(shift.taskIds) && shift.taskIds.includes(taskFilter)
        );
      })
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  // Helper: get total hours for recent shifts
  function getTotalHoursForRecentShifts() {
    const shifts = getRecentShifts();
    const totalMinutes = shifts.reduce((sum, shift) => {
      const start = shift.startTime ? new Date(shift.startTime) : null;
      let end = null;
      if (shift.actualEndTime) end = new Date(shift.actualEndTime);
      else if (shift.estimatedEndTime) end = new Date(shift.estimatedEndTime);
      if (start && end) {
        return sum + Math.round((end - start) / 60000);
      }
      return sum;
    }, 0);
    return totalMinutes / 60; // returns hours as a float
  }

  function isMobileDevice() {
    return (
      typeof window.orientation !== "undefined" ||
      navigator.userAgent.indexOf("Mobi") !== -1
    );
  }

  // Shift Start Handler
  async function handleShiftStart(e) {
    e.preventDefault();
    const startTime = new Date();

    // // Restrict to mobile only
    // if (!isMobileDevice()) {
    //   alert(
    //     "Shift can only be started from a mobile device with GPS/location capability."
    //   );
    //   setShowShiftForm(false);
    //   return;
    // }

    if (Number(shiftMinutes) > 300) {
      alert("Maximum shift length is 300 minutes.");
      return;
    }
    if (
      !shiftMinutes ||
      isNaN(Number(shiftMinutes)) ||
      Number(shiftMinutes) < 15
    ) {
      alert("Shift length must be between 15 and 300 minutes.");
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          // Accuracy check
          if (pos.coords.accuracy > 50) {
            alert(
              `Location accuracy is too low (+-${Math.round(
                pos.coords.accuracy
              )} meters). Please use a mobile phone or move to an area with better GPS signal.`
            );
            setShowShiftForm(false);
            return;
          }
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch("/api/users/shift", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId,
                userId: sessionUserId,
                startTime,
                startLocation: { lat: latitude, lng: longitude },
                estimatedDurationMinutes: Number(shiftMinutes),
                taskIds: selectedTaskIds, //
              }),
            });
            if (!res.ok) {
              const data = await res.json();
              alert(data.message || "Failed to start shift");
              return;
            }
            alert("Shift started!");
            setShowShiftForm(false);
            setShiftMinutes("");
            window.location.reload();
          } catch (err) {
            alert("Error saving shift: " + err.message);
          }
        },
        (error) => {
          alert("Could not get your location.");
          setShowShiftForm(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocation not supported.");
      setShowShiftForm(false);
    }
  }

  // Shift End Handler
  async function handleShiftEnd() {
    if (!openShift) return;
    setEndingShift(true);

    // // Restrict to mobile only
    // if (!isMobileDevice()) {
    //   alert(
    //     "Shift can only be ended from a mobile device with GPS/location capability."
    //   );
    //   setEndingShift(false);
    //   return;
    // }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          // Accuracy check
          if (pos.coords.accuracy > 50) {
            alert(
              `Location accuracy is too low (+-${Math.round(
                pos.coords.accuracy
              )} meters). Please use a mobile phone or move to an area with better GPS signal.`
            );
            setEndingShift(false);
            return;
          }
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch("/api/users/shift", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId,
                userId: sessionUserId,
                actualEndTime: new Date(),
                endLocation: { lat: latitude, lng: longitude },
              }),
            });
            if (!res.ok) {
              const data = await res.json();
              alert(data.message || "Failed to end shift");
              setEndingShift(false);
              return;
            }
            alert("Shift ended!");
            setEndingShift(false);
            window.location.reload();
          } catch (err) {
            alert("Error ending shift: " + err.message);
            setEndingShift(false);
          }
        },
        (error) => {
          alert("Could not get your location.");
          setEndingShift(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocation not supported.");
      setEndingShift(false);
    }
  }

  // shift remove handler
  async function removeShift(shiftId) {
    try {
      const res = await fetch("/api/users/shift", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: sessionUserId,
          shiftId,
        }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result?.message || "Failed to remove shift.");
      alert("Shift removed!");
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // shift edit task handler
  async function handleUpdateShiftTasks() {
    if (!editingShiftId) return;
    try {
      const res = await fetch("/api/users/shift", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: sessionUserId,
          shiftId: editingShiftId,
          taskIds: editingTaskIds,
        }),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result?.message || "Failed to update shift tasks.");
      alert("Shift tasks updated!");
      setShowEditShiftTasksModal(false);
      setEditingShiftId(null);
      setEditingTaskIds([]);
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // task modify or remove handlers
  async function updateTaskStatus(taskId, completed) {
    try {
      const res = await fetch("/api/users/task", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userId: sessionUserId,
          taskId, // use taskId now
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
          userId: sessionUserId,
          taskId, // use taskId now
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

  const handleMemberDetailsSubmit = async (e) => {
    e.preventDefault();

    // -- Validation --
    const errors = [];

    if (role && !role.trim()) {
      errors.push("Role cannot be empty if set.");
    }

    certifications.forEach((cert, i) => {
      if (!cert.name || !cert.name.trim())
        errors.push(`Certification ${i + 1} name required.`);
      if (!cert.expiresAt || isNaN(Date.parse(cert.expiresAt)))
        errors.push(`Certification ${i + 1} needs a valid expiration date.`);
    });

    customAttributes.forEach((attr, i) => {
      if (!attr.key || !attr.key.trim())
        errors.push(`Attribute ${i + 1} key required.`);
      if (!attr.type) errors.push(`Attribute ${i + 1} type required.`);
      if (
        attr.value === undefined ||
        attr.value === null ||
        attr.value.toString().trim() === ""
      ) {
        errors.push(`Attribute ${i + 1} value required.`);
      }
    });

    if (errors.length > 0) {
      alert("Please fix the following:\n\n" + errors.join("\n"));
      return;
    }

    // Prepare payload
    const data = {};
    if (role && role.trim()) data.role = role;
    if (certifications.length) data.certifications = certifications;
    if (customAttributes.length) data.customAttributes = customAttributes;

    if (Object.keys(data).length === 0) {
      alert("Please add at least one detail before saving.");
      return;
    }

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
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || "Failed to save.");
      alert("Details added!");
      setShowEditDetailsForm(false);
      setRole("");
      setCertifications([]);
      setCustomAttributes([]);
      window.location.reload();
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  if (session.status === "authenticated") {
    // --- Main render ---
    return (
      <div className={styles.memberDetails}>
        {/* Action buttons */}
        <div className={styles.dashButtons}>
          <button
            className={styles.editMember}
            onClick={() => {
              setRole("");
              setCertifications([]);
              setCustomAttributes([]);
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
          <button
            className={styles.editMember}
            onClick={() => setShowShiftForm(true)}
            disabled={!!openShift}
            title={openShift ? "You already have an open shift." : ""}
          >
            Start a Shift
          </button>
          {openShift && (
            <button
              className={styles.editMember}
              style={{ background: "#fa5555", color: "#fff" }}
              onClick={handleShiftEnd}
              disabled={endingShift}
            >
              {endingShift ? "Ending..." : "End Shift"}
            </button>
          )}
          <button
            className={styles.editMember}
            onClick={() => setShowTaskForm(true)}
          >
            Assign Task
          </button>
        </div>

        {/* Add member details form */}
        {showEditDetailsForm && (
          <form
            className={styles.editDetailsForm}
            onSubmit={handleMemberDetailsSubmit}
          >
            <div className={styles.cancelButtonDiv}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setShowEditDetailsForm(false);
                  setRole("");
                  setCertifications([]);
                  setCustomAttributes([]);
                }}
              >
                Cancel
              </button>
            </div>

            {/* Role */}
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
                  X
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
                  className={styles.input}
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
                  X
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

        {/* Start Shift form */}
        {showShiftForm && (
          <div className={styles.formDiv}>
            <form
              className={styles.editDetailsForm}
              onSubmit={handleShiftStart}
            >
              <h3>Start Shift</h3>
              <label>Estimated Shift Length (minutes, 15–300):</label>
              <input
                type="number"
                min="15"
                max="300"
                className={styles.input}
                value={shiftMinutes}
                onChange={(e) => setShiftMinutes(e.target.value)}
                required
                placeholder="e.g., 60"
              />

              <label>
                Tasks for this Shift{" "}
                <span style={{ fontWeight: "normal" }}>
                  (optional, select one or more):
                </span>
              </label>
              <div
                style={{
                  background: "white",
                  padding: "8px 8px",
                  borderRadius: "6px",
                  minHeight: "44px",
                  marginBottom: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                }}
              >
                <label style={{ fontWeight: "normal" }}>
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTaskIds([]);
                    }}
                    style={{ marginRight: 6 }}
                  />
                  None
                </label>
                {(sessionUserGroupMembership?.tasks ?? [])
                  .filter((task) => !task.completed)
                  .map((task) => (
                    <label key={task._id} style={{ fontWeight: "normal" }}>
                      <input
                        type="checkbox"
                        value={task._id}
                        checked={selectedTaskIds.includes(task._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTaskIds((ids) => [
                              ...ids.filter((id) => id),
                              task._id,
                            ]);
                          } else {
                            setSelectedTaskIds((ids) =>
                              ids.filter((id) => id !== task._id)
                            );
                          }
                        }}
                        style={{ marginRight: 6 }}
                      />
                      {task.description} (due{" "}
                      {new Date(task.deadline).toLocaleDateString()})
                    </label>
                  ))}
              </div>

              <div className={styles.cancelButtonDiv}>
                <button type="submit" className={styles.submitFormButton}>
                  Log Start
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowShiftForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assign task form */}
        {showTaskForm && (
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

        {/* Profile and tables */}
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
              <th>Group Role</th>
              <td>
                {group?.ownerId?.toString() === sessionUserData?._id
                  ? "Owner"
                  : group?.adminIds
                      ?.map((id) => id.toString())
                      .includes(sessionUserData?._id)
                  ? "Admin"
                  : sessionUserGroupMembership
                  ? "Member"
                  : "N/A"}
              </td>
            </tr>

            <tr>
              <th>Team Role</th>
              <td>{sessionUserGroupMembership?.role || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        {/* Tasks Table and filter */}
        <div className={styles.rowWiseElementDiv} style={{ marginTop: "2rem" }}>
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
              {/* <th>Assigned At</th> */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredTasks().length > 0 ? (
              getFilteredTasks().map((task) => (
                <tr
                  key={task._id}
                  style={{
                    backgroundColor: task.completed ? "lightgreen" : "#181c25",
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
                    {group?.adminIds
                      ?.map((id) => id.toString())
                      .includes(task.assignedBy?.toString())
                      ? "admin"
                      : "user"}
                  </td>
                  {/* <td>
                    {task.assignedAt
                      ? new Date(task.assignedAt).toLocaleString()
                      : "N/A"}
                  </td> */}
                  <td>
                    {task.completed ? (
                      <button
                        title="Mark as Incomplete"
                        className={styles.editButton}
                        onClick={async () => {
                          if (window.confirm("Mark task as incomplete?")) {
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
                          if (window.confirm("Mark task as complete?")) {
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

          {/* Work Shifts Table and Filter */}
        <div className={styles.rowWiseElementDiv}>
          <h2>Shifts</h2>
          <div>
            <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
              (last{" "}
              <select
                value={weeksFilter}
                onChange={(e) => setWeeksFilter(Number(e.target.value))}
                style={{ fontSize: "1rem" }}
              >
                {WEEK_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {weeksFilter === 1 ? " week" : " weeks"})
            </span>
          </div>
          <div>
            <label
              style={{ fontWeight: "normal", fontSize: "1rem", marginLeft: 4 }}
            >
              Filter by Task:{" "}
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                style={{ fontSize: "1rem" }}
              >
                <option value="">All Tasks</option>
                {(sessionUserGroupMembership?.tasks ?? [])
                  .filter((t) => !t.completed)
                  .map((task) => (
                    <option value={task._id} key={task._id}>
                      {task.description}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        {/* // Get all the filtered shifts to be shown in table: */}
        {/* // Work Shifts Table */}
        <table className={styles.memberTable}>
          <thead>
            <tr>
              <th>ClockIn</th>
              <th>Location</th>
              {/* <th>Estimated End</th> */}
              <th>ClockOut</th>
              <th>Location</th>
              <th>Duration (hr)</th>
              {/* <th>Status</th> */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getRecentShifts().length > 0 ? (
              getRecentShifts().map((shift) => {
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
                else if (estEnd && new Date() > estEnd) status = "Timed Out";

                let duration = "";
                if (start && (actualEnd || estEnd)) {
                  const endTime = shift.actualEndTime || shift.estimatedEndTime;
                  duration =
                    Math.round((new Date(endTime) - new Date(start)) / 60000) +
                    "";
                }

                // Row coloring
                let rowColor = "";
                if (!shift.actualEndTime) rowColor = "lightgreen"; // light red/coral for open
                // else leave as default (black)

                return (
                  <tr
                    key={shift._id}
                    style={{
                      backgroundColor:
                        rowColor ||
                        (shift.actualEndTime ? "#181c25" : undefined),
                      color: rowColor ? "black" : "white",
                    }}
                  >
                    <td>{start ? start.toLocaleString() : "N/A"}</td>
                    <td
                      style={
                        shift.startLocation
                          ? {
                              background: "#e0e0e0",
                              color: "black",
                              cursor: "pointer",
                              fontWeight: "bold",
                              border: "2px solid #f5d389",
                              padding: "8px",
                            }
                          : {}
                      }
                    >
                      {shift.startLocation ? (
                        <span
                          style={{
                            color: "black",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                          title="Show on Map"
                          onClick={() => {
                            setModalCoords(shift.startLocation);
                            setModalTitle("Shift Start Location");
                            setModalOpen(true);
                          }}
                        >
                          {`${shift.startLocation.lat?.toFixed(
                            5
                          )}, ${shift.startLocation.lng?.toFixed(5)}`}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>

                    <td>{estEnd ? estEnd.toLocaleString() : "N/A"}</td>
                    {/* <td>{actualEnd ? actualEnd.toLocaleString() : ""}</td> */}
                    <td
                      style={
                        shift.endLocation
                          ? {
                              background: "#e0e0e0",
                              color: "black",
                              cursor: "pointer",
                              fontWeight: "bold",
                              border: "2px solid #f5d389",
                              padding: "8px",
                            }
                          : {}
                      }
                    >
                      {shift.endLocation ? (
                        <span
                          style={{
                            color: "black",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                          title="Show on Map"
                          onClick={() => {
                            setModalCoords(shift.endLocation);
                            setModalTitle("Shift End Location");
                            setModalOpen(true);
                          }}
                        >
                          {`${shift.endLocation.lat?.toFixed(
                            5
                          )}, ${shift.endLocation.lng?.toFixed(5)}`}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>

                    <td>{(duration / 60).toFixed(1)}</td>

                    {/* <td>{status}</td> */}
                    <td>
                      <button
                        className={styles.editButton}
                        title="Edit Tasks for Shift"
                        onClick={() => {
                          setEditingShiftId(shift._id);
                          setEditingTaskIds(shift.taskIds || []);
                          setShowEditShiftTasksModal(true);
                        }}
                      >
                        🖊️
                      </button>
                      <button
                        className={styles.deleteButton}
                        title="Remove Shift"
                        onClick={async () => {
                          if (window.confirm("Remove this shift?")) {
                            await removeShift(shift._id);
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8">No shift records found.</td>
              </tr>
            )}
            {/* TOTAL ROW */}
            {getRecentShifts().length > 0 && (
              <tr
                style={{
                  background: "#f5d389",
                  fontWeight: "bold",
                  color: "black",
                }}
              >
                <td colSpan={4}>Total</td>
                <td>{getTotalHoursForRecentShifts().toFixed(1)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Edit Shift taskIds Modal */}
        {showEditShiftTasksModal && (
          <div className={styles.overlay}>
            <div className={styles.modal}>
              <h3>Edit Tasks for Shift</h3>
              <div
                style={{
                  background: "white",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  minHeight: "44px",
                  marginBottom: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <label style={{ fontWeight: "normal" }}>
                  <input
                    type="checkbox"
                    checked={editingTaskIds.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) setEditingTaskIds([]);
                    }}
                    style={{ marginRight: 6 }}
                  />
                  None
                </label>
                {(sessionUserGroupMembership?.tasks ?? [])
                  .filter((task) => !task.completed)
                  .map((task) => (
                    <label key={task._id} style={{ fontWeight: "normal" }}>
                      <input
                        type="checkbox"
                        value={task._id}
                        checked={editingTaskIds.includes(task._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingTaskIds((ids) => [
                              ...ids.filter((id) => id),
                              task._id,
                            ]);
                          } else {
                            setEditingTaskIds((ids) =>
                              ids.filter((id) => id !== task._id)
                            );
                          }
                        }}
                        style={{ marginRight: 6 }}
                      />
                      {task.description} (due{" "}
                      {new Date(task.deadline).toLocaleDateString()})
                    </label>
                  ))}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  className={styles.submitFormButton}
                  onClick={async () => {
                    await handleUpdateShiftTasks();
                  }}
                >
                  Save
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowEditShiftTasksModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Modal for shift locations */}
        <MapModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          coords={modalCoords}
          title={modalTitle}
        />

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
    );
  }
};

export default sessionUserProfile;
