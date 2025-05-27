import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className="pageContent">
      <div className={styles.homeTexts}>
        <h1 className={styles.title}>FindOut: A non-essential temporary employee information tracker.</h1>
        <p className={styles.description}>
            The app enables teams to quickly reference and manage data about employees such as:
          </p>
          <ul className={styles.description}>
            <li>Certifications</li>
            <li>Skills and expertise</li>
            <li>Project history</li>
            <li>Availability</li>
            <li>Any custom metadata relevant to internal team workflows</li>
          </ul>
          <p className={styles.description}>
            This system is especially useful in dynamic environments where quick access to detailed employee info helps optimize task delegation and project planning.
          </p>
      </div>
      <div className={styles.homePageLogo}>
        <Image src="/findoutLogo.png" fill={true} alt="FindOut app logo."/>
      </div>
    </div>
  );
}
