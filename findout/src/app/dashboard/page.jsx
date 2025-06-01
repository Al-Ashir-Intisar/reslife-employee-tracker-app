"use client"
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";

const dashboard = () => {
    console.log("Hello!")

    const groups = [
    { id: "group1", name: "Engineering" },
    { id: "group2", name: "Design" }
    ];


    return (
        <div className="pageContent">
        <div className={styles.groups}>
            {groups.map(group => (
                <Link key={group.id} href={`/dashboard/${group.id}`} className={styles.group}>
                    <span className={styles.title}>{group.name}</span>
                </Link>
            ))}
        </div>
        </div>
    );
}

export default dashboard