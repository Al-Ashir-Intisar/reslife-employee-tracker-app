"use client";
import React from "react";
import styles from "./page.module.css";

const register = () => {
  return (
    <div className="pageContent">
      <div className={styles.registerDev}>
        <form className={styles.form}>
          <input type="text" placeholder="email" className={styles.input} />
          <input
            type="passwors"
            placeholder="password"
            className={styles.input}
          />
          <input
            type="password"
            placeholder="confirm password"
            className={styles.input}
          />
        </form>
        <button
          className={styles.register}
          onClick={() => {
            console.log("Registered Successfully");
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default register;
