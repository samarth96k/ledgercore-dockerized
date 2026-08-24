import {
  useEffect,
  useState,
} from "react";

import { api } from "../../api/api";
import { formatMoney } from "../../utils/money";

// =========================================================
// TYPES
// =========================================================

type TransactionInfo = {
  type: string;
  status: string;
  amount: string;
  currency: string;
  initiatorUserId: string;
};

type Event = {
  id: string;
  transactionId: string;
  event: string;
  metadata: unknown;
  createdAt: string;

  transaction: TransactionInfo;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// =========================================================
// EVENT TYPES
// =========================================================

// const EVENT_TYPES = [
//   "PAYMENT_INITIATED",
//   "PAYMENT_SUCCEEDED",
//   "PAYMENT_FAILED",
//   "PAYMENT_REVERSED",
//   "LOCK_ACQUIRED",
// ];

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Events() {
  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [events, setEvents] =
    useState<Event[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const [transactionId, setTransactionId] =
    useState("");

  const [eventFilter, setEventFilter] =
    useState("");

  const [order, setOrder] =
    useState<"asc" | "desc">("desc");

  // -------------------------------------------------------
  // SEARCH INPUT
  // -------------------------------------------------------

  const [search, setSearch] =
    useState("");

  // -------------------------------------------------------
  // EXPANDED EVENT
  // -------------------------------------------------------

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  // =======================================================
  // LOAD EVENTS
  // =======================================================

  async function loadEvents(
    requestedPage: number,
    filters?: {
      transactionId?: string;
      event?: string;
      order?: "asc" | "desc";
    },
  ) {
    try {
      setLoading(true);
      setError("");

      const currentTransactionId =
        filters?.transactionId !== undefined
          ? filters.transactionId
          : transactionId;

      const currentEvent =
        filters?.event !== undefined
          ? filters.event
          : eventFilter;

      const currentOrder =
        filters?.order !== undefined
          ? filters.order
          : order;

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

      if (currentTransactionId) {
        params.set(
          "transactionId",
          currentTransactionId,
        );
      }

      if (currentEvent) {
        params.set(
          "event",
          currentEvent,
        );
      }

      const url =
        `/banking/transaction/events/all?${params.toString()}`;

      console.log(
        "EVENTS REQUEST:",
        url,
      );

      const response =
        await api.get(url);

      setEvents(
        response.data.events ?? [],
      );

      setPagination(
        response.data.pagination ?? null,
      );

      setExpandedId(null);
    } catch (error: any) {
      console.error(
        "EVENTS ERROR:",
        error.response?.data ?? error,
      );

      setError(
        error.response?.data?.message ??
          "Failed to load events.",
      );

      setEvents([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadEvents(1, {
      transactionId: "",
      event: "",
      order: "desc",
    });
  }, []);

  // =======================================================
  // SEARCH BY TRANSACTION ID
  // =======================================================

  function searchTransaction() {
    const value =
      search.trim();

    setTransactionId(value);

    loadEvents(1, {
      transactionId: value,
      event: eventFilter,
      order,
    });
  }

  // =======================================================
  // CLEAR SEARCH
  // =======================================================

  function clearSearch() {
    setSearch("");
    setTransactionId("");

    loadEvents(1, {
      transactionId: "",
      event: eventFilter,
      order,
    });
  }

  // =======================================================
  // EVENT FILTER
  // =======================================================

  function handleEventChange(
    value: string,
  ) {
    setEventFilter(value);

    loadEvents(1, {
      transactionId,
      event: value,
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

    loadEvents(1, {
      transactionId,
      event: eventFilter,
      order: value,
    });
  }

  // =======================================================
  // RESET
  // =======================================================

  function resetFilters() {
    setSearch("");
    setTransactionId("");
    setEventFilter("");
    setOrder("desc");
    setExpandedId(null);

    loadEvents(1, {
      transactionId: "",
      event: "",
      order: "desc",
    });
  }

  // =======================================================
  // TOGGLE DETAILS
  // =======================================================

  function toggleDetails(
    eventId: string,
  ) {
    setExpandedId(
      expandedId === eventId
        ? null
        : eventId,
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
          Events
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View the event history generated by
          transactions.
        </p>
      </div>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <div>

        <label className="mb-2 block text-sm font-medium">
          Search by Transaction ID
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
                  searchTransaction();
                }
              }}
              placeholder="Enter transaction ID..."
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

      </div>

      {/* ===================================================
          ACTIVE FILTERS
      =================================================== */}

      {(transactionId ||
        eventFilter) && (

        <div className="flex flex-wrap gap-2">

          {transactionId && (
            <FilterBadge>
              Transaction:{" "}
              {transactionId}
            </FilterBadge>
          )}

          {eventFilter && (
            <FilterBadge>
              Event:{" "}
              {toTitle(eventFilter)}
            </FilterBadge>
          )}

        </div>
      )}

      {/* ===================================================
          FILTERS
      =================================================== */}

      <div className="flex flex-wrap items-end gap-4">

        {/* EVENT */}

        <FilterSelect
          label="Event"
          value={eventFilter}
          onChange={handleEventChange}
          options={[
            ["", "All Events"],

            [
              "PAYMENT_INITIATED",
              "Payment Initiated",
            ],

            [
              "PAYMENT_SUCCEEDED",
              "Payment Succeeded",
            ],

            [
              "PAYMENT_FAILED",
              "Payment Failed",
            ],

            [
              "PAYMENT_REVERSED",
              "Payment Reversed",
            ],

            [
              "LOCK_ACQUIRED",
              "Lock Acquired",
            ],
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
            Loading events...
          </div>

        ) : events.length === 0 ? (

          <div className="p-8 text-center text-slate-500">
            No events found.
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
                    Event
                  </Header>

                  <Header>
                    Transaction ID
                  </Header>

                  <Header>
                    Type
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

                {events.map((event) => {

                  const date =
                    new Date(
                      event.createdAt,
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

                  const expanded =
                    expandedId ===
                    event.id;

                  return (
                    <EventRows
                      key={event.id}
                      event={event}
                      displayDate={
                        displayDate
                      }
                      displayTime={
                        displayTime
                      }
                      expanded={
                        expanded
                      }
                      onToggle={() =>
                        toggleDetails(
                          event.id,
                        )
                      }
                    />
                  );
                })}

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
              ({pagination.total} events)
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page <= 1
                }
                onClick={() =>
                  loadEvents(
                    pagination.page - 1,
                    {
                      transactionId,
                      event: eventFilter,
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
                  loadEvents(
                    pagination.page + 1,
                    {
                      transactionId,
                      event: eventFilter,
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
// EVENT ROW
// =========================================================

function EventRows({
  event,
  displayDate,
  displayTime,
  expanded,
  onToggle,
}: {
  event: Event;
  displayDate: string;
  displayTime: string;
  expanded: boolean;
  onToggle: () => void;
}) {
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

        {/* EVENT */}

        <td className="px-5 py-4">

          <span
            className={`font-medium ${
              event.event ===
              "PAYMENT_FAILED"
                ? "text-red-600"
                : event.event ===
                  "PAYMENT_SUCCEEDED"
                ? "text-green-600"
                : event.event ===
                  "PAYMENT_REVERSED"
                ? "text-purple-600"
                : "text-slate-700"
            }`}
          >
            {toTitle(
              event.event,
            )}
          </span>

        </td>

        {/* TRANSACTION ID */}

        <td className="px-5 py-4">

          <div
            className="max-w-[220px] truncate font-mono text-xs"
            title={event.transactionId}
          >
            {event.transactionId}
          </div>

        </td>

        {/* TYPE */}

        <td className="px-5 py-4">
          {toTitle(
            event.transaction.type,
          )}
        </td>

        {/* STATUS */}

        <td
          className={`px-5 py-4 font-medium ${
            event.transaction.status ===
            "SUCCESS"
              ? "text-green-600"
              : event.transaction.status ===
                "FAILED"
              ? "text-red-600"
              : event.transaction.status ===
                "REVERSED"
              ? "text-purple-600"
              : "text-orange-500"
          }`}
        >
          {event.transaction.status}
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
          EXPANDED DETAILS
      ================================================= */}

      {expanded && (
        <tr className="border-b bg-slate-50">

          <td
            colSpan={6}
            className="px-6 py-5"
          >

            <div className="space-y-5">

              {/* EVENT INFORMATION */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Event Details
                </h3>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                  <Detail
                    label="Event ID"
                    value={event.id}
                    mono
                  />

                  <Detail
                    label="Transaction ID"
                    value={
                      event.transactionId
                    }
                    mono
                  />

                  <Detail
                    label="Event"
                    value={toTitle(
                      event.event,
                    )}
                  />

                  <Detail
                    label="Created At"
                    value={
                      new Date(
                        event.createdAt,
                      ).toLocaleString(
                        "en-IN",
                      )
                    }
                  />

                </div>

              </div>

              {/* TRANSACTION INFORMATION */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Transaction
                </h3>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

                  <Detail
                    label="Type"
                    value={toTitle(
                      event.transaction
                        .type,
                    )}
                  />

                  <Detail
                    label="Status"
                    value={
                      event.transaction
                        .status
                    }
                  />

                  <Detail
                    label="Amount"
                    value={formatMoney(
                      BigInt(
                        event.transaction
                          .amount,
                      ),
                    )}
                  />

                  <Detail
                    label="Currency"
                    value={
                      event.transaction
                        .currency
                    }
                  />

                  <Detail
                    label="Initiator User ID"
                    value={
                      event.transaction
                        .initiatorUserId
                    }
                    mono
                  />

                </div>

              </div>

              {/* METADATA */}

              <div>

                <h3 className="mb-3 font-semibold">
                  Metadata
                </h3>

                <MetadataViewer
                  metadata={
                    event.metadata
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
// METADATA VIEWER
// =========================================================

function MetadataViewer({
  metadata,
}: {
  metadata: unknown;
}) {
  if (
    metadata === null ||
    metadata === undefined
  ) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">
        No metadata available.
      </div>
    );
  }

  if (
    typeof metadata !== "object"
  ) {
    return (
      <div className="rounded-lg border bg-white p-4 font-mono text-sm">
        {String(metadata)}
      </div>
    );
  }

  const entries =
    Object.entries(
      metadata as Record<
        string,
        unknown
      >,
    );

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">
        No metadata available.
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

                <td className="px-4 py-3 font-mono text-xs">

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