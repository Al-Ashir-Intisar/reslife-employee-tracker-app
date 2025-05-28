"use client"
import React from "react";
import styles from "./page.module.css";

export default function Contact() {
  return (
    <div className="pageContent">
        <div className={styles.contactDev}>
            <form className={styles.form}>
            <input type="text" placeholder="name" className={styles.input} />
            <input type="text" placeholder="email" className={styles.input} />
            <textarea placeholder="message" className={styles.textarea} cols={30} rows={10}></textarea>
        </form>
        <button 
        className={styles.send}
        onClick={() => {
            console.log("Message sent");
        }} >
        Send
        </button>
        </div>
    </div>
  );
}
