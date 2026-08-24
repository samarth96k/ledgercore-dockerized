import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { api } from "../../api/api";
import { formatMoney } from "../../utils/money";
import { useAuth } from "../../context/AuthContext";

interface Account {
  id: string;
  userId: string;

  type: string;

  aadhaarNumber: string | null;

  systemType: string | null;

  currency: string;

  version: number;

  status: string;

  createdAt: string;

  balance: {
    accountId: string;

    cachedBalance: string;

    lastLedgerEntryId: string | null;

    updatedAt: string;
  };

  user: {
    id: string;

    name: string;

    email: string;

    role: string;

    createdAt: string;
  };
}

export default function UserLayout() {
  const navigate = useNavigate();

  const { logout } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);

//   const [balance, setBalance] = useState("0");

  const [showBalance, setShowBalance] = useState(false);

  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

async function loadData() {
  try {
    const response = await api.get("/api/account/me");

    setAccount(response.data.account);
  } catch (error) {
    console.error(error);
  }
}

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick
      );
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">

      <header className="border-b bg-white shadow-sm">

        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-8">

          {/* Left */}

          <div>

            <h1 className="text-3xl font-bold">
              LedgerCore
            </h1>

            <p className="text-sm text-slate-500">
              Financial Ledger System
            </p>

          </div>

          {/* Middle */}

          <div>

            <p className="text-xs uppercase text-slate-500">
              Account ID
            </p>

            <p className="font-mono text-sm">
              {account?.id}
            </p>

          </div>

          {/* Balance */}

          <div>

            <p className="text-xs uppercase text-slate-500">
              Balance
            </p>

            <button
              onClick={() =>
                setShowBalance(!showBalance)
              }
              className="font-semibold hover:text-blue-600 cursor-pointer"
            >
              {showBalance?(account
  ? formatMoney(account.balance.cachedBalance)
  : "₹0.00"):"View Balance"}
            </button>

          </div>

          {/* Menu */}

          <div
            className="relative"
            ref={menuRef}
          >

            <button
              onClick={() =>
                setShowMenu(!showMenu)
              }
              className="rounded border px-4 py-2 hover:bg-slate-100 cursor-pointer"
            >
              Account ▼
            </button>

            {showMenu && (

              <div className="absolute right-0 mt-3 w-80 rounded-lg border bg-white p-5 shadow-lg">

                <div className="space-y-3 text-sm">

                  <Info
                    label="Account ID"
                    value={account?.id}
                  />

                  <Info
                    label="Type"
                    value={account?.type}
                  />

                  <Info
                    label="Currency"
                    value={account?.currency}
                  />

                  <Info
                    label="Status"
                    value={account?.status}
                  />

                  <Info
                    label="Name"
                    value={
                      account?.user.name
                    }
                  />

                  <Info
                    label="Email"
                    value={
                      account?.user.email
                    }
                  />

                  <Info
                    label="Created"
                    value={
                      account
                        ? new Date(
                            account.createdAt
                          ).toLocaleString()
                        : ""
                    }
                  />

                </div>

                <hr className="my-4" />

                <button
                  onClick={handleLogout}
                  className="w-full rounded bg-red-500 py-2 text-white hover:bg-red-600 cursor-pointer"
                >
                  Logout
                </button>

              </div>

            )}

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl p-8">

        <Outlet />

      </main>

    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>

      <div className="text-xs uppercase text-slate-400">
        {label}
      </div>

      <div className="font-medium break-all">
        {value}
      </div>

    </div>
  );
}