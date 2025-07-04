import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className="pageContent">
      <div className={styles.homeTexts}>
        <h1 className={styles.title}>FindOut: </h1>
        <h2>
          {" "}
          <span className={styles.subtitle}>
            Effortless info tracker for dynamic teams.
          </span>
        </h2>
        <p className={styles.description}>
          Instantly reference and manage team data, so you can focus on what
          matters.
        </p>
        <ul className={styles.featureList}>
          <li>
            <span className={styles.featureIcon}>🎓</span> Certifications
          </li>
          <li>
            <span className={styles.featureIcon}>🧑‍💼</span> Skills and expertise
          </li>
          <li>
            <span className={styles.featureIcon}>📝</span> Project history
          </li>
          <li>
            <span className={styles.featureIcon}>✅</span> Task assignments
          </li>
          <li>
            <span className={styles.featureIcon}>🔗</span> Custom team metadata
          </li>
          <li>
            <span className={styles.featureIcon}>⏱️</span> Time keeping for work
            hours
          </li>
        </ul>

        <p className={styles.description}>
          Perfect for environments where fast access to employee info powers
          smarter project planning.
        </p>
      </div>
      <div className={styles.homePageLogo}>
        <Image
          src="/findoutLogo.png"
          width={300}
          height={300}
          layout="responsive"
          alt="FindOut app logo."
          className={styles.image}
        />
      </div>
    </div>
  );
}
