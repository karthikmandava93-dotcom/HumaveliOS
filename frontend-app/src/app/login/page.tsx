"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000"
    : "https://peopleos-7c5b.onrender.com")
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "peopleos_access_token";
const AUTH_USER_KEY = "peopleos_auth_user";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(AUTH_TOKEN_KEY)) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data && typeof data === "object" && "detail" in data
            ? String(data.detail)
            : "Unable to sign in."
        );
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="humavelios-login-page">
        <section className="humavelios-login-visual" aria-label="HumaveliOS">
          <img
            className="humavelios-login-banner"
            src="/humavelios-banner.png"
            alt="HumaveliOS — People. Work. Intelligence."
          />
        </section>

        <section className="humavelios-login-side">
          <div className="humavelios-login-card">
            <div className="humavelios-login-logo-wrap">
              <img
                className="humavelios-login-logo"
                src="/humavelios-logo.png"
                alt="HumaveliOS logo"
              />
            </div>

            <div className="humavelios-login-heading">
              <span className="humavelios-login-eyebrow">
                HUMAVELIOS WORKSPACE
              </span>
              <h1>Welcome to HumaveliOS</h1>
              <p className="humavelios-login-tagline">
                People. Work. Intelligence.
              </p>
              <p>
                Sign in to access your HR and People Analytics workspace.
              </p>
            </div>

            {error && (
              <div className="humavelios-login-error" role="alert">
                {error}
              </div>
            )}

            <form className="humavelios-login-form" onSubmit={handleSubmit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@yourcompany.com"
                  autoComplete="username"
                  disabled={loading}
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </label>

              <button
                className="humavelios-login-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <p className="humavelios-login-note">
              HumaveliOS access is controlled by the administrator account
              configured on the server.
            </p>
          </div>
        </section>
      </main>

      <style jsx>{`
        .humavelios-login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(430px, 0.65fr);
          background:
            radial-gradient(circle at 86% 18%, rgba(71, 190, 255, 0.18), transparent 25%),
            radial-gradient(circle at 18% 82%, rgba(124, 58, 237, 0.12), transparent 28%),
            #f7f9fd;
        }

        .humavelios-login-visual {
          min-height: 100vh;
          padding: 22px;
          display: flex;
          align-items: stretch;
          justify-content: center;
          background: #020b1d;
        }

        .humavelios-login-banner {
          width: 100%;
          height: 100%;
          min-height: 0;
          object-fit: cover;
          object-position: center;
          border-radius: 28px;
          display: block;
          box-shadow: 0 30px 80px rgba(2, 11, 29, 0.28);
        }

        .humavelios-login-side {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
        }

        .humavelios-login-card {
          width: min(460px, 100%);
          padding: 36px;
          border: 1px solid rgba(219, 227, 239, 0.95);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(14px);
        }

        .humavelios-login-logo-wrap {
          width: 70px;
          height: 70px;
          margin-bottom: 24px;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.18);
        }

        .humavelios-login-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .humavelios-login-eyebrow {
          display: inline-block;
          margin-bottom: 9px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .humavelios-login-heading h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(28px, 3vw, 36px);
          line-height: 1.08;
          letter-spacing: -0.9px;
        }

        .humavelios-login-heading p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        .humavelios-login-heading .humavelios-login-tagline {
          color: #2563eb;
          font-weight: 750;
          letter-spacing: 0.01em;
        }

        .humavelios-login-error {
          margin-top: 20px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 12px;
          line-height: 1.45;
        }

        .humavelios-login-form {
          display: grid;
          gap: 16px;
          margin-top: 28px;
        }

        .humavelios-login-form label {
          display: grid;
          gap: 8px;
          color: #334155;
          font-size: 12px;
          font-weight: 750;
        }

        .humavelios-login-form input {
          width: 100%;
          height: 50px;
          box-sizing: border-box;
          padding: 0 15px;
          border: 1px solid #dbe4f0;
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: #172033;
          font-size: 13px;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }

        .humavelios-login-form input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .humavelios-login-button {
          height: 52px;
          margin-top: 5px;
          border: 0;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: linear-gradient(90deg, #2563eb, #1d4ed8);
          color: white;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
          transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
        }

        .humavelios-login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(37, 99, 235, 0.27);
        }

        .humavelios-login-button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .humavelios-login-button span {
          font-size: 19px;
          line-height: 1;
        }

        .humavelios-login-note {
          margin: 20px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.55;
        }

        @media (max-width: 980px) {
          .humavelios-login-page {
            grid-template-columns: 1fr;
          }

          .humavelios-login-visual {
            min-height: 38vh;
            height: 38vh;
            padding: 14px;
          }

          .humavelios-login-side {
            min-height: auto;
            padding: 24px 16px 36px;
          }

          .humavelios-login-card {
            padding: 28px;
          }
        }

        @media (max-width: 560px) {
          .humavelios-login-visual {
            min-height: 30vh;
            height: 30vh;
          }

          .humavelios-login-card {
            padding: 24px 20px;
            border-radius: 20px;
          }

          .humavelios-login-logo-wrap {
            width: 60px;
            height: 60px;
            border-radius: 16px;
          }
        }
      `}</style>
    </>
  );
}
