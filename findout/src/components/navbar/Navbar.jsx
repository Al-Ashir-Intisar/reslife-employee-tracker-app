"use client"
import Link from 'next/link';
import React from 'react';
import styles from "./navbar.module.css";


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
  {
    id: 3,
    title: "Contact",
    url: "/contact",
  },
  
];

const Navbar = () => {
  return (
    <div className={styles.container}>
      <div className={styles.links}>
          {links.map((link) => (
              <Link key={link.id} href={link.url} className={styles.link}>
                  {link.title}
              </Link>
          ))}
          <button 
          className={styles.logout}
            onClick={()=>{
              console.log("logged out");
              }}
            >
              LogOut
            </button>
      </div>
    </div>
  )
}

export default Navbar