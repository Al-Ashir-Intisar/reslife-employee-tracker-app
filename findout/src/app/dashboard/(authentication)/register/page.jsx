"use client";
import React from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const register = () => {
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;
    const confirmPassword = e.target[3].value;

    setError(""); // reset

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
        }),
      });

      if (response.status === 201) {
        router.push("/dashboard/login?success=Account created successfully");
      } else {
        const message = await response.text();
        setError(message);
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  const session = useSession();
  // console.log("Session:", session);

  if (session.status === "loading") {
    return (
      <div className="pageContent">
        <p>Loading...</p>
      </div>
    );
  }

  if (session.status === "authenticated") {
    router?.push("/dashboard");
  }

  return (
    <div className="pageContent">
      <div className={styles.registerDev}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="username"
            className={styles.input}
            required
          />
          <input
            type="text"
            placeholder="email"
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="password"
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="confirm password"
            className={styles.input}
            required
          />
          <button className={styles.register}>Register</button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        <Link href="/dashboard/login" className={styles.link}>
          Login with an existing account
        </Link>
      </div>
    </div>
  );
};

export default register;
