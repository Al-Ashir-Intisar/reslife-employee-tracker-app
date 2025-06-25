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

  // state variables for storing form information for member details editting.
  const [role, setRole] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);

  // variable to track edit mode for user info tables
  const [editRoleMode, setEditRoleMode] = useState(false);
  const [editCertsMode, setEditCertsMode] = useState(false);
  const [editAttrsMode, setEditAttrsMode] = useState(false);

  // Form data mirrors
  const [editedRole, setEditedRole] = useState("");
  const [editedCerts, setEditedCerts] = useState([]);
  const [editedAttrs, setEditedAttrs] = useState([]);

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

  const toggleEditDetailsForm = () => {
    setEditDetailsForm(!showEditDetailsForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = [];

    // --- Field-by-field validation (none mandatory individually) ---
    const hasValidRole = role.trim() !== "";

    const hasValidCerts = certifications.some((c, i) => {
      const nameOk = c.name?.trim() !== "";
      const dateOk =
        c.expiresAt?.trim() !== "" && !isNaN(Date.parse(c.expiresAt));
      if (!nameOk || !dateOk) {
        errors.push(
          `Certification ${
            i + 1
          } is invalid (missing name or valid expiration).`
        );
        return false;
      }
      return true;
    });

    const hasValidAttrs = customAttributes.some((attr, i) => {
      const key = attr.key?.trim();
      const type = attr.type;
      const value = attr.value;

      if (!key) {
        errors.push(`Custom Attribute ${i + 1} key is empty.`);
        return false;
      }

      if (
        value === undefined ||
        value === null ||
        value.toString().trim() === ""
      ) {
        errors.push(`Custom Attribute ${i + 1} value is empty.`);
        return false;
      }

      switch (type) {
        case "number":
          if (isNaN(Number(value))) {
            errors.push(`Custom Attribute ${i + 1} must be a number.`);
            return false;
          }
          break;
        case "boolean":
          if (!["true", "false"].includes(value.toString().toLowerCase())) {
            errors.push(`Custom Attribute ${i + 1} must be true or false.`);
            return false;
          }
          break;
        case "date":
          // Match mm/dd/yyyy with leading zeros allowed (e.g. 01/09/2025)
          const mmddyyyyRegex =
            /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
          if (!mmddyyyyRegex.test(value)) {
            errors.push(
              `Custom Attribute ${
                i + 1
              } must be a valid date in "mm/dd/yyyy" format.`
            );
            return false;
          }
          break;

        case "duration":
          if (isNaN(Number(value)) || Number(value) < 0) {
            errors.push(
              `Custom Attribute ${
                i + 1
              } duration must be a non-negative number.`
            );
            return false;
          }
          break;
        case "string":
          if (typeof value !== "string") {
            errors.push(`Custom Attribute ${i + 1} must be a string.`);
            return false;
          }
          break;
      }

      return true;
    });

    // --- At least one field must be valid ---
    if (!hasValidRole && !hasValidCerts && !hasValidAttrs) {
      alert(
        "Please enter at least one valid field to save changes. \n Fix the following issues:\n\n" +
          errors.join("\n")
      );
      return;
    }

    if (errors.length > 0) {
      alert("Please fix the following issues:\n\n" + errors.join("\n"));
      return;
    }

    // All good: submit
    const data = {
      ...(hasValidRole && { role }),
      ...(hasValidCerts && { certifications }),
      ...(hasValidAttrs && { customAttributes }),
    };

    console.log("Submitted Membership Data:", data);

    // --- API call ---
    const body = {
      groupId,
      memberId,
      ...(hasValidRole && { role }),
      ...(hasValidCerts && { certifications }),
      ...(hasValidAttrs && { customAttributes }),
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
      window.location.reload(); // refresh to show updated member details
    } catch (err) {
      console.error("Submit error:", err);
      alert("An error occurred while updating membership.");
    }

    // Reset
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
        // console.log("Fetched Group:", data[0]);
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
            Add Member Details
          </button>
        </div>
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
        </div>
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
                  </tr>
                  <tr>
                    <th>Email</th>
                    <td>{selectedMember.email}</td>
                  </tr>
                  <tr>
                    <th>ID</th>
                    <td>{selectedMember._id}</td>
                  </tr>
                  <tr>
                    <th>Role</th>
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
                            onClick={() => setEditRoleMode(false)}
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
                      setEditedCerts(found?.certifications || []);
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
                        onClick={() =>
                          setEditedCerts(
                            editedCerts.filter((_, idx) => idx !== i)
                          )
                        }
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
                          await updateMemberField({
                            certifications: editedCerts,
                          });
                          setEditCertsMode(false);
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
                      onClick={() => setEditCertsMode(false)}
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
                            <td>{cert.addedBy}</td>
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
                          const val =
                            attr.valueString ??
                            attr.valueNumber ??
                            attr.valueBoolean?.toString() ??
                            attr.valueDate?.split("T")[0] ??
                            attr.valueDurationMinutes?.toString() ??
                            "";
                          return {
                            key: attr.key,
                            type: attr.type,
                            value: val,
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
                        onClick={() =>
                          setEditedAttrs(
                            editedAttrs.filter((_, idx) => idx !== i)
                          )
                        }
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
                          await updateMemberField({
                            customAttributes: editedAttrs,
                          });
                          setEditAttrsMode(false);
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
                      onClick={() => setEditAttrsMode(false)}
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
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMember.groupMemberships
                        .find(
                          (m) =>
                            m.groupId === groupId || m.groupId?._id === groupId
                        )
                        ?.customAttributes?.map((attr, i) => {
                          const value =
                            attr.valueString ??
                            attr.valueNumber ??
                            attr.valueBoolean?.toString() ??
                            (attr.valueDate &&
                              new Date(attr.valueDate).toLocaleDateString()) ??
                            attr.valueDurationMinutes?.toString() + " min" ??
                            "N/A";
                          return (
                            <tr key={i}>
                              <td>{attr.key}</td>
                              <td>{attr.type}</td>
                              <td>{value}</td>
                            </tr>
                          );
                        }) ?? (
                        <tr>
                          <td colSpan="3">No attributes found.</td>
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
