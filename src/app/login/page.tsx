"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import styles from "./page.module.scss";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  console.log("LoginPage rendue", { email, password, error });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log("Soumission du formulaire", { email, password });

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    console.log("Résultat de signIn:", res);

    if (res?.error) {
      setError("Email ou mot de passe incorrect");
    }

    if (res?.ok) {
      console.log("Connexion réussie, redirection vers /");
      window.location.href = "/";
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h1 className={styles.loginTitle}>Page de connexion</h1>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.loginInput}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.loginInput}
        />
        <button type="submit" className={styles.buttonLogin}>
          Se connecter
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}
