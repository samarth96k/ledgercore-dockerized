import { useEffect, useState } from "react";

import { api } from "../../api/api";

// =========================================================
// TYPES
// =========================================================

type IdempotencyKey = {
  key: string;
  requestHash: string;
  responseBody: unknown;
  status: string;
  createdAt: string;
  expiresAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// =========================================================
// STATUS OPTIONS
// =========================================================

const STATUS_OPTIONS: [string, string][] = [
  ["", "All Statuses"],
  ["IN_PROGRESS", "In Progress"],
  ["COMPLETED", "Completed"],
  ["FAILED", "Failed"],
];
// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Idempotency() {
  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [keys, setKeys] =
    useState<IdempotencyKey[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // -------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------

  const [search, setSearch] =
    useState("");

  const [key, setKey] =
    useState("");

  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const [status, setStatus] =
    useState("");

  const [expired, setExpired] =
    useState("");

  const [order, setOrder] =
    useState<"asc" | "desc">("desc");

  // -------------------------------------------------------
  // DETAILS
  // -------------------------------------------------------

  const [expandedKey, setExpandedKey] =
    useState<string | null>(null);

  // =======================================================
  // LOAD DATA
  // =======================================================

  async function loadKeys(
    requestedPage: number,
    filters?: {
      key?: string;
      status?: string;
      expired?: string;
      order?: "asc" | "desc";
    },
  ) {
    try {
      setLoading(true);
      setError("");

      const currentKey =
        filters?.key !== undefined
          ? filters.key
          : key;

      const currentStatus =
        filters?.status !== undefined
          ? filters.status
          : status;

      const currentExpired =
        filters?.expired !== undefined
          ? filters.expired
          : expired;

      const currentOrder =
        filters?.order !== undefined
          ? filters.order
          : order;

      const params =
        new URLSearchParams();

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

      if (currentKey) {
        params.set(
          "key",
          currentKey,
        );
      }

      if (currentStatus) {
        params.set(
          "status",
          currentStatus,
        );
      }

      if (currentExpired) {
        params.set(
          "expired",
          currentExpired,
        );
      }

      const url =
        `/banking/idempotency?${params.toString()}`;

      console.log(
        "IDEMPOTENCY REQUEST:",
        url,
      );

      const response =
        await api.get(url);

      setKeys(
        response.data.keys ?? [],
      );

      setPagination(
        response.data.pagination ??
          null,
      );

      setExpandedKey(null);
    } catch (error: any) {
      console.error(
        "IDEMPOTENCY ERROR:",
        error.response?.data ?? error,
      );

      setError(
        error.response?.data?.message ??
          "Failed to load idempotency records.",
      );

      setKeys([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadKeys(1, {
      key: "",
      status: "",
      expired: "",
      order: "desc",
    });
  }, []);

  // =======================================================
  // SEARCH
  // =======================================================

  function searchKey() {
    const value =
      search.trim();

    setKey(value);

    loadKeys(1, {
      key: value,
      status,
      expired,
      order,
    });
  }

  // =======================================================
  // CLEAR SEARCH
  // =======================================================

  function clearSearch() {
    setSearch("");
    setKey("");

    loadKeys(1, {
      key: "",
      status,
      expired,
      order,
    });
  }

  // =======================================================
  // STATUS
  // =======================================================

  function handleStatusChange(
    value: string,
  ) {
    setStatus(value);

    loadKeys(1, {
      key,
      status: value,
      expired,
      order,
    });
  }

  // =======================================================
  // EXPIRATION
  // =======================================================

  function handleExpiredChange(
    value: string,
  ) {
    setExpired(value);

    loadKeys(1, {
      key,
      status,
      expired: value,
      order,
    });
  }

  // =======================================================
  // SORT
  // =======================================================

  function handleOrderChange(
    value: "asc" | "desc",
  ) {
    setOrder(value);

    loadKeys(1, {
      key,
      status,
      expired,
      order: value,
    });
  }

  // =======================================================
  // RESET
  // =======================================================

  function resetFilters() {
    setSearch("");
    setKey("");
    setStatus("");
    setExpired("");
    setOrder("desc");
    setExpandedKey(null);

    loadKeys(1, {
      key: "",
      status: "",
      expired: "",
      order: "desc",
    });
  }

  // =======================================================
  // DETAILS
  // =======================================================

  function toggleDetails(
    idempotencyKey: string,
  ) {
    setExpandedKey(
      expandedKey === idempotencyKey
        ? null
        : idempotencyKey,
    );
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div>
        <h1 className="text-2xl font-semibold">
          Idempotency
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Inspect idempotency reservations and
          their processing state.
        </p>
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div>

        <label className="mb-2 block text-sm font-medium">
          Search by Idempotency Key
        </label>

        <div className="flex gap-2">

          <div className="relative flex-1">

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchKey();
                }
              }}
              placeholder="Enter idempotency key..."
              className="w-full rounded-lg border bg-white px-4 py-3 pr-16 font-mono text-sm outline-none focus:ring-2"
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
            onClick={searchKey}
            disabled={!search.trim()}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Search
          </button>

        </div>

      </div>

      {/* =================================================
          ACTIVE FILTERS
      ================================================= */}

      {(key ||
        status ||
        expired) && (

        <div className="flex flex-wrap gap-2">

          {key && (
            <FilterBadge>
              Key: {key}
            </FilterBadge>
          )}

          {status && (
            <FilterBadge>
              Status: {toTitle(status)}
            </FilterBadge>
          )}

          {expired && (
            <FilterBadge>
              {expired === "true"
                ? "Expired"
                : "Not Expired"}
            </FilterBadge>
          )}

        </div>
      )}

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="flex flex-wrap items-end gap-4">

        {/* STATUS */}

        <FilterSelect
          label="Status"
          value={status}
          onChange={
            handleStatusChange
          }
          options={
            STATUS_OPTIONS
          }
        />

        {/* EXPIRATION */}

        <FilterSelect
          label="Expiration"
          value={expired}
          onChange={
            handleExpiredChange
          }
          options={[
            ["", "All"],
            ["true", "Expired"],
            ["false", "Not Expired"],
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

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-xl border bg-white">

        {loading ? (

          <div className="p-8 text-center text-slate-500">
            Loading idempotency records...
          </div>

        ) : keys.length === 0 ? (

          <div className="p-8 text-center text-slate-500">
            No idempotency records found.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-100">

                <tr>

                  <Header>
                    Created
                  </Header>

                  <Header>
                    Idempotency Key
                  </Header>

                  <Header>
                    Status
                  </Header>

                  <Header>
                    Expires
                  </Header>

                  <Header>
                    Request Hash
                  </Header>

                  <Header align="center">
                    Details
                  </Header>

                </tr>

              </thead>

              <tbody>

                {keys.map(
                  (record) => {

                    const date =
                      new Date(
                        record.createdAt,
                      );

                    const expiresAt =
                      new Date(
                        record.expiresAt,
                      );

                    const isExpired =
                      expiresAt.getTime() <
                      Date.now();

                    const expanded =
                      expandedKey ===
                      record.key;

                    return (
                      <IdempotencyRow
                        key={record.key}
                        record={
                          record
                        }
                        date={date}
                        expiresAt={
                          expiresAt
                        }
                        isExpired={
                          isExpired
                        }
                        expanded={
                          expanded
                        }
                        onToggle={() =>
                          toggleDetails(
                            record.key,
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

      {/* =================================================
          PAGINATION
      ================================================= */}

      {pagination &&
        pagination.totalPages > 1 && (

          <div className="flex items-center justify-between">

            <div className="text-sm text-slate-500">
              Showing page{" "}
              {pagination.page} of{" "}
              {pagination.totalPages}{" "}
              ({pagination.total} records)
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page <= 1
                }
                onClick={() =>
                  loadKeys(
                    pagination.page - 1,
                    {
                      key,
                      status,
                      expired,
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

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page >=
                    pagination.totalPages
                }
                onClick={() =>
                  loadKeys(
                    pagination.page + 1,
                    {
                      key,
                      status,
                      expired,
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
// ROW
// =========================================================

function IdempotencyRow({
  record,
  date,
  expiresAt,
  isExpired,
  expanded,
  onToggle,
}: {
  record: IdempotencyKey;
  date: Date;
  expiresAt: Date;
  isExpired: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* =================================================
          MAIN ROW
      ================================================= */}

      <tr className="border-b hover:bg-slate-50">

        {/* CREATED */}

        <td className="px-5 py-4 whitespace-nowrap">

          <div>
            {date.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              },
            )}
          </div>

          <div className="text-xs text-slate-400">
            {date.toLocaleTimeString(
              "en-IN",
            )}
          </div>

        </td>

        {/* KEY */}

        <td className="px-5 py-4">

          <div
            className="max-w-[260px] truncate font-mono text-xs"
            title={record.key}
          >
            {record.key}
          </div>

        </td>

        {/* STATUS */}

        <td
          className={`px-5 py-4 font-medium ${
            record.status ===
            "COMPLETED"
              ? "text-green-600"
              : record.status ===
                "FAILED"
              ? "text-red-600"
              : "text-orange-500"
          }`}
        >
          {toTitle(
            record.status,
          )}
        </td>

        {/* EXPIRES */}

        <td className="px-5 py-4">

          <div
            className={
              isExpired
                ? "font-medium text-red-600"
                : "text-slate-700"
            }
          >
            {expiresAt.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              },
            )}
          </div>

          <div className="text-xs text-slate-400">
            {expiresAt.toLocaleTimeString(
              "en-IN",
            )}
          </div>

        </td>

        {/* REQUEST HASH */}

        <td className="px-5 py-4">

          <div
            className="max-w-[220px] truncate font-mono text-xs text-slate-500"
            title={record.requestHash}
          >
            {record.requestHash}
          </div>

        </td>

        {/* DETAILS */}

        <td className="px-5 py-4 text-center">

          <button
            type="button"
            onClick={onToggle}
            className="rounded-md px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            {expanded
              ? "Hide"
              : "View"}
          </button>

        </td>

      </tr>

      {/* =================================================
          DETAILS
      ================================================= */}

      {expanded && (
        <tr className="border-b bg-slate-50">

          <td
            colSpan={6}
            className="px-6 py-5"
          >

            <div className="space-y-6">

              {/* BASIC INFORMATION */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Idempotency Details
                </h3>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

                  <Detail
                    label="Idempotency Key"
                    value={
                      record.key
                    }
                    mono
                  />

                  <Detail
                    label="Status"
                    value={toTitle(
                      record.status,
                    )}
                  />

                  <Detail
                    label="Created At"
                    value={date.toLocaleString(
                      "en-IN",
                    )}
                  />

                  <Detail
                    label="Expires At"
                    value={expiresAt.toLocaleString(
                      "en-IN",
                    )}
                  />

                </div>

              </div>

              {/* REQUEST HASH */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Request Hash
                </h3>

                <div className="rounded-lg border bg-white p-4 font-mono text-xs break-all">
                  {record.requestHash}
                </div>

              </div>

              {/* RESPONSE */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Response Body
                </h3>

                <JsonViewer
                  value={
                    record.responseBody
                  }
                />

              </div>

            </div>

          </td>

        </tr>
      )}
    </>
  );
}

// =========================================================
// JSON VIEWER
// =========================================================

function JsonViewer({
  value,
}: {
  value: unknown;
}) {
  if (
    value === null ||
    value === undefined
  ) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">
        No response body available.
      </div>
    );
  }

  if (
    typeof value !== "object"
  ) {
    return (
      <div className="rounded-lg border bg-white p-4 font-mono text-sm">
        {String(value)}
      </div>
    );
  }

  const entries =
    Object.entries(
      value as Record<
        string,
        unknown
      >,
    );

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">
        Empty response body.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">

      <table className="w-full text-sm">

        <thead className="bg-slate-100">

          <tr>

            <th className="px-4 py-3 text-left">
              Key
            </th>

            <th className="px-4 py-3 text-left">
              Value
            </th>

          </tr>

        </thead>

        <tbody>

          {entries.map(
            ([key, value]) => (

              <tr
                key={key}
                className="border-t"
              >

                <td className="px-4 py-3 font-medium">
                  {key}
                </td>

                <td className="px-4 py-3 font-mono text-xs break-all">

                  {typeof value ===
                  "object"
                    ? JSON.stringify(
                        value,
                        null,
                        2,
                      )
                    : String(value)}

                </td>

              </tr>

            ),
          )}

        </tbody>

      </table>

    </div>
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
  onChange: (
    value: string,
  ) => void;
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
          onChange(
            e.target.value,
          )
        }
        className="rounded-lg border bg-white px-3 py-2 text-sm"
      >

        {options.map(
          ([value, label]) => (
            <option
              key={value}
              value={value}
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
        className={`mt-1 break-all text-sm font-medium ${
          mono
            ? "font-mono"
            : ""
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
  align?:
    | "left"
    | "right"
    | "center";
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

function toTitle(
  text: string,
) {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (c) =>
        c.toUpperCase(),
    );
}