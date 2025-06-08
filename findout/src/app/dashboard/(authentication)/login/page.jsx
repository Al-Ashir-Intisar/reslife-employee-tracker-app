"use client";
import React from "react";
import styles from "./page.module.css";
import { signIn } from "next-auth/react";
import Link from "next/link";

const login = () => {
  return (
    <div className="pageContent">
      <div className={styles.logInDev}>
        <form className={styles.form}>
          <input type="text" placeholder="email" className={styles.input} />
          <input
            type="password"
            placeholder="password"
            className={styles.input}
          />
        </form>
        <button
          className={styles.login}
          onClick={() => {
            console.log("Logged In");
          }}
        >
          LogIn
        </button>
        <button
          className={styles.login}
          onClick={() => {
            signIn("google", {
              callbackUrl: "/dashboard",
            });
            console.log("Google Log In");
          }}
        >
          Log In With Google
        </button>
        <Link href="/dashboard/register" className={styles.link}>
          Create a new account
        </Link>
      </div>
    </div>
  );
};

export default login;
