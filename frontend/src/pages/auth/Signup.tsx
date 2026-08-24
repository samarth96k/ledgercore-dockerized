import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { api } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [accountId, setAccountId] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await api.post(
          "/api/user/register",
          {
            name,
            email,
            password,
            accountId,
          },
        );

      const {
        token,
        user,
      } = response.data;

      login(token, user);

      navigate("/wallet");

    } catch (error: any) {
      setError(
        error.response?.data?.message ??
          "Registration failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">

      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Register your LedgerCore wallet
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <Input
            label="Name"
            value={name}
            onChange={setName}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
          />

          <Input
            label="Account ID"
            value={accountId}
            onChange={setAccountId}
          />

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-medium text-slate-900"
          >
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}


interface InputProps {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}

function Input({
  label,
  value,
  type = "text",
  onChange,
}: InputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        required
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
      />
    </div>
  );
}