"use client";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Select from "react-select";
import { set } from "mongoose";

async function getGroups() {
  const res = await fetch("/api/groups", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch groups from MongoDB");
  return res.json();
}

async function getUsers(memberId) {
  const res = await fetch(`/api/users?id=${memberId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users from MongoDB");
  }
  return res.json();
}

const GroupPage = () => {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupPage;

  // state for storing the info about current group of the page
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

  // states for adding attribute to members in bulk
  const [showAddAttributeForm, setShowAddAttributeForm] = useState(false);

  const [attrFormUserIds, setAttrFormUserIds] = useState([]);
  const [attrFormKey, setAttrFormKey] = useState("");
  const [attrFormType, setAttrFormType] = useState("string");
  const [attrFormValue, setAttrFormValue] = useState("");

  // handle function for saving the add attribute changes
  const handleBulkAddAttribute = async (e) => {
    e.preventDefault();

    if (!attrFormKey.trim()) {
      alert("Attribute key is required.");
      return;
    }
    if (attrFormUserIds.length === 0) {
      alert("Select at least one user.");
      return;
    }

    // Validate the value based on type
    let attrValueObj = {};
    switch (attrFormType) {
      case "string":
        attrValueObj = { valueString: attrFormValue };
        break;
      case "number":
        if (isNaN(Number(attrFormValue))) {
          alert("Value must be a valid number.");
          return;
        }
        attrValueObj = { valueNumber: Number(attrFormValue) };
        break;
      case "boolean":
        if (attrFormValue !== "true" && attrFormValue !== "false") {
          alert("Select true or false for a boolean value.");
          return;
        }
        attrValueObj = { valueBoolean: attrFormValue === "true" };
        break;
      case "date":
        if (!attrFormValue) {
          alert("Pick a date.");
          return;
        }
        attrValueObj = { valueDate: attrFormValue };
        break;
      case "duration":
        if (isNaN(Number(attrFormValue)) || Number(attrFormValue) < 0) {
          alert("Enter a non-negative number for duration (minutes).");
          return;
        }
        attrValueObj = { valueDurationMinutes: Number(attrFormValue) };
        break;
    }

    // Prepare API payload: add this attribute to all selected users
    const edited = attrFormUserIds.map((userId) => ({
      userId,
      attr: {
        key: attrFormKey.trim(),
        type: attrFormType,
        ...attrValueObj,
      },
    }));

    try {
      const res = await fetch("/api/users/bulkAddAttribute", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          pendingAttrChanges: { edited, deleted: [] },
        }),
      });
      if (!res.ok) throw new Error("Failed to add attribute");
      // Reset form
      setAttrFormUserIds([]);
      setAttrFormKey("");
      setAttrFormType("string");
      setAttrFormValue("");
      setShowAddAttributeForm(false);
      window.location.reload(); // or refetch data
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // state variables for adding certification to members in bulk
  const [showAddCertificationForm, setShowAddCertificationForm] =
    useState(false);

  const [certFormUserIds, setCertFormUserIds] = useState([]);
  const [certFormName, setCertFormName] = useState("");
  const [certFormExpiresAt, setCertFormExpiresAt] = useState("");

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
        // console.log(data);
        const group = data.find((g) => g._id === groupId);
        setSelectedGroup(group);
      } catch (error) {
        console.error("Error fetching groups from MongoDB:", error);
      }
    };

    if (groupId) fetchGroups();
  }, [groupId]);

  // state variable to store selected members
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!groupId || !selectedGroup?.membersId?.length) return;

      try {
        const users = await Promise.all(
          selectedGroup.membersId.map((id) => getUsers(id))
        );
        // console.log("Fetched Users:", users);
        setSelectedMembers(users);
      } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
      }
    };

    fetchUsers();
  }, [selectedGroup, groupId]);

  // state to store filtered certifications
  const [certFilters, setCertFilters] = useState([]);
  const [allCertNames, setAllCertNames] = useState([]);

  // function to extract all unique certifications names
  useEffect(() => {
    const allNames = new Set();
    selectedMembers.forEach((member) => {
      const membership = member.groupMemberships?.find(
        (m) => m.groupId === groupId
      );
      membership?.certifications?.forEach((c) => {
        if (c.name?.trim()) allNames.add(c.name.trim());
      });
    });
    setAllCertNames([...allNames].sort());
  }, [selectedMembers, groupId]);

  // Convert your cert names into options
  const certOptions = allCertNames.map((name) => ({
    value: name,
    label: name,
  }));
  // console.log("certOptions: ", certOptions);

  // Attribute filter state
  const [attrFilters, setAttrFilters] = useState([]);
  const [allAttrKeys, setAllAttrKeys] = useState([]);

  // Extract unique attribute keys
  useEffect(() => {
    const attrKeys = new Set();
    selectedMembers.forEach((member) => {
      const membership = member.groupMemberships?.find(
        (m) => m.groupId === groupId
      );
      membership?.customAttributes?.forEach((attr) => {
        if (attr.key?.trim()) attrKeys.add(attr.key.trim());
      });
    });
    setAllAttrKeys([...attrKeys].sort());
  }, [selectedMembers, groupId]);

  // Convert to Select options
  const attrOptions = allAttrKeys.map((key) => ({
    value: key,
    label: key,
  }));
  // console.log("attrOptions: ", attrOptions);

  // custom styles for the select component
  const customStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "#fff",
      borderColor: "#ffa500",
      color: "#000",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#F5D389",
      color: "#000",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 100,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "#ffe0b3" : "#fff",
      color: "#000",
    }),
  };

  // state variable for certifications editing and deleting in group page
  const [editingCerts, setEditingCerts] = useState({});
  const [pendingCertChanges, setPendingCertChanges] = useState({
    edited: [],
    deleted: [],
  });

  // handle function for adding certification to members in bulk
  const handleBulkAddCertification = async (e) => {
    e.preventDefault();

    if (!certFormName.trim()) {
      alert("Certification name is required.");
      return;
    }
    if (!certFormExpiresAt) {
      alert("Expiration date is required.");
      return;
    }
    if (certFormUserIds.length === 0) {
      alert("Select at least one user.");
      return;
    }

    // Prepare API payload: add this certification to all selected users
    const edited = certFormUserIds.map((userId) => ({
      userId,
      cert: {
        name: certFormName.trim(),
        expiresAt: new Date(certFormExpiresAt).toISOString(),
        // Optionally: issuedAt, issuedBy, notes, etc.
      },
    }));

    try {
      const res = await fetch("/api/users/bulkAddCerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          pendingCertChanges: { edited, deleted: [] },
        }),
      });
      if (!res.ok) throw new Error("Failed to add certification");
      // Reset form
      setCertFormUserIds([]);
      setCertFormName("");
      setCertFormExpiresAt("");
      setShowAddCertificationForm(false);
      window.location.reload(); // or refetch data
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // handle for certifications deleting and editting in bulk
  const handleSavePendingCertChanges = async (changes = pendingCertChanges) => {
    // console.log("Pending Cert Changes to Save:", changes);

    try {
      const res = await fetch("/api/users/bulkUpdateCerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          pendingCertChanges: changes,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.message || "Failed to save changes");
      }

      // Clear state after successful update
      setEditingCerts({});
      setPendingCertChanges({ edited: [], deleted: [] });

      // Optional reload
      window.location.reload();
    } catch (err) {
      alert("Error saving changes: " + err.message);
    }
  };

  // state variable for attributes editting and deleting in group page in bulk
  const [editingAttrs, setEditingAttrs] = useState({});
  const [pendingAttrChanges, setPendingAttrChanges] = useState({
    edited: [],
    deleted: [],
  });

  // handle for attributes deleting and editing in bulk
  const handleSavePendingAttrChanges = async (changes = pendingAttrChanges) => {
    try {
      const res = await fetch("/api/users/bulkUpdateAttrs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId, // make sure groupId is in your component scope
          pendingAttrChanges: changes,
        }),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.message || "Failed to save attribute changes");
      }

      // Success: Reset states and optionally reload data/UI
      setEditingAttrs({});
      setPendingAttrChanges({ edited: [], deleted: [] });
      window.location.reload(); // optional: for instant refresh, or you can refetch data instead
    } catch (err) {
      alert("Error saving attribute changes: " + err.message);
    }
  };

  // Handler for deleting the group
  const handleDeleteGroup = async () => {
    if (!selectedGroup || !groupId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this group?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/groups/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      if (res.ok) {
        alert("Group deleted successfully.");
        router.push("/dashboard");
      } else {
        const msg = await res.text();
        alert("Delete failed: " + msg);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An unexpected error occurred.");
    }
  };

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
      // Check if already in the group
      if (selectedGroup?.membersId.includes(user._id)) {
        alert("This user is already a member of the group.");
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
    // console.log("Submitting member IDs:", membersIds);
    // console.log("To group ID:", groupId);
    // console.log("With emails:", memberEmails);

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

  // variable to check if the user is an admin of the group
  const isAdmin = selectedGroup?.adminIds
    ?.map((id) => id.toString())
    .includes(session?.data?.user?._id);

  // console.log("Session user id:", session?.data?.user?._id);
  // console.log("Selected group member IDs:", selectedGroup?.adminIds);
  // console.log(isAdmin);

  // state for bulk task assignments
  const [showBulkAssignTaskForm, setShowBulkAssignTaskForm] = useState(false);

  const [taskFormUserIds, setTaskFormUserIds] = useState([]);
  const [taskFormDescription, setTaskFormDescription] = useState("");
  const [taskFormDeadline, setTaskFormDeadline] = useState("");

  //  Bulk Assign Task Handler
  const handleBulkAssignTask = async (e) => {
    e.preventDefault();

    if (!taskFormDescription.trim()) {
      alert("Task description is required.");
      return;
    }
    if (!taskFormDeadline) {
      alert("Task deadline is required.");
      return;
    }
    if (taskFormUserIds.length === 0) {
      alert("Select at least one user.");
      return;
    }

    const edited = taskFormUserIds.map((userId) => ({
      userId,
      task: {
        description: taskFormDescription.trim(),
        deadline: new Date(taskFormDeadline).toISOString(),
      },
    }));

    try {
      const res = await fetch("/api/users/bulkAssignTasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          tasks: edited,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign tasks");
      // Reset form
      setTaskFormUserIds([]);
      setTaskFormDescription("");
      setTaskFormDeadline("");
      setShowBulkAssignTaskForm(false);
      window.location.reload();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // states for Task filter and bulk Edit/Delete
  const [taskFilters, setTaskFilters] = useState([]);
  const [allTaskDescriptions, setAllTaskDescriptions] = useState([]);
  const [editingTasks, setEditingTasks] = useState({});
  const [pendingTaskChanges, setPendingTaskChanges] = useState({
    edited: [],
    deleted: [],
  });

  // Gather Unique Task Descriptions
  useEffect(() => {
    const allDescs = new Set();
    selectedMembers.forEach((member) => {
      const membership = member.groupMemberships?.find(
        (m) => m.groupId === groupId
      );
      membership?.tasks?.forEach((t) => {
        if (t.description?.trim()) allDescs.add(t.description.trim());
      });
    });
    setAllTaskDescriptions([...allDescs].sort());
  }, [selectedMembers, groupId]);
  // Convert to Select options:
  const taskOptions = allTaskDescriptions.map((desc) => ({
    value: desc,
    label: desc,
  }));

  // Bulk Save handler
  const handleSavePendingTaskChanges = async (changes = pendingTaskChanges) => {
    try {
      const res = await fetch("/api/users/bulkUpdateTasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          pendingTaskChanges: changes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save task changes");
      // console.log("Changes:", changes);
      setEditingTasks({});
      setPendingTaskChanges({ edited: [], deleted: [] });
      window.location.reload();
    } catch (err) {
      alert("Error saving task changes: " + err.message);
    }
  };

  // state variables for anouncement edit
  const [editAnnouncement, setEditAnnouncement] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState(
    selectedGroup?.announcement?.message || ""
  );

  if (session.status === "authenticated") {
    return (
      <>
        <div className="pageContent">
          <div className={styles.dashButtons}>
            <button
              className={styles.profileButton}
              onClick={() => router.push(`/dashboard/${groupId}/userProfile`)}
            >
              Your Profile
            </button>
            {isAdmin && (
              <button
                className={styles.createMember}
                onClick={toggleAddMemberForm}
                disabled={!isAdmin}
              >
                Add new Members
              </button>
            )}

            {/* <button className={styles.sendInvite}>Invite a new user</button> */}
            {isAdmin && (
              <button
                className={styles.createMember}
                disabled={!isAdmin}
                onClick={() => setShowAddAttributeForm(true)}
              >
                Add an Attribute
              </button>
            )}
            {isAdmin && (
              <button
                className={styles.createMember}
                disabled={!isAdmin}
                onClick={() => setShowAddCertificationForm(true)}
              >
                Add a Certification
              </button>
            )}
            {isAdmin && (
              <button
                className={styles.createMember}
                disabled={!isAdmin}
                onClick={() => setShowBulkAssignTaskForm(true)}
              >
                Assign Task
              </button>
            )}
            {session?.data?.user?._id === selectedGroup?.ownerId && (
              <button
                className={styles.deleteGroup}
                onClick={handleDeleteGroup}
                disabled={session?.data?.user?._id !== selectedGroup?.ownerId}
              >
                Delete this Group
              </button>
            )}
          </div>
          {/* div for announcement display */}
          <div className={styles.announcementBlock}>
            <h3 className={styles.announcementHeader}>Group Announcement:</h3>
            {isAdmin && editAnnouncement ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await fetch("/api/groups/announcement", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        groupId,
                        announcement: {
                          message: announcementDraft,
                          updatedAt: new Date(),
                          updatedBy: session?.data?.user?._id,
                        },
                      }),
                    });
                    if (!res.ok)
                      throw new Error("Failed to update announcement");
                    setEditAnnouncement(false);
                    window.location.reload();
                  } catch (err) {
                    alert("Error: " + err.message);
                  }
                }}
              >
                <textarea
                  value={announcementDraft}
                  onChange={(e) => setAnnouncementDraft(e.target.value)}
                  maxLength={400}
                  rows={3}
                  style={{ width: "100%" }}
                />
                <button type="submit" className={styles.editButton}>
                  Save
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => {
                    setEditAnnouncement(false);
                    setAnnouncementDraft(
                      selectedGroup?.announcement?.message || ""
                    );
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div className={styles.announcementText}>
                  {selectedGroup?.announcement?.message?.length > 0 ? (
                    selectedGroup.announcement.message
                  ) : (
                    <span style={{ color: "#888" }}>No announcement yet.</span>
                  )}
                </div>
                {isAdmin && (
                  <button
                    className={styles.editButton}
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => {
                      setEditAnnouncement(true);
                      setAnnouncementDraft(
                        selectedGroup?.announcement?.message || ""
                      );
                    }}
                  >
                    {selectedGroup?.announcement?.message?.length > 0
                      ? "Edit"
                      : "Add"}{" "}
                    Announcement
                  </button>
                )}
              </>
            )}
          </div>

          {showAddAttributeForm && (
            <div className={styles.formDiv}>
              <form
                className={styles.addMemberForm}
                onSubmit={handleBulkAddAttribute}
              >
                <h3>Add Attribute to Multiple Members</h3>

                <label>Assign to:</label>
                <Select
                  isMulti
                  options={selectedMembers.map((m) => ({
                    value: m._id,
                    label: m.name || m.email,
                  }))}
                  value={selectedMembers
                    .filter((m) => attrFormUserIds.includes(m._id))
                    .map((m) => ({
                      value: m._id,
                      label: m.name || m.email,
                    }))}
                  onChange={(selected) =>
                    setAttrFormUserIds(selected.map((opt) => opt.value))
                  }
                  placeholder="Select members..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={customStyles}
                />

                <label>Key:</label>
                <input
                  type="text"
                  value={attrFormKey}
                  onChange={(e) => setAttrFormKey(e.target.value)}
                  required
                />

                <label>Type:</label>
                <select
                  value={attrFormType}
                  onChange={(e) => {
                    setAttrFormType(e.target.value);
                    setAttrFormValue(""); // reset value on type change
                  }}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="duration">Duration</option>
                </select>

                <label>Value:</label>
                {/* Input depends on type */}
                {attrFormType === "string" && (
                  <input
                    type="text"
                    value={attrFormValue}
                    onChange={(e) => setAttrFormValue(e.target.value)}
                    required
                  />
                )}
                {attrFormType === "number" && (
                  <input
                    type="number"
                    value={attrFormValue}
                    onChange={(e) => setAttrFormValue(e.target.value)}
                    required
                  />
                )}
                {attrFormType === "boolean" && (
                  <select
                    value={attrFormValue}
                    onChange={(e) => setAttrFormValue(e.target.value)}
                    required
                  >
                    <option value="">Select</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                )}
                {attrFormType === "date" && (
                  <input
                    type="date"
                    value={attrFormValue}
                    onChange={(e) => setAttrFormValue(e.target.value)}
                    required
                  />
                )}
                {attrFormType === "duration" && (
                  <input
                    type="number"
                    min="0"
                    value={attrFormValue}
                    onChange={(e) => setAttrFormValue(e.target.value)}
                    required
                    placeholder="Minutes"
                  />
                )}

                <div className={styles.formButtonGroup}>
                  <button type="submit" className={styles.submitButton}>
                    Add Attribute
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowAddAttributeForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {showAddCertificationForm && (
            <div className={styles.formDiv}>
              <form
                className={styles.addMemberForm}
                onSubmit={handleBulkAddCertification}
              >
                <h3>Add Certification to Multiple Members</h3>

                <label>Assign to:</label>
                <Select
                  isMulti
                  options={selectedMembers.map((m) => ({
                    value: m._id,
                    label: m.name || m.email,
                  }))}
                  value={selectedMembers
                    .filter((m) => certFormUserIds.includes(m._id))
                    .map((m) => ({
                      value: m._id,
                      label: m.name || m.email,
                    }))}
                  onChange={(selected) =>
                    setCertFormUserIds(selected.map((opt) => opt.value))
                  }
                  placeholder="Select members..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={customStyles}
                />

                <label>Name:</label>
                <input
                  type="text"
                  value={certFormName}
                  onChange={(e) => setCertFormName(e.target.value)}
                  required
                />

                <label>Expires At:</label>
                <input
                  type="date"
                  value={certFormExpiresAt}
                  onChange={(e) => setCertFormExpiresAt(e.target.value)}
                  required
                />

                <div className={styles.formButtonGroup}>
                  <button type="submit" className={styles.submitButton}>
                    Add Certification
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowAddCertificationForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

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
          {showBulkAssignTaskForm && (
            <div className={styles.formDiv}>
              <form
                className={styles.addMemberForm}
                onSubmit={handleBulkAssignTask}
              >
                <h3>Assign Task to Multiple Members</h3>

                <label>Assign to:</label>
                <Select
                  isMulti
                  options={selectedMembers.map((m) => ({
                    value: m._id,
                    label: m.name || m.email,
                  }))}
                  value={selectedMembers
                    .filter((m) => taskFormUserIds.includes(m._id))
                    .map((m) => ({
                      value: m._id,
                      label: m.name || m.email,
                    }))}
                  onChange={(selected) =>
                    setTaskFormUserIds(selected.map((opt) => opt.value))
                  }
                  placeholder="Select members..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={customStyles}
                />

                <label>Description:</label>
                <textarea
                  className={styles.input}
                  value={taskFormDescription}
                  onChange={(e) => setTaskFormDescription(e.target.value)}
                  required
                  maxLength={280}
                  placeholder="Describe the task (max 280 chars)"
                />

                <label>Deadline:</label>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={taskFormDeadline}
                  required
                  onChange={(e) => setTaskFormDeadline(e.target.value)}
                />

                <div className={styles.formButtonGroup}>
                  <button type="submit" className={styles.submitButton}>
                    Assign Task
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowBulkAssignTaskForm(false);
                      setTaskFormUserIds([]);
                      setTaskFormDescription("");
                      setTaskFormDeadline("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className={styles.memberDetails}>
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Group Role</th>
                  <th>Team Role</th>
                  <th>Certifications & Attributes</th>
                  <th>Active Tasks</th>
                </tr>
              </thead>
              <tbody>
                {selectedMembers.map((member) => {
                  const memberId = member._id;
                  const isAdmin = selectedGroup?.adminIds?.includes(memberId);
                  const isOwner = selectedGroup?.ownerId === memberId;

                  const groupRole = isOwner
                    ? "Owner"
                    : isAdmin
                    ? "Admin"
                    : "Member";

                  const membership = member.groupMemberships?.find(
                    (m) => m.groupId === groupId
                  );
                  const role = membership?.role || "N/A";

                  return (
                    <tr key={memberId}>
                      <td className={styles.memberPageLinkCell}>
                        <Link
                          href={`/dashboard/${groupId}/${memberId}`}
                          className={styles.fullCellLink}
                        >
                          {member.name}
                        </Link>
                      </td>
                      <td>{groupRole}</td>
                      <td>{role}</td>
                      <td>
                        {(membership?.certifications || []).length +
                          (membership?.customAttributes || []).length}
                      </td>
                      <td>
                        {membership?.tasks
                          ? membership.tasks.filter((t) => !t.completed).length
                          : 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className={styles.filtersDiv}>
              <div>
                {" "}
                <label>Filter by Certifications:</label>
                <Select
                  isMulti
                  options={certOptions}
                  value={certOptions.filter((o) =>
                    certFilters.includes(o.value)
                  )}
                  onChange={(selected) =>
                    setCertFilters(selected.map((s) => s.value))
                  }
                  placeholder="Select certifications..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={customStyles}
                />
              </div>
            </div>
            <div className={styles.tableButtonsDiv}>
              {isAdmin && certFilters.length !== 0 && (
                <button
                  className={styles.saveChangesButton}
                  onClick={() =>
                    handleSavePendingCertChanges(pendingCertChanges)
                  }
                >
                  Save Changes
                </button>
              )}

              {isAdmin && certFilters.length != 0 && (
                <button
                  className={styles.cancelChangesButton}
                  onClick={() => {
                    setPendingCertChanges({
                      edited: [],
                      deleted: [],
                    });
                    setEditingCerts({});
                    // console.log(
                    //   "Pending certs after cancel: ",
                    //   pendingCertChanges
                    // );
                  }}
                >
                  Cancel Changes
                </button>
              )}
            </div>

            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Certification</th>
                  <th>Expires At</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {selectedMembers
                  .filter((member) => {
                    if (certFilters.length === 0) return true;

                    const membership = member.groupMemberships?.find(
                      (m) => m.groupId === groupId
                    );
                    const certNames = (membership?.certifications || []).map(
                      (c) => c.name
                    );

                    return certFilters.some((filter) =>
                      certNames.includes(filter)
                    );
                  })
                  .flatMap((member) => {
                    const membership = member.groupMemberships?.find(
                      (m) => m.groupId === groupId
                    );

                    return (membership?.certifications || [])
                      .filter((c) => certFilters.includes(c.name))
                      .map((c, i) => (
                        <tr key={`${member._id}-${i}`}>
                          <td>{member.name}</td>
                          <td>{c.name}</td>
                          <td>
                            {editingCerts[`${member._id}_${c._id}`] ? (
                              <input
                                type="date"
                                value={editingCerts[`${member._id}_${c._id}`]}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  setEditingCerts((prev) => ({
                                    ...prev,
                                    [`${member._id}_${c._id}`]: newDate,
                                  }));

                                  setPendingCertChanges((prev) => {
                                    const updated = {
                                      ...c,
                                      expiresAt: new Date(
                                        newDate
                                      ).toISOString(),
                                    };
                                    return {
                                      ...prev,
                                      edited: [
                                        ...prev.edited.filter(
                                          (item) =>
                                            item.cert._id !== c._id ||
                                            item.userId !== member._id
                                        ),
                                        { userId: member._id, cert: updated },
                                      ],
                                    };
                                  });
                                }}
                              />
                            ) : (
                              new Date(c.expiresAt).toLocaleDateString()
                            )}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className={styles.tableButtonsDiv}>
                                {/* Edit Mode */}
                                {editingCerts[`${member._id}_${c._id}`] ? (
                                  <>
                                    <button
                                      className={styles.tableEdit}
                                      onClick={() => {
                                        setEditingCerts((prev) => {
                                          const updated = { ...prev };
                                          delete updated[
                                            `${member._id}_${c._id}`
                                          ];
                                          return updated;
                                        });
                                        setPendingCertChanges((prev) => ({
                                          ...prev,
                                          edited: prev.edited.filter(
                                            (item) =>
                                              item.cert._id !== c._id ||
                                              item.userId !== member._id
                                          ),
                                        }));
                                      }}
                                    >
                                      ❌
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className={styles.tableEdit}
                                    disabled={
                                      // disable if this cert is marked for deletion
                                      pendingCertChanges.deleted.some(
                                        (item) =>
                                          item.cert._id === c._id &&
                                          item.userId === member._id
                                      )
                                    }
                                    onClick={() => {
                                      setEditingCerts((prev) => ({
                                        ...prev,
                                        [`${member._id}_${c._id}`]:
                                          c.expiresAt?.split("T")[0] || "",
                                      }));
                                    }}
                                  >
                                    🖊️
                                  </button>
                                )}

                                {/* Delete Mode */}
                                {pendingCertChanges.deleted.some(
                                  (item) =>
                                    item.cert._id === c._id &&
                                    item.userId === member._id
                                ) ? (
                                  <button
                                    className={styles.tableDelete}
                                    onClick={() => {
                                      // ❌ Cancel deletion
                                      setPendingCertChanges((prev) => ({
                                        ...prev,
                                        deleted: prev.deleted.filter(
                                          (item) =>
                                            !(
                                              item.cert._id === c._id &&
                                              item.userId === member._id
                                            )
                                        ),
                                      }));
                                    }}
                                  >
                                    ❌
                                  </button>
                                ) : (
                                  <button
                                    className={styles.tableDelete}
                                    disabled={
                                      // disable if this cert is being edited
                                      !!editingCerts[`${member._id}_${c._id}`]
                                    }
                                    onClick={() => {
                                      // 🗑️ Mark for deletion
                                      setPendingCertChanges((prev) => ({
                                        ...prev,
                                        deleted: [
                                          ...prev.deleted,
                                          { userId: member._id, cert: c },
                                        ],
                                      }));
                                    }}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ));
                  })}
              </tbody>
            </table>

            <div className={styles.filtersDiv}>
              <div>
                <label>Filter by Attributes:</label>
                <Select
                  isMulti
                  options={attrOptions}
                  value={attrOptions.filter((o) =>
                    attrFilters.includes(o.value)
                  )}
                  onChange={(selected) =>
                    setAttrFilters(selected.map((s) => s.value))
                  }
                  placeholder="Select attributes..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={customStyles}
                />
              </div>
            </div>
            <div className={styles.tableButtonsDiv}>
              {isAdmin && attrFilters.length !== 0 && (
                <button
                  className={styles.saveChangesButton}
                  onClick={() =>
                    handleSavePendingAttrChanges(pendingAttrChanges)
                  }
                >
                  Save Changes
                </button>
              )}
              {isAdmin && attrFilters.length !== 0 && (
                <button
                  className={styles.cancelChangesButton}
                  onClick={() => {
                    setPendingAttrChanges({ edited: [], deleted: [] });
                    setEditingAttrs({});
                  }}
                >
                  Cancel Changes
                </button>
              )}
            </div>
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attribute Key</th>
                  <th>Value</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {selectedMembers
                  .filter((member) => {
                    if (attrFilters.length === 0) return true;
                    const membership = member.groupMemberships?.find(
                      (m) => m.groupId === groupId
                    );
                    const keys = (membership?.customAttributes || []).map(
                      (a) => a.key
                    );
                    return attrFilters.some((f) => keys.includes(f));
                  })
                  .flatMap((member) => {
                    const membership = member.groupMemberships?.find(
                      (m) => m.groupId === groupId
                    );
                    return (membership?.customAttributes || [])
                      .filter((attr) => attrFilters.includes(attr.key))
                      .map((attr, i) => {
                        const attrKey = `${member._id}_${attr.key}`;

                        // Get value for display
                        let value = "N/A";
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
                                : "N/A";
                            break;
                          case "date":
                            value = attr.valueDate
                              ? new Date(attr.valueDate)
                                  .toISOString()
                                  .slice(0, 10)
                              : "";
                            break;
                          case "duration":
                            value =
                              attr.valueDurationMinutes != null
                                ? `${attr.valueDurationMinutes} min`
                                : "N/A";
                            break;
                        }

                        const isEditing = editingAttrs[attrKey] !== undefined;
                        const isDeleting = pendingAttrChanges.deleted.some(
                          (item) =>
                            item.attr.key === attr.key &&
                            item.userId === member._id
                        );

                        return (
                          <tr key={attrKey}>
                            <td>{member.name}</td>
                            <td>{attr.key}</td>
                            <td>
                              {isEditing ? (
                                <>
                                  {/* String input */}
                                  {attr.type === "string" && (
                                    <input
                                      type="text"
                                      value={editingAttrs[attrKey] ?? ""}
                                      onChange={(e) => {
                                        setEditingAttrs((prev) => ({
                                          ...prev,
                                          [attrKey]: e.target.value,
                                        }));
                                        setPendingAttrChanges((prev) => {
                                          const updated = {
                                            ...attr,
                                            valueString: e.target.value,
                                          };
                                          return {
                                            ...prev,
                                            edited: [
                                              ...prev.edited.filter(
                                                (item) =>
                                                  item.attr.key !== attr.key ||
                                                  item.userId !== member._id
                                              ),
                                              {
                                                userId: member._id,
                                                attr: updated,
                                              },
                                            ],
                                          };
                                        });
                                      }}
                                    />
                                  )}

                                  {/* Number input */}
                                  {attr.type === "number" && (
                                    <input
                                      type="number"
                                      value={editingAttrs[attrKey] ?? ""}
                                      step="any"
                                      onChange={(e) => {
                                        setEditingAttrs((prev) => ({
                                          ...prev,
                                          [attrKey]: e.target.value,
                                        }));
                                        setPendingAttrChanges((prev) => {
                                          const num =
                                            e.target.value === ""
                                              ? ""
                                              : Number(e.target.value);
                                          const updated = {
                                            ...attr,
                                            valueNumber: num,
                                          };
                                          return {
                                            ...prev,
                                            edited: [
                                              ...prev.edited.filter(
                                                (item) =>
                                                  item.attr.key !== attr.key ||
                                                  item.userId !== member._id
                                              ),
                                              {
                                                userId: member._id,
                                                attr: updated,
                                              },
                                            ],
                                          };
                                        });
                                      }}
                                    />
                                  )}

                                  {/* Boolean select */}
                                  {attr.type === "boolean" && (
                                    <select
                                      value={
                                        editingAttrs[attrKey] === undefined
                                          ? attr.valueBoolean === true
                                            ? "true"
                                            : attr.valueBoolean === false
                                            ? "false"
                                            : ""
                                          : editingAttrs[attrKey]
                                      }
                                      onChange={(e) => {
                                        setEditingAttrs((prev) => ({
                                          ...prev,
                                          [attrKey]: e.target.value,
                                        }));
                                        setPendingAttrChanges((prev) => {
                                          const updated = {
                                            ...attr,
                                            valueBoolean:
                                              e.target.value === "true",
                                          };
                                          return {
                                            ...prev,
                                            edited: [
                                              ...prev.edited.filter(
                                                (item) =>
                                                  item.attr.key !== attr.key ||
                                                  item.userId !== member._id
                                              ),
                                              {
                                                userId: member._id,
                                                attr: updated,
                                              },
                                            ],
                                          };
                                        });
                                      }}
                                    >
                                      <option value="">Select...</option>
                                      <option value="true">true</option>
                                      <option value="false">false</option>
                                    </select>
                                  )}

                                  {/* Date input */}
                                  {attr.type === "date" && (
                                    <input
                                      type="date"
                                      value={editingAttrs[attrKey] ?? ""}
                                      onChange={(e) => {
                                        setEditingAttrs((prev) => ({
                                          ...prev,
                                          [attrKey]: e.target.value,
                                        }));
                                        setPendingAttrChanges((prev) => {
                                          const updated = {
                                            ...attr,
                                            valueDate: e.target.value,
                                          };
                                          return {
                                            ...prev,
                                            edited: [
                                              ...prev.edited.filter(
                                                (item) =>
                                                  item.attr.key !== attr.key ||
                                                  item.userId !== member._id
                                              ),
                                              {
                                                userId: member._id,
                                                attr: updated,
                                              },
                                            ],
                                          };
                                        });
                                      }}
                                    />
                                  )}

                                  {/* Duration (minutes) */}
                                  {attr.type === "duration" && (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <input
                                        type="number"
                                        min="0"
                                        value={
                                          editingAttrs[attrKey]?.replace?.(
                                            /\D/g,
                                            ""
                                          ) ?? ""
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value.replace(
                                            /\D/g,
                                            ""
                                          );
                                          setEditingAttrs((prev) => ({
                                            ...prev,
                                            [attrKey]: val,
                                          }));
                                          setPendingAttrChanges((prev) => {
                                            const updated = {
                                              ...attr,
                                              valueDurationMinutes: Number(val),
                                            };
                                            return {
                                              ...prev,
                                              edited: [
                                                ...prev.edited.filter(
                                                  (item) =>
                                                    item.attr.key !==
                                                      attr.key ||
                                                    item.userId !== member._id
                                                ),
                                                {
                                                  userId: member._id,
                                                  attr: updated,
                                                },
                                              ],
                                            };
                                          });
                                        }}
                                        style={{ width: "60px" }}
                                      />
                                      <span style={{ marginLeft: "0.25em" }}>
                                        min
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                value
                              )}
                            </td>
                            {isAdmin && (
                              <td>
                                <div className={styles.tableButtonsDiv}>
                                  {/* Edit Button */}
                                  {isEditing ? (
                                    <button
                                      className={styles.tableEdit}
                                      onClick={() => {
                                        setEditingAttrs((prev) => {
                                          const updated = { ...prev };
                                          delete updated[attrKey];
                                          return updated;
                                        });
                                        setPendingAttrChanges((prev) => ({
                                          ...prev,
                                          edited: prev.edited.filter(
                                            (item) =>
                                              item.attr.key !== attr.key ||
                                              item.userId !== member._id
                                          ),
                                        }));
                                      }}
                                    >
                                      ❌
                                    </button>
                                  ) : (
                                    <button
                                      className={styles.tableEdit}
                                      disabled={isDeleting}
                                      onClick={() => {
                                        // Initial edit value per type
                                        let initialEditValue = "";
                                        switch (attr.type) {
                                          case "string":
                                            initialEditValue =
                                              attr.valueString ?? "";
                                            break;
                                          case "number":
                                            initialEditValue =
                                              attr.valueNumber?.toString() ??
                                              "";
                                            break;
                                          case "boolean":
                                            initialEditValue =
                                              attr.valueBoolean === true
                                                ? "true"
                                                : attr.valueBoolean === false
                                                ? "false"
                                                : "";
                                            break;
                                          case "date":
                                            initialEditValue = attr.valueDate
                                              ? new Date(attr.valueDate)
                                                  .toISOString()
                                                  .slice(0, 10)
                                              : "";
                                            break;
                                          case "duration":
                                            initialEditValue =
                                              attr.valueDurationMinutes != null
                                                ? attr.valueDurationMinutes.toString()
                                                : "";
                                            break;
                                        }
                                        setEditingAttrs((prev) => ({
                                          ...prev,
                                          [attrKey]: initialEditValue,
                                        }));
                                      }}
                                    >
                                      🖊️
                                    </button>
                                  )}

                                  {/* Delete Button */}
                                  {isDeleting ? (
                                    <button
                                      className={styles.tableDelete}
                                      onClick={() => {
                                        setPendingAttrChanges((prev) => ({
                                          ...prev,
                                          deleted: prev.deleted.filter(
                                            (item) =>
                                              !(
                                                item.attr.key === attr.key &&
                                                item.userId === member._id
                                              )
                                          ),
                                        }));
                                      }}
                                    >
                                      ❌
                                    </button>
                                  ) : (
                                    <button
                                      className={styles.tableDelete}
                                      disabled={isEditing}
                                      onClick={() => {
                                        setPendingAttrChanges((prev) => ({
                                          ...prev,
                                          deleted: [
                                            ...prev.deleted,
                                            { userId: member._id, attr },
                                          ],
                                        }));
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      });
                  })}
              </tbody>
            </table>
            <div className={styles.filtersDiv}>
              <div>
                <label>Filter by Tasks:</label>
                <Select
                  isMulti
                  options={taskOptions}
                  value={taskOptions.filter((o) =>
                    taskFilters.includes(o.value)
                  )}
                  onChange={(selected) =>
                    setTaskFilters(selected.map((s) => s.value))
                  }
                  placeholder="Select task descriptions..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={customStyles}
                />
              </div>
            </div>
            <div className={styles.tableButtonsDiv}>
              {isAdmin && taskFilters.length !== 0 && (
                <>
                  <button
                    className={styles.saveChangesButton}
                    onClick={() =>
                      handleSavePendingTaskChanges(pendingTaskChanges)
                    }
                  >
                    Save Changes
                  </button>
                  <button
                    className={styles.cancelChangesButton}
                    onClick={() => {
                      setPendingTaskChanges({ edited: [], deleted: [] });
                      setEditingTasks({});
                    }}
                  >
                    Cancel Changes
                  </button>
                </>
              )}
            </div>
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Task Description</th>
                  <th>Deadline</th>
                  <th>Assigned By</th>
                  {/* <th>Assigned At</th> */}
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {taskFilters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 6 : 5}
                      style={{ textAlign: "center" }}
                    >
                      Select a task filter to view tasks.
                    </td>
                  </tr>
                ) : (
                  selectedMembers
                    .filter((member) => {
                      const membership = member.groupMemberships?.find(
                        (m) => m.groupId === groupId
                      );
                      const descriptions = (membership?.tasks || []).map(
                        (t) => t.description
                      );
                      return taskFilters.some((f) => descriptions.includes(f));
                    })
                    .flatMap((member) => {
                      const membership = member.groupMemberships?.find(
                        (m) => m.groupId === groupId
                      );
                      return (membership?.tasks || [])
                        .filter((t) => taskFilters.includes(t.description))
                        .map((t) => {
                          const taskKey = `${member._id}_${t._id}`;
                          const isEditing = editingTasks[taskKey] !== undefined;
                          const isDeleting = pendingTaskChanges.deleted.some(
                            (item) =>
                              item.taskId === t._id &&
                              item.userId === member._id
                          );

                          return (
                            <tr
                              key={taskKey}
                              style={{
                                backgroundColor: t.completed
                                  ? "lightgreen"
                                  : "#181c25",
                                color: t.completed ? "black" : "white",
                              }}
                            >
                              <td>{member.name}</td>
                              <td>{t.description}</td>
                              <td>
                                {t.deadline
                                  ? new Date(t.deadline).toLocaleString()
                                  : "N/A"}
                              </td>
                              <td>
                                {selectedGroup?.adminIds
                                  ?.map((id) => id.toString())
                                  .includes(t.assignedBy?.toString())
                                  ? "admin"
                                  : "user"}
                              </td>
                              {/* <td>
                              {t.assignedAt
                                ? new Date(t.assignedAt).toLocaleString()
                                : "N/A"}
                            </td> */}
                              {isAdmin && (
                                <td>
                                  <div className={styles.tableButtonsDiv}>
                                    {/* Complete/Incomplete Button */}
                                    {isEditing ? (
                                      <button
                                        className={styles.tableEdit}
                                        onClick={() => {
                                          setEditingTasks((prev) => {
                                            const updated = { ...prev };
                                            delete updated[taskKey];
                                            return updated;
                                          });
                                          setPendingTaskChanges((prev) => ({
                                            ...prev,
                                            edited: prev.edited.filter(
                                              (item) =>
                                                item.taskId !== t._id ||
                                                item.userId !== member._id
                                            ),
                                          }));
                                        }}
                                      >
                                        ❌
                                      </button>
                                    ) : t.completed ? (
                                      <button
                                        className={styles.tableEdit}
                                        disabled={isDeleting}
                                        onClick={() => {
                                          setEditingTasks((prev) => ({
                                            ...prev,
                                            [taskKey]: false,
                                          }));
                                          setPendingTaskChanges((prev) => ({
                                            ...prev,
                                            edited: [
                                              ...prev.edited.filter(
                                                (item) =>
                                                  item.taskId !== t._id ||
                                                  item.userId !== member._id
                                              ),
                                              {
                                                userId: member._id,
                                                taskId: t._id,
                                                completed: false,
                                              },
                                            ],
                                          }));
                                        }}
                                      >
                                        ⏳
                                      </button>
                                    ) : (
                                      <button
                                        className={styles.tableEdit}
                                        disabled={isDeleting}
                                        onClick={() => {
                                          setEditingTasks((prev) => ({
                                            ...prev,
                                            [taskKey]: true,
                                          }));
                                          setPendingTaskChanges((prev) => ({
                                            ...prev,
                                            edited: [
                                              ...prev.edited.filter(
                                                (item) =>
                                                  item.taskId !== t._id ||
                                                  item.userId !== member._id
                                              ),
                                              {
                                                userId: member._id,
                                                taskId: t._id,
                                                completed: true,
                                              },
                                            ],
                                          }));
                                        }}
                                      >
                                        ✔️
                                      </button>
                                    )}

                                    {/* Delete Button */}
                                    {isDeleting ? (
                                      <button
                                        className={styles.tableDelete}
                                        onClick={() => {
                                          setPendingTaskChanges((prev) => ({
                                            ...prev,
                                            deleted: prev.deleted.filter(
                                              (item) =>
                                                !(
                                                  item.taskId === t._id &&
                                                  item.userId === member._id
                                                )
                                            ),
                                          }));
                                        }}
                                      >
                                        ❌
                                      </button>
                                    ) : (
                                      <button
                                        className={styles.tableDelete}
                                        disabled={isEditing}
                                        onClick={() => {
                                          setPendingTaskChanges((prev) => ({
                                            ...prev,
                                            deleted: [
                                              ...prev.deleted,
                                              {
                                                userId: member._id,
                                                taskId: t._id,
                                              },
                                            ],
                                          }));
                                        }}
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        });
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
};

export default GroupPage;
