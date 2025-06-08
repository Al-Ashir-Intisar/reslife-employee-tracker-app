"use client";
import React from "react";
import styles from "./page.module.css";
import { signIn } from "next-auth/react";

const login = () => {
  return (
    <div className="pageContent">
      <div className={styles.logInDev}>
        <form className={styles.form}>
          <input type="text" placeholder="email" className={styles.input} />
          <input
            type="passwors"
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
      </div>
    </div>
  );
};

export default login;
