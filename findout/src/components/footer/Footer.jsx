import React from "react";
import styles from "./footer.module.css";
import Image from "next/image";

const Footer = () => {
  return (
    <div className={styles.container}>
      <div className={styles.texts}>©2025 FindOut. All rights reserved.</div>
      <div>
        <Image
          src="/igLogo.png"
          height={25}
          width={25}
          className={styles.logo}
          alt="Social Media"
        />
      </div>
    </div>
  );
};

export default Footer;
