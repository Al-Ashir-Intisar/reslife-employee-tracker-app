import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";

export const PUT = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { groupId, memberId, role, certifications, customAttributes } =
    await req.json();

  if (!groupId || !memberId) {
    return NextResponse.json(
      { message: "Missing groupId or memberId" },
      { status: 400 }
    );
  }

  await connect();

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    const isAdmin = group.adminIds.some(
      (id) => id.toString() === session.user._id
    );
    if (!isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Session user is not an admin of this group" },
        { status: 403 }
      );
    }

    const user = await User.findById(memberId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const index = user.groupMemberships.findIndex(
      (gm) => gm.groupId.toString() === groupId
    );

    // Prepare certifications
    const processedCerts = Array.isArray(certifications)
      ? certifications.map((c) => ({
          name: c.name,
          expiresAt: new Date(c.expiresAt),
          addedBy: new mongoose.Types.ObjectId(session.user._id),
          addedAt: new Date(),
        }))
      : [];

    // Prepare custom attributes
    const processedAttrs = Array.isArray(customAttributes)
      ? customAttributes.map((attr) => {
          const base = {
            key: attr.key,
            type: attr.type,
            addedBy: new mongoose.Types.ObjectId(session.user._id),
            addedAt: new Date(),
          };
          switch (attr.type) {
            case "string":
              return { ...base, valueString: attr.value };
            case "number":
              return { ...base, valueNumber: Number(attr.value) };
            case "boolean":
              return {
                ...base,
                valueBoolean: attr.value.toString().toLowerCase() === "true",
              };
            case "date":
              return { ...base, valueDate: new Date(attr.value) };
            case "duration":
              return { ...base, valueDurationMinutes: Number(attr.value) };
            default:
              return base;
          }
        })
      : [];

    if (index === -1) {
      // Create new membership
      const newMembership = {
        groupId: new mongoose.Types.ObjectId(groupId),
        role: role || "member",
        certifications: processedCerts,
        customAttributes: processedAttrs,
        addedBy: new mongoose.Types.ObjectId(session.user._id),
        addedAt: new Date(),
      };
      user.groupMemberships.push(newMembership);
    } else {
      // Update existing membership
      const membership = user.groupMemberships[index];

      if (typeof role === "string" && role.trim() !== "") {
        membership.role = role;
      }

      if (processedCerts.length > 0) {
        const existingNames = new Set(
          membership.certifications.map((c) => c.name)
        );
        const newCerts = processedCerts.filter(
          (c) => !existingNames.has(c.name)
        );
        membership.certifications.push(...newCerts);
      }

      if (processedAttrs.length > 0) {
        const existingKeys = new Set(
          membership.customAttributes.map((a) => a.key)
        );
        const newAttrs = processedAttrs.filter((a) => !existingKeys.has(a.key));
        membership.customAttributes.push(...newAttrs);
      }

      membership.addedBy = new mongoose.Types.ObjectId(session.user._id);
      membership.addedAt = new Date();
    }

    await user.save();

    return NextResponse.json(
      { message: "Membership updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating membership:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};
