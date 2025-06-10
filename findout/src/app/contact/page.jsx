"use client";
import React from "react";
import styles from "./page.module.css";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Contact() {
  const session = useSession();
  const router = useRouter();

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
  if (session.status === "authenticated") {
    return (
      <div className="pageContent">
        <div className={styles.contactDev}>
          <form className={styles.form}>
            <input type="text" placeholder="name" className={styles.input} />
            <input type="text" placeholder="email" className={styles.input} />
            <textarea
              placeholder="message"
              className={styles.textarea}
              cols={40}
              rows={20}
            ></textarea>
          </form>
          <button
            className={styles.send}
            onClick={() => {
              console.log("Message sent");
            }}
          >
            Send
          </button>
        </div>
      </div>
    );
  }
}
