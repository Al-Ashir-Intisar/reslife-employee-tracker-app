"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useParams } from "next/navigation";

const memberLayout = ({ children }) => {
    const params = useParams();
    const groupId = params.groupPage;
    const memberId = params.memberPage;

    return (
        <div>
            <Link href={`/dashboard/${groupId}/${memberId}`}>
                <span className={styles.mainTitle}>
                    Your {groupId} {memberId}
                </span>
            </Link>
            {children}
        </div>
    );
};
export default memberLayout;
