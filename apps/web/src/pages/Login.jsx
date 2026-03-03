import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function Login() {
  const [email, setEmail] = useState("admin@vertex.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const auth = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await auth.login(email, password);
      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="text-2xl font-extrabold text-slate-900">Vertex Medical Manager</div>
        <div className="text-sm text-slate-500 mt-1">Login to continue</div>

        {err ? <div className="mt-4 rounded-xl bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div> : null}

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Default demo: <span className="font-semibold">admin@vertex.com</span> / <span className="font-semibold">Admin@123</span>
        </div>
      </div>
    </div>
  );
}
