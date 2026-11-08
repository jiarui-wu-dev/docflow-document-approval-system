import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { motion } from "motion/react";
import { Brand } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await login(
        String(data.get("username")).trim(),
        String(data.get("password")),
      );
      form.reset();
      const from: unknown = location.state?.from;
      navigate(
        typeof from === "string" &&
          from.startsWith("/") &&
          !from.startsWith("//")
          ? from
          : "/",
        { replace: true },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <header className="login-header">
        <Brand />
        <span>Document review &amp; approval</span>
      </header>
      <main className="login-main">
        <motion.section
          className="login-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          aria-labelledby="login-title"
        >
          <div className="login-form-heading">
            <span className="login-symbol">
              <LockKeyhole size={20} strokeWidth={1.6} />
            </span>
            <h1 id="login-title">Sign in to DOCFLOW</h1>
            <p>Access your documents and review assignments.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
                required
                maxLength={100}
                pattern="[^:]+"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button className="w-full login-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <>
                  Sign in <ArrowRight size={15} />
                </>
              )}
            </Button>
          </form>
          <div className="login-security">
            <LockKeyhole size={14} />
            <p>
              Credentials are kept in memory only. Refreshing the page requires
              signing in again.
            </p>
          </div>
          <p className="login-account-note">
            Use the database account provided by your administrator.
          </p>
        </motion.section>
      </main>
      <footer className="login-bottom">
        <span>DOCFLOW</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
