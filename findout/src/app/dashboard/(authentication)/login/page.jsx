"use client"
import React from "react";
import styles from "./page.module.css";

const login = () => {
    return (
    <div className="pageContent">
        <div className={styles.logInDev}>
            <form className={styles.form}>
            <input type="text" placeholder="email" className={styles.input} />
            <input type="passwors" placeholder="password" className={styles.input} />
        </form>
        <button 
        className={styles.login}
        onClick={() => {
            console.log("Logged In");
        }} >
        LogIn
        </button>
        </div>
    </div>
    )
}

export default login 