import { useEffect, useState } from "react";
import { api } from "../../api/api";

// =========================================================
// TYPES
// =========================================================

type ReconciliationRun = {
  id: string;

  jobType: string;
  status: string;

  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;

  itemsScanned: number;
  anomaliesFound: number;

  details: unknown;
  errorMessage: string | null;

  dryRun: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// =========================================================
// OPTIONS
// =========================================================

const JOB_TYPE_OPTIONS: [string, string][] = [
  ["", "All Job Types"],
  ["PENDING_SWEEPER", "Pending Sweeper"],
  ["LEDGER_CONSISTENCY", "Ledger Consistency"],
  ["ORPHAN_DETECTOR", "Orphan Detector"],
  ["IDEMPOTENCY_CLEANUP", "Idempotency Cleanup"],
  ["ACCOUNT_SANITY", "Account Sanity"],
  ["UNKNOWN", "Unknown"],
];

const STATUS_OPTIONS: [string, string][] = [
  ["", "All Statuses"],
  ["RUNNING", "Running"],
  ["SUCCESS", "Success"],
  ["FAILED", "Failed"],
  ["PARTIAL_SUCCESS", "Partial Success"],
];

const ANOMALY_OPTIONS: [string, string][] = [
  ["", "All Runs"],
  ["true", "Has Anomalies"],
  ["false", "No Anomalies"],
];

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Reconciliation() {
  // -------------------------------------------------------
  // DATA
  // -------------------------------------------------------

  const [runs, setRuns] = useState<
    ReconciliationRun[]
  >([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // -------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------

  const [jobType, setJobType] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [hasAnomalies, setHasAnomalies] =
    useState("");

  const [order, setOrder] =
    useState<"asc" | "desc">("desc");

  // -------------------------------------------------------
  // EXPANDED ROW
  // -------------------------------------------------------

  const [expandedRunId, setExpandedRunId] =
    useState<string | null>(null);

  // =======================================================
  // LOAD RUNS
  // =======================================================

  async function loadRuns(
    requestedPage: number,
    filters?: {
      jobType?: string;
      status?: string;
      hasAnomalies?: string;
      order?: "asc" | "desc";
    },
  ) {
    try {
      setLoading(true);
      setError("");

      const currentJobType =
        filters?.jobType !== undefined
          ? filters.jobType
          : jobType;

      const currentStatus =
        filters?.status !== undefined
          ? filters.status
          : status;

      const currentHasAnomalies =
        filters?.hasAnomalies !== undefined
          ? filters.hasAnomalies
          : hasAnomalies;

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

      if (currentJobType) {
        params.set(
          "jobType",
          currentJobType,
        );
      }

      if (currentStatus) {
        params.set(
          "status",
          currentStatus,
        );
      }

      if (currentHasAnomalies) {
        params.set(
          "hasAnomalies",
          currentHasAnomalies,
        );
      }

      const url =
        `/banking/reconciliation?${params.toString()}`;

      console.log(
        "RECONCILIATION REQUEST:",
        url,
      );

      const response =
        await api.get(url);

      setRuns(
        response.data.runs ?? [],
      );

      setPagination(
        response.data.pagination ??
          null,
      );

      setExpandedRunId(null);
    } catch (error: any) {
      console.error(
        "RECONCILIATION ERROR:",
        error.response?.data ?? error,
      );

      setError(
        error.response?.data?.message ??
          "Failed to load reconciliation runs.",
      );

      setRuns([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadRuns(1, {
      jobType: "",
      status: "",
      hasAnomalies: "",
      order: "desc",
    });
  }, []);

  // =======================================================
  // FILTER HANDLERS
  // =======================================================

  function handleJobTypeChange(
    value: string,
  ) {
    setJobType(value);

    loadRuns(1, {
      jobType: value,
      status,
      hasAnomalies,
      order,
    });
  }

  function handleStatusChange(
    value: string,
  ) {
    setStatus(value);

    loadRuns(1, {
      jobType,
      status: value,
      hasAnomalies,
      order,
    });
  }

  function handleAnomalyChange(
    value: string,
  ) {
    setHasAnomalies(value);

    loadRuns(1, {
      jobType,
      status,
      hasAnomalies: value,
      order,
    });
  }

  function handleOrderChange(
    value: "asc" | "desc",
  ) {
    setOrder(value);

    loadRuns(1, {
      jobType,
      status,
      hasAnomalies,
      order: value,
    });
  }

  // =======================================================
  // RESET
  // =======================================================

  function resetFilters() {
    setJobType("");
    setStatus("");
    setHasAnomalies("");
    setOrder("desc");
    setExpandedRunId(null);

    loadRuns(1, {
      jobType: "",
      status: "",
      hasAnomalies: "",
      order: "desc",
    });
  }

  // =======================================================
  // EXPAND
  // =======================================================

  function toggleDetails(
    runId: string,
  ) {
    setExpandedRunId(
      expandedRunId === runId
        ? null
        : runId,
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
          Reconciliation
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Monitor reconciliation jobs,
          anomalies and consistency checks.
        </p>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="flex flex-wrap items-end gap-4">

        <FilterSelect
          label="Job Type"
          value={jobType}
          onChange={
            handleJobTypeChange
          }
          options={
            JOB_TYPE_OPTIONS
          }
        />

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

        <FilterSelect
          label="Anomalies"
          value={hasAnomalies}
          onChange={
            handleAnomalyChange
          }
          options={
            ANOMALY_OPTIONS
          }
        />

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
          ] as [string, string][]}
        />

        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          Reset
        </button>

      </div>

      {/* =================================================
          ACTIVE FILTERS
      ================================================= */}

      {(jobType ||
        status ||
        hasAnomalies) && (
        <div className="flex flex-wrap gap-2">

          {jobType && (
            <FilterBadge>
              Job: {toTitle(jobType)}
            </FilterBadge>
          )}

          {status && (
            <FilterBadge>
              Status: {toTitle(status)}
            </FilterBadge>
          )}

          {hasAnomalies && (
            <FilterBadge>
              {hasAnomalies === "true"
                ? "Has Anomalies"
                : "No Anomalies"}
            </FilterBadge>
          )}

        </div>
      )}

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
            Loading reconciliation runs...
          </div>

        ) : runs.length === 0 ? (

          <div className="p-8 text-center text-slate-500">
            No reconciliation runs found.
          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-100">

                <tr>

                  <Header>
                    Started
                  </Header>

                  <Header>
                    Job Type
                  </Header>

                  <Header>
                    Status
                  </Header>

                  <Header align="right">
                    Scanned
                  </Header>

                  <Header align="right">
                    Anomalies
                  </Header>

                  <Header align="right">
                    Duration
                  </Header>

               

                  <Header align="center">
                    Details
                  </Header>

                </tr>

              </thead>

              <tbody>

                {runs.map((run) => {

                  const expanded =
                    expandedRunId ===
                    run.id;

                  return (
                    <ReconciliationRow
                      key={run.id}
                      run={run}
                      expanded={
                        expanded
                      }
                      onToggle={() =>
                        toggleDetails(
                          run.id,
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
              ({pagination.total} runs)
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled={
                  loading ||
                  pagination.page <= 1
                }
                onClick={() =>
                  loadRuns(
                    pagination.page - 1,
                    {
                      jobType,
                      status,
                      hasAnomalies,
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
                  loadRuns(
                    pagination.page + 1,
                    {
                      jobType,
                      status,
                      hasAnomalies,
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
// RECONCILIATION ROW
// =========================================================

function ReconciliationRow({
  run,
  expanded,
  onToggle,
}: {
  run: ReconciliationRun;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* =================================================
          MAIN ROW
      ================================================= */}

      <tr className="border-b hover:bg-slate-50">

        {/* STARTED */}

        <td className="px-5 py-4 whitespace-nowrap">

          <div>
            {formatDate(
              run.startedAt,
            )}
          </div>

          <div className="text-xs text-slate-400">
            {formatTime(
              run.startedAt,
            )}
          </div>

        </td>

        {/* JOB TYPE */}

        <td className="px-5 py-4">

          <span className="font-medium">
            {toTitle(
              run.jobType,
            )}
          </span>

        </td>

        {/* STATUS */}

        <td className="px-5 py-4">

          <StatusBadge
            status={run.status}
          />

        </td>

        {/* ITEMS */}

        <td className="px-5 py-4 text-right">
          {run.itemsScanned.toLocaleString(
            "en-IN",
          )}
        </td>

        {/* ANOMALIES */}

        <td className="px-5 py-4 text-right">

          {run.anomaliesFound > 0 ? (
            <span className="font-semibold text-red-600">
              ⚠{" "}
              {run.anomaliesFound.toLocaleString(
                "en-IN",
              )}
            </span>
          ) : (
            <span className="text-slate-500">
              0
            </span>
          )}

        </td>

        {/* DURATION */}

        <td className="px-5 py-4 text-right">

          {formatDuration(
            run.durationMs,
          )}

        </td>

        {/* DRY RUN */}


        {/* DETAILS */}

        <td className="px-5 py-4 text-center">

          <button
            type="button"
            onClick={onToggle}
            className="rounded-md px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            {expanded
              ? "Hide"
              :  "View"}
          </button>

        </td>

      </tr>

      {/* =================================================
          EXPANDED DETAILS
      ================================================= */}

      {expanded && (
        <tr className="border-b bg-slate-50">

          <td
            colSpan={8}
            className="px-6 py-6"
          >

            <ReconciliationDetails
              run={run}
            />

          </td>

        </tr>
      )}
    </>
  );
}

// =========================================================
// DETAILS ROUTER
// =========================================================

function ReconciliationDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  switch (run.jobType) {

    case "PENDING_SWEEPER":
      return (
        <PendingSweeperDetails
          run={run}
        />
      );

    case "LEDGER_CONSISTENCY":
      return (
        <LedgerConsistencyDetails
          run={run}
        />
      );

    case "ORPHAN_DETECTOR":
      return (
        <OrphanDetectorDetails
          run={run}
        />
      );

    case "IDEMPOTENCY_CLEANUP":
      return (
        <IdempotencyCleanupDetails
          run={run}
        />
      );

    case "ACCOUNT_SANITY":
      return (
        <AccountSanityDetails
          run={run}
        />
      );

    default:
      return (
        <GenericDetails
          run={run}
        />
      );
  }
}

// =========================================================
// COMMON RUN SUMMARY
// =========================================================

function RunSummary({
  run,
}: {
  run: ReconciliationRun;
}) {
  return (
    <div className="mb-6">

      <h3 className="mb-4 text-base font-semibold">
        Reconciliation Run
      </h3>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

        <Detail
          label="Run ID"
          value={run.id}
          mono
        />

        <Detail
          label="Job Type"
          value={toTitle(
            run.jobType,
          )}
        />

        <Detail
          label="Status"
          value={toTitle(
            run.status,
          )}
        />



        <Detail
          label="Items Scanned"
          value={run.itemsScanned.toLocaleString(
            "en-IN",
          )}
        />

        <Detail
          label="Anomalies Found"
          value={run.anomaliesFound.toLocaleString(
            "en-IN",
          )}
        />

        <Detail
          label="Started At"
          value={formatDateTime(
            run.startedAt,
          )}
        />

        <Detail
          label="Completed At"
          value={
            run.completedAt
              ? formatDateTime(
                  run.completedAt,
                )
              : "—"
          }
        />

      </div>

      {run.errorMessage && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">

          <div className="text-xs font-semibold text-red-700">
            Error
          </div>

          <div className="mt-1 text-sm text-red-600">
            {run.errorMessage}
          </div>

        </div>
      )}

    </div>
  );
}

// =========================================================
// PENDING SWEEPER
// =========================================================

function PendingSweeperDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  const details =
    asRecord(run.details);

  const anomalies =
    asArray(details?.anomalies);

  return (
    <div>

      <RunSummary run={run} />

      <SectionTitle>
        Pending Transactions Swept
      </SectionTitle>

      {anomalies.length === 0 ? (
        <EmptyDetails>
          No pending transactions were
          swept in this run.
        </EmptyDetails>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">

          <table className="w-full text-sm">

            <thead className="bg-slate-100">

              <tr>
                <Header>
                  Transaction ID
                </Header>

                <Header>
                  Reason
                </Header>
              </tr>

            </thead>

            <tbody>

              {anomalies.map(
                (item, index) => {

                  const anomaly =
                    asRecord(item);

                  return (
                    <tr
                      key={`${String(
                        anomaly?.transactionId ??
                          index,
                      )}-${index}`}
                      className="border-t"
                    >

                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {String(
                          anomaly?.transactionId ??
                            "—",
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {String(
                          anomaly?.reason ??
                            "—",
                        )}
                      </td>

                    </tr>
                  );
                },
              )}

            </tbody>

          </table>

        </div>
      )}

      <InfoBox>
        The Pending Sweeper identifies stale
        pending transactions and transitions
        them from <strong>PENDING</strong> to{" "}
        <strong>FAILED</strong>.
      </InfoBox>

    </div>
  );
}

// =========================================================
// LEDGER CONSISTENCY
// =========================================================

function LedgerConsistencyDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  const details =
    asRecord(run.details);

  const anomalies =
    asArray(details?.anomalies);

  return (
    <div>

      <RunSummary run={run} />

      <div className="mb-5 grid gap-4 md:grid-cols-3">

        <Detail
          label="Mode"
          value={String(
            details?.mode ?? "—",
          )}
        />

        <Detail
          label="Window Start"
          value={
            details?.windowStart
              ? formatDateTime(
                  String(
                    details.windowStart,
                  ),
                )
              : "—"
          }
        />

        <Detail
          label="Window End"
          value={
            details?.windowEnd
              ? formatDateTime(
                  String(
                    details.windowEnd,
                  ),
                )
              : "—"
          }
        />

      </div>

      <SectionTitle>
        Account Balance Drifts
      </SectionTitle>

      {anomalies.length === 0 ? (
        <EmptyDetails>
          No account balance inconsistencies
          were detected.
        </EmptyDetails>
      ) : (
        <div className="space-y-4">

          {anomalies.map(
            (item, index) => (
              <LedgerDriftCard
                key={index}
                anomaly={item}
              />
            ),
          )}

        </div>
      )}

    </div>
  );
}

function LedgerDriftCard({
  anomaly,
}: {
  anomaly: unknown;
}) {
  const data =
    asRecord(anomaly);

  if (!data) {
    return null;
  }

  const ledgerEntries =
    asArray(
      data.ledgerEntries,
    );

  return (
    <div className="overflow-hidden rounded-lg border bg-white">

      <div className="border-b bg-slate-50 p-4">

        <div className="mb-4 font-mono text-xs">
          Account:{" "}
          <span className="font-semibold">
            {String(
              data.accountId ?? "—",
            )}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-4">

          <Detail
            label="Cached Balance"
            value={formatMoneyString(
              data.cachedBalance,
            )}
          />

          <Detail
            label="Ledger Balance"
            value={formatMoneyString(
              data.ledgerBalance,
            )}
          />

          <Detail
            label="Drift"
            value={formatMoneyString(
              data.drift,
            )}
          />

          <Detail
            label="Credits in Window"
            value={formatMoneyString(
              data.creditsInWindow,
            )}
          />

        </div>

        <div className="mt-4">

          <Detail
            label="Debits in Window"
            value={formatMoneyString(
              data.debitsInWindow,
            )}
          />

        </div>

      </div>

      {ledgerEntries.length > 0 && (
        <div className="p-4">

          <div className="mb-3 font-semibold">
            Ledger Entries
          </div>

          <div className="overflow-x-auto rounded-lg border">

            <table className="w-full text-sm">

              <thead className="bg-slate-100">

                <tr>

                  <Header>
                    Date
                  </Header>

                  <Header>
                    Transaction
                  </Header>

                  <Header>
                    Direction
                  </Header>

                  <Header align="right">
                    Amount
                  </Header>

                  <Header align="right">
                    Balance After
                  </Header>

                </tr>

              </thead>

              <tbody>

                {ledgerEntries.map(
                  (entry, index) => {

                    const row =
                      asRecord(
                        entry,
                      );

                    if (!row) {
                      return null;
                    }

                    return (
                      <tr
                        key={
                          String(
                            row.id ??
                              index,
                          )
                        }
                        className="border-t"
                      >

                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.createdAt
                            ? formatDateTime(
                                String(
                                  row.createdAt,
                                ),
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-3 font-mono text-xs">
                          {String(
                            row.transactionId ??
                              "—",
                          )}
                        </td>

                        <td
                          className={`px-4 py-3 font-medium ${
                            row.direction ===
                            "CREDIT"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {String(
                            row.direction ??
                              "—",
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatMoneyString(
                            row.amount,
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatMoneyString(
                            row.balanceAfter,
                          )}
                        </td>

                      </tr>
                    );
                  },
                )}

              </tbody>

            </table>

          </div>

        </div>
      )}

    </div>
  );
}

// =========================================================
// ORPHAN DETECTOR
// =========================================================

function OrphanDetectorDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  const details =
    asRecord(run.details);

  const anomalies =
    asArray(details?.anomalies);

  return (
    <div>

      <RunSummary run={run} />

      <div className="mb-5 grid gap-4 md:grid-cols-3">

        <Detail
          label="Mode"
          value={String(
            details?.mode ?? "—",
          )}
        />

        <Detail
          label="Window Start"
          value={
            details?.windowStart
              ? formatDateTime(
                  String(
                    details.windowStart,
                  ),
                )
              : "—"
          }
        />

        <Detail
          label="Window End"
          value={
            details?.windowEnd
              ? formatDateTime(
                  String(
                    details.windowEnd,
                  ),
                )
              : "—"
          }
        />

      </div>

      <SectionTitle>
        Orphan Transactions
      </SectionTitle>

      {anomalies.length === 0 ? (
        <EmptyDetails>
          No orphan transactions were
          detected.
        </EmptyDetails>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">

          <table className="w-full text-sm">

            <thead className="bg-slate-100">

              <tr>

                <Header>
                  Transaction ID
                </Header>

                <Header>
                  Status
                </Header>

                <Header align="right">
                  Ledger Entries
                </Header>

                <Header>
                  Anomaly
                </Header>

              </tr>

            </thead>

            <tbody>

              {anomalies.map(
                (item, index) => {

                  const anomaly =
                    asRecord(item);

                  return (
                    <tr
                      key={`${String(
                        anomaly?.transactionId ??
                          index,
                      )}-${index}`}
                      className="border-t"
                    >

                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {String(
                          anomaly?.transactionId ??
                            "—",
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {String(
                          anomaly?.transactionStatus ??
                            "—",
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {String(
                          anomaly?.ledgerEntryCount ??
                            "0",
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-red-600">
                        {toTitle(
                          String(
                            anomaly?.anomalyType ??
                              "UNKNOWN",
                          ),
                        )}
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
  );
}

// =========================================================
// IDEMPOTENCY CLEANUP
// =========================================================

function IdempotencyCleanupDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  const details =
    asRecord(run.details);

  return (
    <div>

      <RunSummary run={run} />

      <SectionTitle>
        Idempotency Cleanup
      </SectionTitle>

      <div className="grid gap-5 md:grid-cols-3">

        <Detail
          label="Cutoff"
          value={
            details?.cutoff
              ? formatDateTime(
                  String(
                    details.cutoff,
                  ),
                )
              : "—"
          }
        />

        <Detail
          label="Expired Records Scanned"
          value={run.itemsScanned.toLocaleString(
            "en-IN",
          )}
        />

        <Detail
          label="Records Deleted"
          value={String(
            details?.deletedCount ??
              0,
          )}
        />

      </div>

      <InfoBox>
        Expired idempotency records are
        expected housekeeping and are not
        treated as financial anomalies.
      </InfoBox>

    </div>
  );
}

// =========================================================
// ACCOUNT SANITY
// =========================================================

function AccountSanityDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  const details =
    asRecord(run.details);

  const anomalies =
    asArray(details?.anomalies);

  return (
    <div>

      <RunSummary run={run} />

      <SectionTitle>
        Account Sanity Anomalies
      </SectionTitle>

      {anomalies.length === 0 ? (
        <EmptyDetails>
          No account sanity anomalies were
          detected.
        </EmptyDetails>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">

          <table className="w-full text-sm">

            <thead className="bg-slate-100">

              <tr>

                <Header>
                  Account ID
                </Header>

                <Header>
                  Anomaly
                </Header>

                <Header>
                  Stored Last Entry
                </Header>

                <Header>
                  Actual Latest Entry
                </Header>

              </tr>

            </thead>

            <tbody>

              {anomalies.map(
                (item, index) => {

                  const anomaly =
                    asRecord(item);

                  return (
                    <tr
                      key={`${String(
                        anomaly?.accountId ??
                          index,
                      )}-${index}`}
                      className="border-t"
                    >

                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {String(
                          anomaly?.accountId ??
                            "—",
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-red-600">
                        {toTitle(
                          String(
                            anomaly?.anomalyType ??
                              "UNKNOWN",
                          ),
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {String(
                          anomaly?.lastLedgerEntryId ??
                            "—",
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs break-all">
                        {String(
                          anomaly?.actualLatestLedgerEntryId ??
                            "—",
                        )}
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
  );
}

// =========================================================
// GENERIC DETAILS
// =========================================================

function GenericDetails({
  run,
}: {
  run: ReconciliationRun;
}) {
  return (
    <div>

      <RunSummary run={run} />

      <SectionTitle>
        Details
      </SectionTitle>

      <JsonViewer
        value={run.details}
      />

    </div>
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
      <EmptyDetails>
        No additional details available.
      </EmptyDetails>
    );
  }

  return (
    <pre className="max-h-[500px] overflow-auto rounded-lg border bg-white p-4 font-mono text-xs leading-6">
      {JSON.stringify(
        value,
        null,
        2,
      )}
    </pre>
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
        className="rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2"
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
// STATUS BADGE
// =========================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const className =
    status === "SUCCESS"
      ? "bg-green-100 text-green-700"
      : status === "FAILED"
      ? "bg-red-100 text-red-700"
      : status ===
        "PARTIAL_SUCCESS"
      ? "bg-orange-100 text-orange-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {toTitle(status)}
    </span>
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
// SECTION TITLE
// =========================================================

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h4 className="mb-3 text-sm font-semibold">
      {children}
    </h4>
  );
}

// =========================================================
// EMPTY
// =========================================================

function EmptyDetails({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 text-sm text-slate-500">
      {children}
    </div>
  );
}

// =========================================================
// INFO BOX
// =========================================================

function InfoBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-lg border bg-white p-4 text-sm text-slate-600">
      {children}
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
// HELPERS
// =========================================================

function asRecord(
  value: unknown,
): Record<string, any> | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      any
    >;
  }

  return null;
}

function asArray(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function formatDate(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatTime(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleTimeString(
    "en-IN",
  );
}

function formatDateTime(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleString(
    "en-IN",
  );
}

function formatDuration(
  value: number | null,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(
    value / 1000
  ).toFixed(2)} s`;
}

function formatMoneyString(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "₹0.00";
  }

  const stringValue =
    String(value);

  try {
    const amount =
      BigInt(stringValue);

    const negative =
      amount < 0n;

    const absolute =
      negative
        ? -amount
        : amount;

    /*
     * Ledger amounts are stored in
     * smallest units according to your
     * existing formatMoney convention.
     *
     * Keep the raw value here if the
     * backend already supplies formatted
     * amounts differently.
     */
    return `${negative ? "-" : ""}₹${absolute.toString()}`;
  } catch {
    return stringValue;
  }
}

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