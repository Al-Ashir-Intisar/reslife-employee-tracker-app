"use client";
import React, { useEffect } from "react";
import styles from "./page.module.css";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Login = () => {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "authenticated") {
      router.push("/dashboard");
    }
  }, [session.status, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.ok) {
      router.push(result.url ?? "/dashboard");
    } else {
      console.error("Login failed");
    }
  };

  if (session.status === "loading") {
    return (
      <div className="pageContent">
        <p>Loading...</p>
      </div>
    );
  }
  if (session.status !== "unauthenticated") {
    return null;
  }
  if (session.status === "unauthenticated") {
    return (
      <div className="pageContent">
        <div className={styles.logInDev}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input type="text" placeholder="email" className={styles.input} />
            <input
              type="password"
              placeholder="password"
              className={styles.input}
            />
            <button className={styles.login}>LogIn</button>
          </form>
          <button
            className={styles.login}
            onClick={() => {
              signIn("google", {
                callbackUrl: "/dashboard",
              });
            }}
          >
            Log In With Google
          </button>
          <Link href="/dashboard/register" className={styles.link}>
            Create a new account
          </Link>
        </div>
      </div>
    );
  }
};

export default Login;
