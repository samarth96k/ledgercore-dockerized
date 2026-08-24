import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "../../api/api";
import { formatMoney } from "../../utils/money";

// =========================================================
// TYPES
// =========================================================

type LedgerEntry = {
  id: string;
  transactionId: string;
  accountId: string;

  direction: "DEBIT" | "CREDIT";

  amount: string;
  balanceAfter: string;
  createdAt: string;

  transaction: {
    type: string;
    status: string;
    currency: string;
  };

  account: {
    id: string;
    type: string;
    systemType: string | null;
    status: string;

    user: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SearchAccount = {
  id: string;

  user: {
    id?: string;
    name: string | null;
    email: string | null;
  } | null;
};

type LedgerFilters = {
  accountId: string;
  transactionId: string;
  direction: string;
  order: "asc" | "desc";
};

// =========================================================
// COMPONENT
// =========================================================

export default function Ledger() {
  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [entries, setEntries] =
    useState<LedgerEntry[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const [direction, setDirection] =
    useState("");

  const [order, setOrder] =
    useState<"asc" | "desc">("desc");

  const [accountId, setAccountId] =
    useState("");

  const [transactionId, setTransactionId] =
    useState("");

  // -------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------

  const [search, setSearch] =
    useState("");

  const [accounts, setAccounts] =
    useState<SearchAccount[]>([]);

  const [loadingSearch, setLoadingSearch] =
    useState(false);

  const [showSearchResults, setShowSearchResults] =
    useState(false);

  // =======================================================
  // ACCOUNT SEARCH INDEX
  // =======================================================

  async function loadSearchIndex() {
    try {
      setLoadingSearch(true);

      const response = await api.get(
        "/api/account/admin/search-index",
      );

      setAccounts(
        response.data.accounts ?? [],
      );
    } catch (error: any) {
      console.error(
        "ACCOUNT SEARCH ERROR:",
        error.response?.data ?? error,
      );
    } finally {
      setLoadingSearch(false);
    }
  }

  // =======================================================
  // LOAD LEDGER
  // =======================================================

  async function loadLedger(
    requestedPage: number,
    filters?: Partial<LedgerFilters>,
  ) {
    try {
      setLoading(true);
      setError("");

      // ---------------------------------------------------
      // IMPORTANT:
      // Resolve the COMPLETE filter state first.
      // Do not depend on React state updating before
      // making the request.
      // ---------------------------------------------------

      const currentAccountId =
        filters?.accountId !== undefined
          ? filters.accountId
          : accountId;

      const currentTransactionId =
        filters?.transactionId !== undefined
          ? filters.transactionId
          : transactionId;

      const currentDirection =
        filters?.direction !== undefined
          ? filters.direction
          : direction;

      const currentOrder =
        filters?.order !== undefined
          ? filters.order
          : order;

      // ---------------------------------------------------
      // BUILD QUERY STRING EXPLICITLY
      // ---------------------------------------------------

      const params = new URLSearchParams();

      params.set(
        "page",
        String(requestedPage),
      );

      params.set(
        "limit",
        "20",
      );

      params.set(
        "order",
        currentOrder,
      );

      if (currentAccountId) {
        params.set(
          "accountId",
          currentAccountId,
        );
      }

      if (currentTransactionId) {
        params.set(
          "transactionId",
          currentTransactionId,
        );
      }

      if (currentDirection) {
        params.set(
          "direction",
          currentDirection,
        );
      }

      const url =
        `/banking/ledger?${params.toString()}`;

      console.log(
        "LEDGER REQUEST:",
        url,
      );

      // ---------------------------------------------------
      // REQUEST
      // ---------------------------------------------------

      const response =
        await api.get(url);

      // ---------------------------------------------------
      // RESPONSE
      // ---------------------------------------------------

      setEntries(
        response.data.entries ?? [],
      );

      setPagination(
        response.data.pagination ?? null,
      );

    } catch (error: any) {
      console.error(
        "LEDGER ERROR:",
        error.response?.data ?? error,
      );

      setError(
        error.response?.data?.message ??
          "Failed to load ledger.",
      );

      setEntries([]);

      setPagination(null);

    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadSearchIndex();

    loadLedger(1, {
      accountId: "",
      transactionId: "",
      direction: "",
      order: "desc",
    });
  }, []);

  // =======================================================
  // SEARCH RESULTS
  // =======================================================

  const filteredAccounts =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return [];
      }

      return accounts
        .filter((account) => {
          const accountName =
            account.user?.name
              ?.toLowerCase() ?? "";

          const email =
            account.user?.email
              ?.toLowerCase() ?? "";

          const id =
            account.id.toLowerCase();

          return (
            accountName.includes(value) ||
            email.includes(value) ||
            id.includes(value)
          );
        })
        .slice(0, 10);
    }, [search, accounts]);

  // =======================================================
  // SELECT ACCOUNT
  // =======================================================

  function selectAccount(
    account: SearchAccount,
  ) {
    const selectedAccountId =
      account.id;

    setAccountId(
      selectedAccountId,
    );

    setTransactionId("");

    setSearch(
      account.user?.name ??
        selectedAccountId,
    );

    setShowSearchResults(false);

    loadLedger(1, {
      accountId:
        selectedAccountId,

      transactionId: "",

      direction,

      order,
    });
  }

  // =======================================================
  // CLEAR SEARCH
  // =======================================================

  function clearSearch() {
    setSearch("");

    setAccountId("");

    setTransactionId("");

    setShowSearchResults(false);

    loadLedger(1, {
      accountId: "",
      transactionId: "",
      direction,
      order,
    });
  }

  // =======================================================
  // TRANSACTION SEARCH
  // =======================================================

  function searchTransaction() {
    const value =
      search.trim();

    if (!value) {
      return;
    }

    setTransactionId(value);

    setAccountId("");

    setShowSearchResults(false);

    loadLedger(1, {
      accountId: "",
      transactionId: value,
      direction,
      order,
    });
  }

  // =======================================================
  // DIRECTION CHANGE
  // =======================================================

  function handleDirectionChange(
    value: string,
  ) {
    setDirection(value);

    loadLedger(1, {
      accountId,
      transactionId,
      direction: value,
      order,
    });
  }

  // =======================================================
  // SORT CHANGE
  // =======================================================

  function handleSortChange(
    value: "asc" | "desc",
  ) {
    setOrder(value);

    loadLedger(1, {
      accountId,
      transactionId,
      direction,
      order: value,
    });
  }

  // =======================================================
  // RESET
  // =======================================================

  function resetFilters() {
    setSearch("");

    setAccountId("");

    setTransactionId("");

    setDirection("");

    setOrder("desc");

    setShowSearchResults(false);

    loadLedger(1, {
      accountId: "",
      transactionId: "",
      direction: "",
      order: "desc",
    });
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div>
        <h1 className="text-2xl font-semibold">
          Ledger
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Inspect immutable ledger entries and
          accounting movements.
        </p>
      </div>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <div className="relative">

        <label className="mb-2 block text-sm font-medium">
          Search Account / Transaction
        </label>

        <div className="flex gap-2">

          <div className="relative flex-1">

            <input
              value={search}
              onChange={(e) => {
                const value =
                  e.target.value;

                setSearch(value);

                setShowSearchResults(
                  value.trim().length > 0,
                );
              }}
              onFocus={() => {
                if (search.trim()) {
                  setShowSearchResults(
                    true,
                  );
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchTransaction();
                }

                if (e.key === "Escape") {
                  setShowSearchResults(false);
                }
              }}
              placeholder="Search by name, email or account ID..."
              className="w-full rounded-lg border bg-white px-4 py-3 pr-16 outline-none focus:ring-2"
            />

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}

          </div>

          <button
            type="button"
            onClick={searchTransaction}
            disabled={!search.trim()}
            className="rounded-lg border bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Search
          </button>

        </div>

        {/* SEARCH RESULTS */}

        {showSearchResults &&
          search.trim() &&
          filteredAccounts.length > 0 && (

            <div className="absolute left-0 z-30 mt-1 max-h-72 w-[calc(100%-100px)] overflow-y-auto rounded-lg border bg-white shadow-lg">

              {filteredAccounts.map(
                (account) => (

                  <button
                    key={account.id}
                    type="button"
                    onClick={() =>
                      selectAccount(account)
                    }
                    className="block w-full border-b px-4 py-3 text-left hover:bg-slate-50"
                  >

                    <div className="font-medium">
                      {account.user?.name ??
                        "System Account"}
                    </div>

                    {account.user?.email && (
                      <div className="text-xs text-slate-500">
                        {account.user.email}
                      </div>
                    )}

                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {account.id}
                    </div>

                  </button>
                ),
              )}

            </div>
          )}

        {loadingSearch &&
          search.trim() && (
            <div className="absolute left-0 z-30 mt-1 w-[calc(100%-100px)] rounded-lg border bg-white p-4 text-sm text-slate-500 shadow-lg">
              Loading accounts...
            </div>
          )}

      </div>

      {/* ===================================================
          ACTIVE FILTER
      =================================================== */}

      {(accountId ||
        transactionId ||
        direction) && (

        <div className="flex flex-wrap gap-2">

          {accountId && (
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
              Account:{" "}
              <span className="font-mono">
                {accountId}
              </span>
            </div>
          )}

          {transactionId && (
            <div className="rounded-full bg-purple-50 px-3 py-1 text-xs text-purple-700">
              Transaction:{" "}
              <span className="font-mono">
                {transactionId}
              </span>
            </div>
          )}

          {direction && (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              Direction:{" "}
              <span className="font-medium">
                {direction}
              </span>
            </div>
          )}

        </div>
      )}

      {/* ===================================================
          FILTERS
      =================================================== */}

      <div className="flex flex-wrap items-end gap-4">

        {/* DIRECTION */}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Direction
          </label>

          <select
            value={direction}
            onChange={(e) =>
              handleDirectionChange(
                e.target.value,
              )
            }
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          >

            <option value="">
              All
            </option>

            <option value="DEBIT">
              Debit
            </option>

            <option value="CREDIT">
              Credit
            </option>

          </select>
        </div>

        {/* SORT */}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Sort
          </label>

          <select
            value={order}
            onChange={(e) =>
              handleSortChange(
                e.target.value as
                  | "asc"
                  | "desc",
              )
            }
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
          onClick={resetFilters}
          className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          Reset
        </button>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ===================================================
          TABLE
      =================================================== */}

      <div className="overflow-hidden rounded-xl border bg-white">

        {loading ? (

          <div className="p-8 text-center text-slate-500">
            Loading ledger...
          </div>

        ) : !entries.length ? (

          <div className="p-8 text-center text-slate-500">
            No ledger entries found.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-100">

                <tr>

                  <Header>
                    Date
                  </Header>

                  <Header>
                    Account
                  </Header>

                  <Header>
                    Transaction ID
                  </Header>

                  {/* <Header>
                    Type
                  </Header> */}

                  <Header>
                    Direction
                  </Header>

                  <Header align="right">
                    Amount
                  </Header>

                  {/* <Header align="right">
                    Balance After
                  </Header> */}

                  <Header>
                    Status
                  </Header>

                </tr>

              </thead>

              <tbody>

                {entries.map(
                  (entry) => {

                    const date =
                      new Date(
                        entry.createdAt,
                      );

                    const displayDate =
                      date.toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      );

                    const displayTime =
                      date.toLocaleTimeString(
                        "en-IN",
                      );

                    const accountName =
                      entry.account
                        .systemType ??
                      entry.account.user
                        ?.name ??
                      "System Account";

                    const failed =
                      entry.transaction
                        .status ===
                      "FAILED";

                    const amountColor =
                      failed
                        ? "text-gray-500"
                        : entry.direction ===
                          "DEBIT"
                        ? "text-red-600"
                        : "text-green-600";

                    return (
                      <tr
                        key={entry.id}
                        className="border-b hover:bg-slate-50"
                      >

                        {/* DATE */}

                        <td
                          className="whitespace-nowrap px-5 py-4"
                          title={displayTime}
                        >
                          {displayDate}

                          <div className="text-xs text-slate-400">
                            {displayTime}
                          </div>
                        </td>

                        {/* ACCOUNT */}

                        <td
                          className="px-5 py-4"
                          title={entry.accountId}
                        >

                          <div className="font-medium">
                            {accountName}
                          </div>

                          <div className="mt-1 font-mono text-xs text-slate-400">
                            {entry.accountId}
                          </div>

                        </td>

                        {/* TRANSACTION */}

                        <td
                          className="max-w-[220px] truncate px-5 py-4 font-mono text-xs"
                          title={
                            entry.transactionId
                          }
                        >
                          {entry.transactionId}
                        </td>

                        {/* TYPE */}

                        {/* <td className="px-5 py-4">
                          {toTitle(
                            entry.transaction
                              .type,
                          )}
                        </td> */}

                        {/* DIRECTION */}

                        <td
                          className={`px-5 py-4 font-medium ${
                            failed
                              ? "text-gray-500"
                              : entry.direction ===
                                "DEBIT"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {entry.direction}
                        </td>

                        {/* AMOUNT */}

                        <td
                          className={`px-5 py-4 text-right font-semibold ${amountColor}`}
                        >

                          {entry.direction ===
                          "DEBIT"
                            ? "-"
                            : "+"}{" "}

                          {formatMoney(
                            BigInt(
                              entry.amount,
                            ),
                          )}

                        </td>

                        {/* BALANCE */}

                        {/* <td className="px-5 py-4 text-right">
                          {formatMoney(
                            BigInt(
                              entry.balanceAfter,
                            ),
                          )}
                        </td> */}

                        {/* STATUS */}

                        <td
                          className={`px-5 py-4 font-medium ${
                            failed
                              ? "text-gray-500"
                              : entry.transaction
                                  .status ===
                                "SUCCESS"
                              ? "text-green-600"
                              : "text-orange-500"
                          }`}
                        >
                          {
                            entry.transaction
                              .status
                          }
                        </td>

                      </tr>
                    );
                  },
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ===================================================
          PAGINATION
      =================================================== */}

      {pagination &&
        pagination.totalPages > 1 && (

          <div className="flex items-center justify-between">

            <div className="text-sm text-slate-500">
              Showing page{" "}
              {pagination.page} of{" "}
              {pagination.totalPages}{" "}
              ({pagination.total} entries)
            </div>

            <div className="flex items-center gap-2">

              {/* PREVIOUS */}

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page <= 1
                }
                onClick={() =>
                  loadLedger(
                    pagination.page - 1,
                    {
                      accountId,
                      transactionId,
                      direction,
                      order,
                    },
                  )
                }
                className="rounded-lg border bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-sm font-medium">
                {pagination.page} /{" "}
                {pagination.totalPages}
              </span>

              {/* NEXT */}

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page >=
                    pagination.totalPages
                }
                onClick={() =>
                  loadLedger(
                    pagination.page + 1,
                    {
                      accountId,
                      transactionId,
                      direction,
                      order,
                    },
                  )
                }
                className="rounded-lg border bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>

            </div>

          </div>
        )}

    </div>
  );
}

// =========================================================
// TABLE HEADER
// =========================================================

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
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

// =========================================================
// TITLE FORMATTER
// =========================================================

// function toTitle(text: string) {
//   return text
//     .toLowerCase()
//     .replace(/_/g, " ")
//     .replace(/\b\w/g, (c) =>
//       c.toUpperCase(),
//     );
// }