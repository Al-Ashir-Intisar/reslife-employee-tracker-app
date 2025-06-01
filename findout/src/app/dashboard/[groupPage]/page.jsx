"use client"
import React from 'react';
import styles from "./page.module.css";
import Link from 'next/link';
import { useParams } from 'next/navigation';

const group = () => {
  const params = useParams();
  const groupId = params.groupPage; // pulled from URL like /dashboard/[groupPage]

  // Simulated list of member data (could be fetched from DB or API)
  const members = [
    { id: 'member1', name: 'Alice' },
    { id: 'member2', name: 'Bob' },
    { id: 'member3', name: 'Charlie' },
  ];

  return (
    <div className="pageContent">
      <div className={styles.members}>
        {members.map((member) => (
          <Link
            key={member.id}
            href={`/dashboard/${groupId}/${member.id}`}
            className={styles.member}
          >
            <span className={styles.title}>
              {groupId} - {member.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default group;
