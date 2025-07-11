"use client";
import Link from "next/link";
import React from "react";
import styles from "./navbar.module.css";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

const links = [
  {
    id: 1,
    title: "Home",
    url: "/",
  },
  {
    id: 2,
    title: "Dashboard",
    url: "/dashboard",
  },
  // {
  //   id: 3,
  //   title: "Contact",
  //   url: "/contact",
  // },
];

const Navbar = () => {
  const session = useSession();
  return (
    <div className={styles.container}>
      <div className={styles.logos}>
        {/* <div className={styles.logoWrapper}>
          <Image
            src="/stolafLogo.jpg"
            alt="St. Olaf Logo"
            fill
            className={styles.logo}
          />
        </div> */}
        <div className={styles.logoWrapper}>
          <Image
            src="/reslifeLogoBlack.png"
            alt="ResLife Logo"
            fill
            className={styles.logo}
          />
        </div>
      </div>

      <div className={styles.links}>
        {links.map((link) => (
          <Link key={link.id} href={link.url} className={styles.navButton}>
            {link.title}
          </Link>
        ))}

        {session.status === "authenticated" && (
          <button
            className={styles.logout}
            onClick={() => {
              console.log("logged out");
              signOut({ callbackUrl: "/" });
            }}
          >
            LogOut
          </button>
        )}
        {session.status === "unauthenticated" && (
          <button className={styles.login}>
            <Link href="/dashboard/login">LogIn or SignUp</Link>
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
