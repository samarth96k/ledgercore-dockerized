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

type Party = {
  accountId: string;
  name: string;
  email: string | null;
  amount: string;
  isSystemAccount: boolean;
};

type AdditionalEntry = {
  id: string;
  accountId: string;
  name: string;
  email: string | null;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  balanceAfter: string;
  isSystemAccount: boolean;
};

type Transaction = {
  id: string;

  type: string;
  status: string;

  amount: string;
  currency: string;

  initiatorUserId: string;

  initiator: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  from: Party | null;
  to: Party | null;

  additionalEntries: AdditionalEntry[];
intendedRecipient: Party | null;
  lockingStrategy: string;

  reversalOfId: string | null;
  failureReason: string | null;

  createdAt: string;
  updatedAt: string;

  ledgerEntryCount: number;
  eventCount: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type SearchUser = {
  id: string;

  user: {
    id?: string;
    name: string | null;
    email: string | null;
  } | null;
};

// =========================================================
// COMPONENT
// =========================================================

export default function Transactions() {
  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const [status, setStatus] =
    useState("");

  const [type, setType] =
    useState("");

  const [order, setOrder] =
    useState<"asc" | "desc">("desc");

  const [transactionId, setTransactionId] =
    useState("");

  const [userId, setUserId] =
    useState("");

  // -------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------

  const [search, setSearch] =
    useState("");

  const [searchUsers, setSearchUsers] =
    useState<SearchUser[]>([]);

  const [loadingSearch, setLoadingSearch] =
    useState(false);

  const [showSearchResults, setShowSearchResults] =
    useState(false);

  // -------------------------------------------------------
  // EXPANDED TRANSACTION
  // -------------------------------------------------------

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  // =======================================================
  // LOAD USER SEARCH INDEX
  // =======================================================

  async function loadSearchIndex() {
    try {
      setLoadingSearch(true);

      const response = await api.get(
        "/api/account/admin/search-index",
      );

      setSearchUsers(
        response.data.accounts ?? [],
      );
    } catch (error: any) {
      console.error(
        "TRANSACTION SEARCH INDEX ERROR:",
        error.response?.data ?? error,
      );
    } finally {
      setLoadingSearch(false);
    }
  }

  // =======================================================
  // LOAD TRANSACTIONS
  // =======================================================

  async function loadTransactions(
    requestedPage: number,
    filters?: {
      status?: string;
      type?: string;
      order?: "asc" | "desc";
      transactionId?: string;
      userId?: string;
    },
  ) {
    try {
      setLoading(true);
      setError("");

      const currentStatus =
        filters?.status !== undefined
          ? filters.status
          : status;

      const currentType =
        filters?.type !== undefined
          ? filters.type
          : type;

      const currentOrder =
        filters?.order !== undefined
          ? filters.order
          : order;

      const currentTransactionId =
        filters?.transactionId !== undefined
          ? filters.transactionId
          : transactionId;

      const currentUserId =
        filters?.userId !== undefined
          ? filters.userId
          : userId;

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

      if (currentStatus) {
        params.set(
          "status",
          currentStatus,
        );
      }

      if (currentType) {
        params.set(
          "type",
          currentType,
        );
      }

      if (currentTransactionId) {
        params.set(
          "transactionId",
          currentTransactionId,
        );
      }

      if (currentUserId) {
        params.set(
          "userId",
          currentUserId,
        );
      }

      const url =
        `/banking/transaction?${params.toString()}`;

      console.log(
        "TRANSACTIONS REQUEST:",
        url,
      );

      const response =
        await api.get(url);

      setTransactions(
        response.data.transactions ?? [],
      );

      setPagination(
        response.data.pagination ?? null,
      );
    } catch (error: any) {
      console.error(
        "TRANSACTIONS ERROR:",
        error.response?.data ?? error,
      );

      setError(
        error.response?.data?.message ??
          "Failed to load transactions.",
      );

      setTransactions([]);
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

    loadTransactions(1, {
      status: "",
      type: "",
      order: "desc",
      transactionId: "",
      userId: "",
    });
  }, []);

  // =======================================================
  // SEARCH RESULTS
  // =======================================================

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return [];
    }

    return searchUsers
      .filter((account) => {
        const name =
          account.user?.name
            ?.toLowerCase() ?? "";

        const email =
          account.user?.email
            ?.toLowerCase() ?? "";

        const id =
          account.id.toLowerCase();

        const userIdValue =
          account.user?.id
            ?.toLowerCase() ?? "";

        return (
          name.includes(value) ||
          email.includes(value) ||
          id.includes(value) ||
          userIdValue.includes(value)
        );
      })
      .slice(0, 10);
  }, [search, searchUsers]);

  // =======================================================
  // SELECT USER
  // =======================================================

  function selectUser(
    account: SearchUser,
  ) {
    const selectedUserId =
      account.user?.id;

    if (!selectedUserId) {
      return;
    }

    setUserId(selectedUserId);

    setTransactionId("");

    setSearch(
      account.user?.name ??
        account.id,
    );

    setShowSearchResults(false);

    loadTransactions(1, {
      status,
      type,
      order,
      transactionId: "",
      userId: selectedUserId,
    });
  }

  // =======================================================
  // TRANSACTION ID SEARCH
  // =======================================================

  function searchTransaction() {
    const value =
      search.trim();

    if (!value) {
      return;
    }

    setTransactionId(value);
    setUserId("");

    setShowSearchResults(false);

    loadTransactions(1, {
      status,
      type,
      order,
      transactionId: value,
      userId: "",
    });
  }

  // =======================================================
  // CLEAR SEARCH
  // =======================================================

  function clearSearch() {
    setSearch("");
    setTransactionId("");
    setUserId("");
    setShowSearchResults(false);

    loadTransactions(1, {
      status,
      type,
      order,
      transactionId: "",
      userId: "",
    });
  }

  // =======================================================
  // RESET
  // =======================================================

  function resetFilters() {
    setSearch("");
    setStatus("");
    setType("");
    setOrder("desc");
    setTransactionId("");
    setUserId("");
    setExpandedId(null);
    setShowSearchResults(false);

    loadTransactions(1, {
      status: "",
      type: "",
      order: "desc",
      transactionId: "",
      userId: "",
    });
  }

  // =======================================================
  // STATUS CHANGE
  // =======================================================

  function handleStatusChange(
    value: string,
  ) {
    setStatus(value);

    loadTransactions(1, {
      status: value,
      type,
      order,
      transactionId,
      userId,
    });
  }

  // =======================================================
  // TYPE CHANGE
  // =======================================================

  function handleTypeChange(
    value: string,
  ) {
    setType(value);

    loadTransactions(1, {
      status,
      type: value,
      order,
      transactionId,
      userId,
    });
  }

  // =======================================================
  // SORT CHANGE
  // =======================================================

  function handleOrderChange(
    value: "asc" | "desc",
  ) {
    setOrder(value);

    loadTransactions(1, {
      status,
      type,
      order: value,
      transactionId,
      userId,
    });
  }

  // =======================================================
  // TOGGLE DETAILS
  // =======================================================

  function toggleDetails(
    transactionIdValue: string,
  ) {
    setExpandedId(
      expandedId === transactionIdValue
        ? null
        : transactionIdValue,
    );
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
          Transactions
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View business-level financial
          transactions and their accounting details.
        </p>
      </div>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <div className="relative">

        <label className="mb-2 block text-sm font-medium">
          Search User / Transaction
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
                  setShowSearchResults(true);
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
              placeholder="Search by user name, email, account ID or transaction ID..."
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
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Search
          </button>

        </div>

        {/* SEARCH RESULTS */}

        {showSearchResults &&
          search.trim() &&
          filteredUsers.length > 0 && (

            <div className="absolute left-0 z-30 mt-1 max-h-72 w-[calc(100%-100px)] overflow-y-auto rounded-lg border bg-white shadow-lg">

              {filteredUsers.map(
                (account) => (

                  <button
                    key={`${account.id}-${account.user?.id}`}
                    type="button"
                    onClick={() =>
                      selectUser(account)
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
              Loading users...
            </div>
          )}

      </div>

      {/* ===================================================
          ACTIVE FILTERS
      =================================================== */}

      {(transactionId ||
        userId ||
        status ||
        type) && (

        <div className="flex flex-wrap gap-2">

          {transactionId && (
            <FilterBadge>
              Transaction: {transactionId}
            </FilterBadge>
          )}

          {userId && (
            <FilterBadge>
              User: {userId}
            </FilterBadge>
          )}

          {status && (
            <FilterBadge>
              Status: {status}
            </FilterBadge>
          )}

          {type && (
            <FilterBadge>
              Type: {type}
            </FilterBadge>
          )}

        </div>
      )}

      {/* ===================================================
          FILTERS
      =================================================== */}

      <div className="flex flex-wrap items-end gap-4">

        {/* STATUS */}

        <FilterSelect
          label="Status"
          value={status}
          onChange={handleStatusChange}
          options={[
            ["", "All"],
            ["PENDING", "Pending"],
            ["SUCCESS", "Success"],
            ["FAILED", "Failed"],
            ["REVERSED", "Reversed"],
          ]}
        />

        {/* TYPE */}

        <FilterSelect
          label="Type"
          value={type}
          onChange={handleTypeChange}
          options={[
            ["", "All"],
            ["TRANSFER", "Transfer"],
            ["DEPOSIT", "Deposit"],
            ["WITHDRAWAL", "Withdrawal"],
            ["PAYMENT", "Payment"],
            ["REFUND", "Refund"],
          ]}
        />

        {/* SORT */}

        <FilterSelect
          label="Sort"
          value={order}
          onChange={(value) =>
            handleOrderChange(
              value as "asc" | "desc",
            )
          }
          options={[
            ["desc", "Newest First"],
            ["asc", "Oldest First"],
          ]}
        />

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
            Loading transactions...
          </div>

        ) : transactions.length === 0 ? (

          <div className="p-8 text-center text-slate-500">
            No transactions found.
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
                    From
                  </Header>

                  <Header>
                    To
                  </Header>

                  <Header>
                    Type
                  </Header>

                  <Header align="right">
                    Amount
                  </Header>

                  <Header>
                    Status
                  </Header>

                  <Header align="center">
                    Details
                  </Header>

                </tr>

              </thead>

              <tbody>

                {transactions.map(
                  (transaction) => {

                    const date =
                      new Date(
                        transaction.createdAt,
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

                    const hasDetails =
                      transaction
                        .additionalEntries
                        .length > 0;

                    const expanded =
                      expandedId ===
                      transaction.id;

                    const failed =
                      transaction.status ===
                      "FAILED";

                    return (
                      <TransactionRows
                        key={transaction.id}
                        transaction={
                          transaction
                        }
                        displayDate={
                          displayDate
                        }
                        displayTime={
                          displayTime
                        }
                        hasDetails={
                          hasDetails
                        }
                        expanded={
                          expanded
                        }
                        failed={
                          failed
                        }
                        onToggle={() =>
                          toggleDetails(
                            transaction.id,
                          )
                        }
                      />
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
              ({pagination.total} transactions)
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page <= 1
                }
                onClick={() =>
                  loadTransactions(
                    pagination.page - 1,
                    {
                      status,
                      type,
                      order,
                      transactionId,
                      userId,
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

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page >=
                    pagination.totalPages
                }
                onClick={() =>
                  loadTransactions(
                    pagination.page + 1,
                    {
                      status,
                      type,
                      order,
                      transactionId,
                      userId,
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
// TRANSACTION ROWS
// =========================================================

function TransactionRows({
  transaction,
  displayDate,
  displayTime,
  hasDetails,
  expanded,
  failed,
  onToggle,
}: {
  transaction: Transaction;
  displayDate: string;
  displayTime: string;
  hasDetails: boolean;
  expanded: boolean;
  failed: boolean;
  onToggle: () => void;
}) {
  void hasDetails;
  const amountColor = failed
    ? "text-gray-500"
    : "text-slate-800";
  return (
    <>
      {/* =================================================
          MAIN ROW
      ================================================= */}

      <tr className="border-b hover:bg-slate-50">

        {/* DATE */}

        <td
          className="px-5 py-4 whitespace-nowrap"
          title={displayTime}
        >
          {displayDate}

          <div className="text-xs text-slate-400">
            {displayTime}
          </div>
        </td>

        {/* FROM */}

{/* FROM */}

<td className="px-5 py-4">

  <div className="font-medium">
    {transaction.from?.name ??
      transaction.initiator?.name ??
      "—"}
  </div>

  {transaction.from ? (
    <div className="mt-1 max-w-[180px] truncate font-mono text-xs text-slate-400">
      {transaction.from.accountId}
    </div>
  ) : transaction.initiator ? (
    <div className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
      Initiator
    </div>
  ) : null}

</td>

        {/* TO */}

        <td className="px-5 py-4">

          <div className="font-medium">
            {transaction.to?.name ??
              "—"}
          </div>

          {transaction.to && (
            <div className="mt-1 max-w-[180px] truncate font-mono text-xs text-slate-400">
              {transaction.to.accountId}
            </div>
          )}

        </td>

        {/* TYPE */}

        <td className="px-5 py-4">
          {toTitle(
            transaction.type,
          )}
        </td>

        {/* AMOUNT */}

        <td
          className={`px-5 py-4 text-right font-semibold ${amountColor}`}
        >
          {formatMoney(
            BigInt(
              transaction.amount,
            ),
          )}
        </td>

        {/* STATUS */}

        <td
          className={`px-5 py-4 font-medium ${
            transaction.status ===
            "SUCCESS"
              ? "text-green-600"
              : transaction.status ===
                "FAILED"
              ? "text-gray-500"
              : transaction.status ===
                "REVERSED"
              ? "text-purple-600"
              : "text-orange-500"
          }`}
        >
          {transaction.status}
        </td>

        {/* DETAILS */}

<td className="px-5 py-4 text-center">
  <button
    type="button"
    onClick={onToggle}
    className="rounded-md px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
  >
    View
  </button>
</td>

      </tr>

      {/* =================================================
          EXPANDED DETAILS
      ================================================= */}

      {expanded && (
        <tr className="border-b bg-slate-50">

          <td
            colSpan={7}
            className="px-6 py-5"
          >

            <div className="space-y-5">

              {/* TRANSACTION INFO */}

              <div className="grid gap-4 md:grid-cols-4">

                <Detail
                  label="Transaction ID"
                  value={
                    transaction.id
                  }
                  mono
                />

                <Detail
                  label="Initiator"
                  value={
                    transaction
                      .initiator?.name ??
                    "—"
                  }
                />

                <Detail
                  label="Currency"
                  value={
                    transaction.currency
                  }
                />

                <Detail
                  label="Locking"
                  value={
                    transaction
                      .lockingStrategy
                  }
                />

              </div>

              {/* ADDITIONAL ENTRIES */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Additional Accounting Entries
                </h3>

                <div className="overflow-hidden rounded-lg border bg-white">

                  <table className="w-full text-sm">

                    <thead className="bg-slate-100">

                      <tr>
                        <th className="px-4 py-3 text-left">
                          Account
                        </th>

                        <th className="px-4 py-3 text-left">
                          Direction
                        </th>

                        <th className="px-4 py-3 text-right">
                          Amount
                        </th>
                      </tr>

                    </thead>

                    <tbody>

                      {transaction.additionalEntries.map(
                        (entry) => (

                          <tr
                            key={entry.id}
                            className="border-t"
                          >

                            <td className="px-4 py-3">

                              <div className="font-medium">
                                {entry.name}
                              </div>

                              <div className="font-mono text-xs text-slate-400">
                                {
                                  entry.accountId
                                }
                              </div>

                            </td>

                            <td
                              className={`px-4 py-3 font-medium ${
                                entry.direction ===
                                "DEBIT"
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {
                                entry.direction
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-semibold">
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

                          </tr>
                        ),
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              {/* COUNTS */}

              <div className="flex flex-wrap gap-5 text-sm text-slate-500">

                <span>
                  Ledger entries:{" "}
                  <b className="text-slate-800">
                    {
                      transaction.ledgerEntryCount
                    }
                  </b>
                </span>

                <span>
                  Events:{" "}
                  <b className="text-slate-800">
                    {
                      transaction.eventCount
                    }
                  </b>
                </span>

                {transaction.reversalOfId && (
                  <span>
                    Reversal of:{" "}
                    <b className="font-mono text-slate-800">
                      {
                        transaction.reversalOfId
                      }
                    </b>
                  </span>
                )}

              </div>

              {/* FAILURE */}

              {transaction.failureReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <b>
                    Failure reason:
                  </b>{" "}
                  {
                    transaction.failureReason
                  }
                </div>
              )}

            </div>

          </td>

        </tr>
      )}
    </>
  );
}

// =========================================================
// FILTER SELECT
// =========================================================

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>

      <label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="rounded-lg border bg-white px-3 py-2 text-sm"
      >
        {options.map(
          ([optionValue, label]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {label}
            </option>
          ),
        )}
      </select>

    </div>
  );
}

// =========================================================
// FILTER BADGE
// =========================================================

function FilterBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
      {children}
    </div>
  );
}

// =========================================================
// DETAIL
// =========================================================

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>

      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div
        className={`mt-1 text-sm font-medium ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>

    </div>
  );
}

// =========================================================
// HEADER
// =========================================================

function Header({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={`px-5 py-4 font-semibold ${
        align === "right"
          ? "text-right"
          : align === "center"
          ? "text-center"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

// =========================================================
// TITLE
// =========================================================

function toTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) =>
      c.toUpperCase(),
    );
}