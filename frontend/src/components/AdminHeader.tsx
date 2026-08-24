import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminHeader() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b bg-white px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            LedgerCore
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Financial Ledger System
          </p>
        </div>

        <div className="flex items-center gap-6">
          <span className="font-bold tracking-wide">
            ADMIN
          </span>

          <button
            onClick={handleLogout}
            className="rounded border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}