import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className="pageContent">
      <div className={styles.homeTexts}>
        <h1 className={styles.title}>FindOut: </h1>

        <p className={styles.description}>
          Fast and Easy info tracker for dynamic teams. Instantly reference and
          manage team data, so you can focus on what matters.
        </p>
        <h2>
          {" "}
          <span className={styles.subtitle}>
            Go to your "Dashboard" to get started.
          </span>
        </h2>
        <ul className={styles.featureList}>
          <li tabIndex={0}>
            <span className={styles.featureIcon}>
              <Image
                src="/timeKeeping.png"
                alt="Time Keeping"
                width={56}
                height={56}
              />
            </span>
            <span className={styles.featureText}>
              Time keeping for work hours
            </span>
          </li>
          <li tabIndex={0}>
            <span className={styles.featureIcon}>
              <Image
                src="/taskAssignments.png"
                alt="Task Assignments"
                width={56}
                height={56}
              />
            </span>
            <span className={styles.featureText}>Task assignments</span>
          </li>
          <li tabIndex={0}>
            <span className={styles.featureIcon}>
              <Image
                src="/projectHistory.png"
                alt="Project History"
                width={56}
                height={56}
              />
            </span>
            <span className={styles.featureText}>Project history</span>
          </li>
          <li tabIndex={0}>
            <span className={styles.featureIcon}>
              <Image
                src="/skills&expertise.png"
                alt="Skills and Expertise"
                width={56}
                height={56}
              />
            </span>
            <span className={styles.featureText}>Skills and expertise</span>
          </li>
          <li tabIndex={0}>
            <span className={styles.featureIcon}>
              <Image
                src="/certifications.png"
                alt="Certifications"
                width={56}
                height={56}
              />
            </span>
            <span className={styles.featureText}>Certifications</span>
          </li>
          <li tabIndex={0}>
            <span className={styles.featureIcon}>
              <Image
                src="/customMetadata.png"
                alt="Custom Metadata"
                width={56}
                height={56}
              />
            </span>
            <span className={styles.featureText}>Custom team metadata</span>
          </li>
        </ul>

        <p className={styles.description}>
          Perfect for environments where fast access to employee info powers
          smarter project planning.
        </p>
      </div>
      {/* <div className={styles.homePageLogo}>
        <Image
          src="/findoutLogo.png"
          width={300}
          height={300}
          layout="responsive"
          alt="FindOut app logo."
          className={styles.image}
        />
      </div> */}
    </div>
  );
}
