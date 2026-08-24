import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";
import { formatMoney } from "../../utils/money";

type SearchAccount = {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  } | null;
};

type Account = {
  id: string;
  type: string;
  systemType: string | null;
  currency: string;
  status: string;
  version: number;
  createdAt: string;

  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  } | null;

  balance: {
    cachedBalance: string;
    lastLedgerEntryId: string | null;
    updatedAt: string;
  } | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function Accounts() {
  const [searchIndex, setSearchIndex] = useState<SearchAccount[]>([]);
  const [search, setSearch] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [, setPagination] = useState<Pagination | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  const [loadingSearch, setLoadingSearch] = useState(true);

  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);

  const [error, setError] = useState("");

  const [pendingStatusChange, setPendingStatusChange] = useState<{
    accountId: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ---------------------------------------------------------
  // LOAD SEARCH INDEX
  // ---------------------------------------------------------

  useEffect(() => {
    loadSearchIndex();
    loadAccounts();
  }, []);

  async function loadSearchIndex() {
    try {
      setLoadingSearch(true);

      const response = await api.get("/api/account/admin/search-index");

      setSearchIndex(response.data.accounts ?? []);
    } catch (error: any) {
      setError(
        error.response?.data?.message ?? "Failed to load account search.",
      );
    } finally {
      setLoadingSearch(false);
    }
  }

  // ---------------------------------------------------------
  // LOAD TABLE
  // ---------------------------------------------------------

  async function loadAccounts(
    accountId?: string,
    requestedPage: number = 1,
    filters?: {
      status?: string;
      type?: string;
      order?: "asc" | "desc";
    },
  ) {
    try {
      setLoadingAccounts(true);
      setError("");

      const params: Record<string, string> = {
        page: String(requestedPage),
        limit: "20",
        order: filters?.order ?? sortOrder,
      };

      if (accountId) {
        params.accountId = accountId;
      }

      const currentStatus = filters?.status ?? status;
      const currentType = filters?.type ?? type;

      if (currentStatus) {
        params.status = currentStatus;
      }

      if (currentType) {
        params.type = currentType;
      }

      const response = await api.get("/api/account", {
        params,
      });

      setAccounts(response.data.accounts ?? []);
      setPagination(response.data.pagination ?? null);
      setPage(requestedPage);
    } catch (error: any) {
      setError(error.response?.data?.message ?? "Failed to load accounts.");

      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  // ---------------------------------------------------------
  // LOCAL SEARCH
  // ---------------------------------------------------------

  const searchResults = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return [];
    }

    return searchIndex
      .filter((account) => {
        const name = account.user?.name?.toLowerCase() ?? "";

        const email = account.user?.email?.toLowerCase() ?? "";

        const id = account.id.toLowerCase();

        return (
          name.includes(value) || email.includes(value) || id.includes(value)
        );
      })
      .slice(0, 10);
  }, [search, searchIndex]);

  // ---------------------------------------------------------
  // SELECT ACCOUNT
  // ---------------------------------------------------------

  function handleSelectAccount(accountId: string) {
    setSelectedAccountId(accountId);
    setSearch("");

    loadAccounts(accountId, 1);
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) {
      return;
    }

    const { accountId, newStatus } = pendingStatusChange;

    try {
      setUpdatingStatus(true);
      setError("");

      if (newStatus === "ACTIVE") {
        await api.patch(`/api/account/${accountId}/unfreeze`);
      } else if (newStatus === "FROZEN") {
        await api.patch(`/api/account/${accountId}/freeze`);
      } else if (newStatus === "CLOSE") {
        await api.patch(`/api/account/${accountId}/close`);
      }

      setPendingStatusChange(null);

      await loadAccounts(selectedAccountId ?? undefined, page);
    } catch (error: any) {
      setError(
        error.response?.data?.message ?? "Failed to update account status.",
      );

      await loadAccounts(selectedAccountId ?? undefined, page);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleStatusChange(
    accountId: string,
    currentStatus: string,
    newStatus: string,
  ) {
    setPendingStatusChange({
      accountId,
      currentStatus,
      newStatus,
    });
  }
  // ---------------------------------------------------------
  // CLEAR FILTER
  // ---------------------------------------------------------

  function handleShowAll() {
    setSelectedAccountId(null);
    setSearch("");

    loadAccounts(undefined, 1);
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold">Accounts</h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage and inspect ledger accounts.
        </p>
      </div>

      {/* SEARCH */}

      <div className="relative rounded-xl bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-medium">Search Account</label>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or account ID..."
          className="w-full rounded-lg border px-4 py-3 outline-none focus:border-slate-500"
        />

<div className="mt-5 flex flex-wrap items-end gap-4">

  {/* STATUS FILTER */}

  <div>
    <label className="mb-1 block text-xs font-medium text-slate-500">
      Status
    </label>

    <select
      value={status}
      onChange={(e) => {
        const value = e.target.value;

        setStatus(value);
        setPage(1);

        loadAccounts(
          selectedAccountId ?? undefined,
          1,
          {
            status: value,
            type,
            order: sortOrder,
          },
        );
      }}
      className="rounded-lg border bg-white px-3 py-2 text-sm"
    >
      <option value="">All</option>
      <option value="ACTIVE">Active</option>
      <option value="FROZEN">Frozen</option>
      <option value="CLOSE">Closed</option>
    </select>
  </div>


  {/* ACCOUNT TYPE FILTER */}

  <div>
    <label className="mb-1 block text-xs font-medium text-slate-500">
      Account Type
    </label>

    <select
      value={type}
      onChange={(e) => {
        const value = e.target.value;

        setType(value);
        setPage(1);

        loadAccounts(
          selectedAccountId ?? undefined,
          1,
          {
            status,
            type: value,
            order: sortOrder,
          },
        );
      }}
      className="rounded-lg border bg-white px-3 py-2 text-sm"
    >
      <option value="">All</option>
      <option value="USER_WALLET">
        User Wallet
      </option>
      <option value="SYSTEM">
        System
      </option>
    </select>
  </div>


  {/* SORT */}

  <div>
    <label className="mb-1 block text-xs font-medium text-slate-500">
      Sort
    </label>

    <select
      value={sortOrder}
      onChange={(e) => {
        const value =
          e.target.value as "asc" | "desc";

        setSortOrder(value);
        setPage(1);

        loadAccounts(
          selectedAccountId ?? undefined,
          1,
          {
            status,
            type,
            order: value,
          },
        );
      }}
      className="rounded-lg border bg-white px-3 py-2 text-sm"
    >
      <option value="desc">
        Newest First
      </option>

      <option value="asc">
        Oldest First
      </option>
    </select>
  </div>


  {/* RESET */}

  <button
    type="button"
    onClick={() => {
      setStatus("");
      setType("");
      setSortOrder("desc");
      setSelectedAccountId(null);
      setSearch("");
      setPage(1);

      loadAccounts(undefined, 1, {
        status: "",
        type: "",
        order: "desc",
      });
    }}
    className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-50"
  >
    Reset
  </button>

</div>

        {/* SEARCH RESULTS */}

        {search && searchResults.length > 0 && (
          <div className="absolute left-5 right-5 top-[105px] z-10 overflow-hidden rounded-lg border bg-white shadow-lg">
            {searchResults.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => handleSelectAccount(account.id)}
                className="block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
              >
                <div className="font-medium">
                  {account.user?.name ?? "System Account"}
                </div>

                <div className="mt-1 text-xs text-slate-500">{account.id}</div>

                {account.user?.email && (
                  <div className="text-xs text-slate-400">
                    {account.user.email}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {search && !loadingSearch && searchResults.length === 0 && (
          <div className="mt-2 text-sm text-slate-500">
            No matching accounts.
          </div>
        )}

        {/* SELECTED */}

        {selectedAccountId && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <div>
              <div className="text-xs text-slate-500">Selected Account</div>

              <div className="font-mono text-sm">{selectedAccountId}</div>
            </div>

            <button
              onClick={handleShowAll}
              className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-100"
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* TABLE */}

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <Header>Account ID</Header>

                <Header>Name</Header>

                <Header>Type</Header>

                <Header>Currency</Header>

                <Header align="right">Balance</Header>

                <Header>Status</Header>

                <Header>Created At</Header>
              </tr>
            </thead>

            <tbody>
              {loadingAccounts ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Loading accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}

      {pendingStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Confirm Status Change</h2>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to change this account's status?
            </p>

            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Current Status</span>

                <span className="font-semibold">
                  {pendingStatusChange.currentStatus}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">New Status</span>

                <span className="font-semibold">
                  {pendingStatusChange.newStatus === "CLOSE"
                    ? "CLOSED"
                    : pendingStatusChange.newStatus}
                </span>
              </div>
            </div>

            {pendingStatusChange.newStatus === "CLOSE" && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                Closing this account is a permanent administrative action.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => setPendingStatusChange(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={confirmStatusChange}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingStatus ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// ACCOUNT ROW
// ---------------------------------------------------------

function AccountRow({
  account,
  onStatusChange,
}: {
  account: Account;
  onStatusChange: (
    accountId: string,
    currentStatus: string,
    newStatus: string,
  ) => void;
}) {
  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="px-5 py-4 font-mono text-xs">{account.id}</td>

      <td className="px-5 py-4">
        <div className="font-medium">
          {account.user?.name ?? "System Account"}
        </div>

        {account.user?.email && (
          <div className="mt-1 text-xs text-slate-400">
            {account.user.email}
          </div>
        )}
      </td>

      <td className="px-5 py-4">{toTitle(account.type)}</td>

      <td className="px-5 py-4">{account.currency}</td>

      <td className="px-5 py-4 text-right font-medium">
        {formatMoney(BigInt(account.balance?.cachedBalance ?? "0"))}
      </td>

      {/* STATUS */}

      <td className="px-5 py-4">
        <select
          value={account.status}
          onChange={(e) => {
            const newStatus = e.target.value;

            if (newStatus === account.status) {
              return;
            }

            onStatusChange(account.id, account.status, newStatus);
          }}
          className={`rounded border px-3 py-2 text-sm font-medium ${
            account.status === "ACTIVE"
              ? "text-green-600"
              : account.status === "FROZEN"
                ? "text-orange-600"
                : "text-gray-500"
          }`}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="FROZEN">FROZEN</option>
          <option value="CLOSE">CLOSED</option>
        </select>
      </td>

      <td className="px-5 py-4">
        {new Date(account.createdAt).toLocaleDateString("en-IN")}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------
// HEADER
// ---------------------------------------------------------

function Header({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-4 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

// ---------------------------------------------------------
// TITLE FORMAT
// ---------------------------------------------------------

function toTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
