"use client";
import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Select from "react-select";
import { set } from "mongoose";

async function getGroups() {
  const res = await fetch("http://localhost:3000/api/groups", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch groups from MongoDB");
  return res.json();
}

async function getUsers(memberId) {
  const res = await fetch(`http://localhost:3000/api/users?id=${memberId}`, {
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
  console.log("certOptions: ", certOptions);

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
  console.log("attrOptions: ", attrOptions);

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
      backgroundColor: "#ffa500",
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

  console.log("Session user id:", session?.data?.user?._id);
  console.log("Selected group member IDs:", selectedGroup?.adminIds);
  console.log(isAdmin);

  if (session.status === "authenticated") {
    return (
      <>
        <div className={styles.dashButtons}>
          <button
            className={styles.createMember}
            onClick={toggleAddMemberForm}
            disabled={!isAdmin}
          >
            Add new Members
          </button>
          {/* <button className={styles.sendInvite}>Invite a new user</button> */}
          <button
            className={styles.deleteGroup}
            onClick={handleDeleteGroup}
            disabled={session?.data?.user?._id !== selectedGroup?.ownerId}
          >
            Delete this Group
          </button>
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
          <div className={styles.memberDetails}>
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Group Role</th>
                  <th>Team Role</th>
                  <th>Count: Certifications</th>
                  <th>Count: Attributes</th>
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
                      <td>{(membership?.certifications || []).length}</td>
                      <td>{(membership?.customAttributes || []).length}</td>
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
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Certification</th>
                  <th>Expires At</th>
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

                    // Show member if they have at least one of the selected certs
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
                          <td>{new Date(c.expiresAt).toLocaleDateString()}</td>
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
            <table className={styles.memberTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attribute Key</th>
                  <th>Value</th>
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
                        let value = "N/A";
                        switch (attr.type) {
                          case "string":
                            value = attr.valueString;
                            break;
                          case "number":
                            value = attr.valueNumber?.toString();
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
                        }

                        return (
                          <tr key={`${member._id}-${attr.key}-${i}`}>
                            <td>{member.name}</td>
                            <td>{attr.key}</td>
                            <td>{value}</td>
                          </tr>
                        );
                      });
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }
};

export default GroupPage;
