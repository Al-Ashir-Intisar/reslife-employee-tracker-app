"use client";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Fetch user details
async function getUsers(memberId) {
  const res = await fetch(`http://localhost:3000/api/users?id=${memberId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch users from MongoDB");
  return res.json();
}

// Fetch group details
async function getGroups(groupIds) {
  const res = await fetch("http://localhost:3000/api/groups/byids", {
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

  // State for user info form
  const [showEditDetailsForm, setShowEditDetailsForm] = useState(false);
  const [role, setRole] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

  // Shift state
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState("");
  const [endingShift, setEndingShift] = useState(false);

  // Shift table filter
  const [weeksFilter, setWeeksFilter] = useState(1);

  // Session, group, and membership
  const params = useParams();
  const groupId = params.groupPage;
  const sessionUserId = session?.data?.user?._id;
  const [group, setGroup] = useState(null);
  const [sessionUserData, setSessionUserData] = useState(null);
  const [sessionUserGroupMembership, setSessionUserGroupmembership] = useState(null);

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

  // Auth redirect
  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/dashboard/login");
    }
  }, [session.status, router]);

  useEffect(() => {
    document.title = "Member Details";
  }, []);

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

  // Helper: filter shifts for last N weeks
  function getRecentShifts() {
    if (!sessionUserGroupMembership?.workShifts?.length) return [];
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7 * weeksFilter);
    return sessionUserGroupMembership.workShifts
      .filter(
        (shift) =>
          new Date(shift.startTime) >= cutoff
      )
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  // Shift Start Handler
  async function handleShiftStart(e) {
    e.preventDefault();
    const startTime = new Date();
    if (Number(shiftMinutes) > 300) {
      alert("Maximum shift length is 300 minutes.");
      return;
    }
    if (!shiftMinutes || isNaN(Number(shiftMinutes)) || Number(shiftMinutes) < 15) {
      alert("Shift length must be between 15 and 300 minutes.");
      return;
    }
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
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
              }),
            });
            if (!res.ok) {
              const data = await res.json();
              alert(data.message || "Failed to start shift");
              return;
            }
            console.log(groupId, sessionUserId, latitude, longitude, shiftMinutes);
            alert("Shift started!");
            setShowShiftForm(false);
            setShiftMinutes("");
            // Optionally, reload to show the open shift
            window.location.reload();
          } catch (err) {
            alert("Error saving shift: " + err.message);
          }
        },
        (error) => {
          alert("Could not get your location.");
          setShowShiftForm(false);
        }
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
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
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
        }
      );
    } else {
      alert("Geolocation not supported.");
      setEndingShift(false);
    }
  }

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

  // --- Main render ---
  return (
    <div className="pageContent">
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
                window.confirm("Are you sure you want to remove yourself from this group?")
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
                    throw new Error(result?.message || "Failed to remove from group");
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
        </div>

        {/* Add member details form (same as before, not repeated here for brevity) */}
        {showEditDetailsForm && (
          // ... your existing Add Details form here ...
          <div className={styles.formDiv}>
            {/* ... copy your current form code here ... */}
          </div>
        )}

        {/* Start Shift form */}
        {showShiftForm && (
          <div className={styles.formDiv}>
            <form className={styles.editDetailsForm} onSubmit={handleShiftStart}>
              <h3>Start Shift</h3>
              <label>Estimated Shift Length (minutes, 15–300):</label>
              <input
                type="number"
                min="15"
                max="300"
                className={styles.input}
                value={shiftMinutes}
                onChange={e => setShiftMinutes(e.target.value)}
                required
                placeholder="e.g., 60"
              />
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
                      ?.map(id => id.toString())
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
                        ?.map(id => id.toString())
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

        {/* Work Shifts Table and Filter */}
        <div className={styles.rowWiseElementDiv} style={{ marginTop: "2rem" }}>
          <h2>
            Shifts{" "}
            <span style={{ fontWeight: "normal", fontSize: "1rem" }}>
              (last{" "}
              <select
                value={weeksFilter}
                onChange={e => setWeeksFilter(Number(e.target.value))}
                style={{ fontSize: "1rem" }}
              >
                {WEEK_OPTIONS.map(opt => (
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
                const start = shift.startTime ? new Date(shift.startTime) : null;

                let status = "Open";
                if (shift.actualEndTime) status = "Closed";
                else if (estEnd && new Date() > estEnd) status = "Timed Out";

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
                    <td>
                      {start ? start.toLocaleString() : "N/A"}
                    </td>
                    <td>
                      {shift.startLocation
                        ? `${shift.startLocation.lat?.toFixed(5)}, ${shift.startLocation.lng?.toFixed(5)}`
                        : "N/A"}
                    </td>
                    <td>
                      {estEnd ? estEnd.toLocaleString() : "N/A"}
                    </td>
                    <td>
                      {actualEnd
                        ? actualEnd.toLocaleString()
                        : ""}
                    </td>
                    <td>
                      {shift.endLocation
                        ? `${shift.endLocation.lat?.toFixed(5)}, ${shift.endLocation.lng?.toFixed(5)}`
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
      </div>
    </div>
  );
};

export default sessionUserProfile;
