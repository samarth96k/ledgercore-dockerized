import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";

// ============================================================
// TYPES
// ============================================================

type SimulationTestType =
  | "NORMAL"
  | "LOAD"
  | "SPIKE"
  | "STRESS";

type SimulationStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

type SimulationRun = {
  id: string;
  testType: SimulationTestType;
  status: SimulationStatus;
  requestedVUs: number;
  durationSeconds?: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
};

type SimulationMetrics = {
  totalRequests: number;
  throughput: number;
  failedRequests: number;
  failureRate: number;
  avgLatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  checksPassed: number;
  checksFailed: number;
};

type FixedConfig = {
  testType: "NORMAL" | "LOAD";
  vus: number;
  durationSeconds: number;
};

type StagedConfig = {
  testType: "SPIKE" | "STRESS";
  stages: {
    duration: string;
    target: number;
  }[];
  durationSeconds: number;
};

type SimulationConfig =
  | FixedConfig
  | StagedConfig;

// ============================================================
// K6 METRICS
// ============================================================

type K6Metric = {
  avg?: number;
  min?: number;
  med?: number;
  max?: number;
  "p(90)"?: number;
  "p(95)"?: number;

  count?: number;
  rate?: number;

  passes?: number;
  fails?: number;
  value?: number;
};

type K6Metrics = {
  http_req_duration?: K6Metric;
  "http_req_duration{expected_response:true}"?: K6Metric;
  http_reqs?: K6Metric;
  http_req_failed?: K6Metric;

  checks?: K6Metric;

  iterations?: K6Metric;

  vus?: K6Metric;
  vus_max?: K6Metric;

  http_req_waiting?: K6Metric;
  http_req_blocked?: K6Metric;
  http_req_sending?: K6Metric;
  http_req_receiving?: K6Metric;
  http_req_connecting?: K6Metric;
  http_req_tls_handshaking?: K6Metric;

  data_sent?: K6Metric;
  data_received?: K6Metric;
  iteration_duration?: K6Metric;
};

type K6Check = {
  passes?: number;
  fails?: number;
  name?: string;
};

type K6RootGroup = {
  checks?: Record<string, K6Check>;
};

type K6Data = {
  metrics?: K6Metrics;
  root_group?: K6RootGroup;
};

type SimulationResult = {
  id: string;
  testType: SimulationTestType;
  status: "COMPLETED";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  config: SimulationConfig;

  metrics: SimulationMetrics;

  k6?: K6Data;
};

// ============================================================
// PAGE
// ============================================================

export default function SimulationResults() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);

  const [selectedRunId, setSelectedRunId] =
    useState<string | null>(null);

  const [selectedResult, setSelectedResult] =
    useState<SimulationResult | null>(null);

  const [loading, setLoading] = useState(true);

  const [loadingResult, setLoadingResult] =
    useState(false);

  const [error, setError] = useState("");

  // ==========================================================
  // FETCH RUN HISTORY
  // ==========================================================

  const fetchRuns = useCallback(async () => {
    try {
      setError("");

      const response = await api.get(
        "/banking/simulation/runs",
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to fetch simulations.",
        );
      }

      const fetchedRuns: SimulationRun[] =
        response.data?.runs || [];

      /*
       * IMPORTANT:
       * Always show newest runs first.
       */
      const sortedRuns = [...fetchedRuns].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() -
          new Date(a.startedAt).getTime(),
      );

      setRuns(sortedRuns);

      /*
       * Automatically select the newest completed run.
       *
       * This fixes the old UI behavior where the newest
       * run appeared at the bottom and wasn't opened.
       */
      setSelectedRunId((currentId) => {
        if (
          currentId &&
          sortedRuns.some(
            (run) => run.id === currentId,
          )
        ) {
          return currentId;
        }

        const newestCompleted =
          sortedRuns.find(
            (run) =>
              run.status === "COMPLETED",
          );

        return newestCompleted?.id ?? null;
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to fetch simulations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // ==========================================================
  // FETCH DETAILED RESULT
  // ==========================================================

  const openResult = async (
    run: SimulationRun,
  ) => {
    if (run.status !== "COMPLETED") {
      setSelectedRunId(run.id);
      setSelectedResult(null);
      return;
    }

    try {
      setSelectedRunId(run.id);
      setLoadingResult(true);
      setError("");

      const response = await api.get(
        `/banking/simulation/runs/${run.id}`,
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to fetch simulation result.",
        );
      }

      const result =
        response.data?.run?.result;

      if (!result) {
        throw new Error(
          "Simulation result is not available.",
        );
      }

      setSelectedResult(result);
    } catch (err: any) {
      setSelectedResult(null);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to fetch simulation result.",
      );
    } finally {
      setLoadingResult(false);
    }
  };

  // ==========================================================
  // AUTOMATICALLY LOAD SELECTED RESULT
  // ==========================================================

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }

    const run = runs.find(
      (item) => item.id === selectedRunId,
    );

    if (
      run &&
      run.status === "COMPLETED"
    ) {
      openResult(run);
    }
  }, [selectedRunId, runs]);

  // ==========================================================
  // SELECTED RUN
  // ==========================================================

  const selectedRun = useMemo(
    () =>
      runs.find(
        (run) =>
          run.id === selectedRunId,
      ) || null,
    [runs, selectedRunId],
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    setLoading(true);

    await fetchRuns();
  };

  // ==========================================================
  // FORMATTERS
  // ==========================================================

  const formatDateTime = (
    value?: string,
  ) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    );
  };

  const formatDuration = (
    durationMs?: number,
  ) => {
    if (
      durationMs === undefined ||
      durationMs === null
    ) {
      return "—";
    }

    return `${(
      durationMs / 1000
    ).toFixed(2)}s`;
  };

  const formatNumber = (
    value?: number,
  ) => {
    if (
      value === undefined ||
      value === null ||
      Number.isNaN(value)
    ) {
      return "—";
    }

    return value.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      },
    );
  };

  const formatDecimal = (
    value?: number,
    digits = 2,
  ) => {
    if (
      value === undefined ||
      value === null ||
      Number.isNaN(value)
    ) {
      return "—";
    }

    return value.toFixed(digits);
  };

  const formatPercentage = (
    value?: number,
  ) => {
    if (
      value === undefined ||
      value === null ||
      Number.isNaN(value)
    ) {
      return "—";
    }

    /*
     * Backend stores failureRate as 0.0 -> 0%.
     */
    return `${(
      value * 100
    ).toFixed(2)}%`;
  };

  const formatLatency = (
    value?: number,
  ) => {
    if (
      value === undefined ||
      value === null ||
      Number.isNaN(value)
    ) {
      return "—";
    }

    /*
     * Zero latency means the metric was not
     * populated, not that the request took 0ms.
     */
    if (value === 0) {
      return "—";
    }

    return `${value.toFixed(2)} ms`;
  };

  // ==========================================================
  // STATUS
  // ==========================================================

  const statusClass = (
    status: SimulationStatus,
  ) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

      case "RUNNING":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

      case "QUEUED":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

      case "FAILED":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";

      default:
        return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
    }
  };

  const statusLabel = (
    status: SimulationStatus,
  ) => {
    switch (status) {
      case "COMPLETED":
        return "Completed";

      case "RUNNING":
        return "Running";

      case "QUEUED":
        return "Queued";

      case "FAILED":
        return "Failed";

      default:
        return status;
    }
  };

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  const testDescription = (
    testType: SimulationTestType,
  ) => {
    switch (testType) {
      case "NORMAL":
        return "Fixed concurrent load";

      case "LOAD":
        return "Sustained concurrent load";

      case "SPIKE":
        return "Sudden traffic variation";

      case "STRESS":
        return "Increasing load until stress point";

      default:
        return "Simulation test";
    }
  };

  // ==========================================================
  // DERIVE REAL METRICS
  //
  // IMPORTANT:
  //
  // New runs have:
  //
  // result.metrics = 0
  //
  // BUT:
  //
  // result.k6.metrics = REAL DATA
  //
  // So we use summary metrics when available,
  // otherwise fall back to k6.
  // ==========================================================

  const getEffectiveMetrics = (
    result: SimulationResult,
  ): SimulationMetrics => {
    const summary = result.metrics;

    const k6 = result.k6?.metrics;

    const hasSummaryRequests =
      (summary?.totalRequests ?? 0) > 0;

    const hasSummaryLatency =
      (summary?.avgLatencyMs ?? 0) > 0;

    /*
     * --------------------------------------------------------
     * REQUESTS
     * --------------------------------------------------------
     */

    const totalRequests =
      hasSummaryRequests
        ? summary.totalRequests
        : k6?.http_reqs?.count ?? 0;

    /*
     * --------------------------------------------------------
     * THROUGHPUT
     * --------------------------------------------------------
     */

    const throughput =
      hasSummaryRequests
        ? summary.throughput
        : k6?.http_reqs?.rate ?? 0;

    /*
     * --------------------------------------------------------
     * FAILED REQUESTS
     * --------------------------------------------------------
     *
     * k6's http_req_failed:
     *
     * value = failure rate
     *
     * fails = number of requests evaluated
     *
     * For your data:
     *
     * fails = 1628
     * value = 0
     *
     * means 0% failed.
     */

    const failureRate =
      summary.totalRequests > 0
        ? summary.failureRate
        : k6?.http_req_failed?.value ?? 0;

    const failedRequests =
      summary.totalRequests > 0
        ? summary.failedRequests
        : Math.round(
            totalRequests * failureRate,
          );

    /*
     * --------------------------------------------------------
     * LATENCY
     * --------------------------------------------------------
     */

    const latencySource =
      k6?.["http_req_duration{expected_response:true}"] ??
      k6?.http_req_duration;

    const avgLatencyMs =
      hasSummaryLatency
        ? summary.avgLatencyMs
        : latencySource?.avg ?? 0;

    const p90LatencyMs =
      hasSummaryLatency
        ? summary.p90LatencyMs
        : latencySource?.["p(90)"] ?? 0;

    const p95LatencyMs =
      hasSummaryLatency
        ? summary.p95LatencyMs
        : latencySource?.["p(95)"] ?? 0;

    /*
     * k6 JSON doesn't contain p99 in the
     * supplied runs.
     *
     * Therefore this legitimately remains 0.
     */
    const p99LatencyMs =
      hasSummaryLatency &&
      summary.p99LatencyMs > 0
        ? summary.p99LatencyMs
        : 0;

    const maxLatencyMs =
      hasSummaryLatency
        ? summary.maxLatencyMs
        : latencySource?.max ?? 0;

    /*
     * --------------------------------------------------------
     * CHECKS
     * --------------------------------------------------------
     *
     * First try the k6 checks metric.
     *
     * If unavailable, aggregate root_group checks.
     */

    let checksPassed =
      summary.checksPassed ?? 0;

    let checksFailed =
      summary.checksFailed ?? 0;

    if (
      checksPassed === 0 &&
      checksFailed === 0
    ) {
      if (k6?.checks) {
        checksPassed =
          k6.checks.passes ?? 0;

        checksFailed =
          k6.checks.fails ?? 0;
      } else if (
        result.k6?.root_group?.checks
      ) {
        const checks =
          Object.values(
            result.k6.root_group.checks,
          );

        checksPassed =
          checks.reduce(
            (sum, check) =>
              sum + (check.passes ?? 0),
            0,
          );

        checksFailed =
          checks.reduce(
            (sum, check) =>
              sum + (check.fails ?? 0),
            0,
          );
      }
    }

    return {
      totalRequests,
      throughput,
      failedRequests,
      failureRate,
      avgLatencyMs,
      p90LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      maxLatencyMs,
      checksPassed,
      checksFailed,
    };
  };

  // ==========================================================
  // EFFECTIVE METRICS
  // ==========================================================

  const effectiveMetrics = useMemo(() => {
    if (!selectedResult) {
      return null;
    }

    return getEffectiveMetrics(
      selectedResult,
    );
  }, [selectedResult]);

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

const renderConfiguration = () => {
  if (!selectedResult) {
    return null;
  }

  const config = selectedResult.config;

  if (
    config.testType === "NORMAL" ||
    config.testType === "LOAD"
  ) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoCard
          label="Test Type"
          value={config.testType}
        />

        <InfoCard
          label="Virtual Users"
          value={config.vus}
        />

        <InfoCard
          label="Duration"
          value={`${config.durationSeconds}s`}
        />
      </div>
    );
  }

  // Explicitly narrow the union.
  if (
    config.testType === "SPIKE" ||
    config.testType === "STRESS"
  ) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoCard
            label="Test Type"
            value={config.testType}
          />

          <InfoCard
            label="Total Duration"
            value={`${config.durationSeconds}s`}
          />

          <InfoCard
            label="Stages"
            value={config.stages.length}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          {config.stages.map(
            (
              stage: {
                duration: string;
                target: number;
              },
              index: number,
            ) => (
              <div
                key={`${stage.duration}-${stage.target}-${index}`}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-slate-500">
                  Stage {index + 1}
                </span>

                <span className="text-sm font-semibold text-slate-900">
                  {stage.target} VUs
                </span>

                <span className="text-sm text-slate-500">
                  {stage.duration}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  return null;
};

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    runs.length === 0
  ) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Simulation Results
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View simulation history and
            performance results.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            Loading simulations...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Simulation Results
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View load-test history and performance.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          EMPTY
      ====================================================== */}

      {runs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <h2 className="font-semibold text-slate-900">
            No simulations yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Run a simulation to see its results.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[calc(100vh-220px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* ==================================================
              LEFT SIDEBAR
          ================================================== */}

          <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Simulations
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {runs.length} runs
              </p>
            </div>

            <div className="max-h-[calc(100vh-310px)] overflow-y-auto p-3">
              <div className="space-y-2">
                {runs.map((run) => {
                  const selected =
                    run.id === selectedRunId;

                  const completed =
                    run.status ===
                    "COMPLETED";

                  return (
                    <button
                      key={run.id}
                      type="button"
                      disabled={!completed}
                      onClick={() =>
                        completed &&
                        openResult(run)
                      }
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-slate-300 bg-white shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-white"
                      } ${
                        completed
                          ? "cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {run.testType}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(
                              run.startedAt,
                            )}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(
                            run.status,
                          )}`}
                        >
                          {statusLabel(
                            run.status,
                          )}
                        </span>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {testDescription(
                          run.testType,
                        )}
                      </p>

                      <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
                        <span>
                          {run.requestedVUs} VUs
                        </span>

                        <span>
                         
                        </span>
                      </div>

                      {selected && (
                        <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                          Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ==================================================
              RIGHT PANEL
          ================================================== */}

          <main className="min-w-0 bg-white">
            {loadingResult ? (
              <div className="flex min-h-[600px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />

                  <p className="text-sm text-slate-500">
                    Loading simulation result...
                  </p>
                </div>
              </div>
            ) : !selectedRun ? (
              <EmptySelection />
            ) : !selectedResult ? (
              <EmptyResult />
            ) : effectiveMetrics ? (
              <div className="p-5 sm:p-7">
                {/* ==================================================
                    RESULT HEADER
                ================================================== */}

                <section className="border-b border-slate-200 pb-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                          {selectedResult.testType}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            selectedRun.status,
                          )}`}
                        >
                          Completed
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {testDescription(
                          selectedResult.testType,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(
                          selectedResult.startedAt,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-5 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Runtime
                      </p>

                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatDuration(
                          selectedResult.durationMs,
                        )}
                      </p>
                    </div>
                  </div>
                </section>

                {/* ==================================================
                    CONFIGURATION
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Configuration
                  </SectionTitle>

                  {renderConfiguration()}
                </section>

                {/* ==================================================
                    PERFORMANCE
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Performance
                  </SectionTitle>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <MetricCard
                      label="Total Requests"
                      value={formatNumber(
                        effectiveMetrics.totalRequests,
                      )}
                    />

                    <MetricCard
                      label="Throughput"
                      value={`${formatDecimal(
                        effectiveMetrics.throughput,
                      )} req/s`}
                    />

                    <MetricCard
                      label="Failed Requests"
                      value={formatNumber(
                        effectiveMetrics.failedRequests,
                      )}
                    />

                    <MetricCard
                      label="Failure Rate"
                      value={formatPercentage(
                        effectiveMetrics.failureRate,
                      )}
                    />
                  </div>
                </section>

                {/* ==================================================
                    LATENCY
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Latency
                  </SectionTitle>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <MetricCard
                      label="Average"
                      value={formatLatency(
                        effectiveMetrics.avgLatencyMs,
                      )}
                    />

                    <MetricCard
                      label="P90"
                      value={formatLatency(
                        effectiveMetrics.p90LatencyMs,
                      )}
                    />

                    <MetricCard
                      label="P95"
                      value={formatLatency(
                        effectiveMetrics.p95LatencyMs,
                      )}
                    />

                    <MetricCard
                      label="P99"
                      value={formatLatency(
                        effectiveMetrics.p99LatencyMs,
                      )}
                    />

                    <MetricCard
                      label="Maximum"
                      value={formatLatency(
                        effectiveMetrics.maxLatencyMs,
                      )}
                    />
                  </div>

                  {effectiveMetrics.p99LatencyMs ===
                    0 && (
                    <p className="mt-3 text-xs text-slate-400">
                      P99 was not provided by the
                      k6 result.
                    </p>
                  )}
                </section>

                {/* ==================================================
                    LATENCY CHART
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Latency Overview
                  </SectionTitle>

                  <LatencyChart
                    average={
                      effectiveMetrics.avgLatencyMs
                    }
                    p90={
                      effectiveMetrics.p90LatencyMs
                    }
                    p95={
                      effectiveMetrics.p95LatencyMs
                    }
                    p99={
                      effectiveMetrics.p99LatencyMs
                    }
                    maximum={
                      effectiveMetrics.maxLatencyMs
                    }
                  />
                </section>

                {/* ==================================================
                    REQUEST HEALTH
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Request Health
                  </SectionTitle>

                  <RequestHealthChart
                    total={
                      effectiveMetrics.totalRequests
                    }
                    failed={
                      effectiveMetrics.failedRequests
                    }
                  />
                </section>

                {/* ==================================================
                    CHECKS
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Checks
                  </SectionTitle>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Checks Passed"
                      value={formatNumber(
                        effectiveMetrics.checksPassed,
                      )}
                    />

                    <MetricCard
                      label="Checks Failed"
                      value={formatNumber(
                        effectiveMetrics.checksFailed,
                      )}
                    />
                  </div>

                  <ChecksChart
                    passed={
                      effectiveMetrics.checksPassed
                    }
                    failed={
                      effectiveMetrics.checksFailed
                    }
                  />
                </section>

                {/* ==================================================
                    EXECUTION
                ================================================== */}

                <section className="pt-7">
                  <SectionTitle>
                    Execution
                  </SectionTitle>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <MetricCard
                      label="Started"
                      value={formatDateTime(
                        selectedResult.startedAt,
                      )}
                    />

                    <MetricCard
                      label="Completed"
                      value={formatDateTime(
                        selectedResult.completedAt,
                      )}
                    />

                    <MetricCard
                      label="Runtime"
                      value={formatDuration(
                        selectedResult.durationMs,
                      )}
                    />
                  </div>
                </section>

                {/* ==================================================
                    K6 SOURCE
                ================================================== */}


              </div>
            ) : null}
          </main>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h3>
  );
}

// ============================================================
// INFO CARD
// ============================================================

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// METRIC CARD
// ============================================================

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// LATENCY CHART
// ============================================================

function LatencyChart({
  average,
  p90,
  p95,
  p99,
  maximum,
}: {
  average: number;
  p90: number;
  p95: number;
  p99: number;
  maximum: number;
}) {
  const data = [
    {
      label: "AVG",
      value: average,
    },
    {
      label: "P90",
      value: p90,
    },
    {
      label: "P95",
      value: p95,
    },
    {
      label: "P99",
      value: p99,
    },
    {
      label: "MAX",
      value: maximum,
    },
  ];

  const availableValues = data
    .map((item) => item.value)
    .filter((value) => value > 0);

  const maxValue =
    Math.max(...availableValues, 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="flex h-64 items-end gap-4 sm:gap-8">
        {data.map((item) => {
          const available =
            item.value > 0;

          const height = available
            ? Math.max(
                (item.value /
                  maxValue) *
                  100,
                5,
              )
            : 3;

          return (
            <div
              key={item.label}
              className="flex h-full flex-1 flex-col items-center justify-end"
            >
              <div className="mb-2 text-xs font-semibold text-slate-700">
                {available
                  ? `${item.value.toFixed(1)} ms`
                  : "—"}
              </div>

              <div className="flex h-[190px] w-full items-end">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    available
                      ? "bg-slate-800"
                      : "bg-slate-200"
                  }`}
                  style={{
                    height: `${height}%`,
                  }}
                />
              </div>

              <div className="mt-3 text-[11px] font-semibold text-slate-400">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// REQUEST HEALTH CHART
// ============================================================

function RequestHealthChart({
  total,
  failed,
}: {
  total: number;
  failed: number;
}) {
  const successful =
    Math.max(total - failed, 0);

  const successPercentage =
    total > 0
      ? (successful / total) * 100
      : 0;

  const failurePercentage =
    total > 0
      ? (failed / total) * 100
      : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Request outcome
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatCompactNumber(total)} total
            requests
          </p>
        </div>

        <p className="text-lg font-semibold text-slate-900">
          {successPercentage.toFixed(2)}%
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{
            width: `${successPercentage}%`,
          }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Successful
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatCompactNumber(
              successful,
            )}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Failed
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatCompactNumber(failed)}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {failurePercentage.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHECKS CHART
// ============================================================

function ChecksChart({
  passed,
  failed,
}: {
  passed: number;
  failed: number;
}) {
  const total =
    passed + failed;

  const passedPercentage =
    total > 0
      ? (passed / total) * 100
      : 0;

  const failedPercentage =
    total > 0
      ? (failed / total) * 100
      : 0;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Check results
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {formatCompactNumber(total)} total
            checks
          </p>
        </div>

        <p className="text-lg font-semibold text-slate-900">
          {passedPercentage.toFixed(2)}%
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-800"
          style={{
            width: `${passedPercentage}%`,
          }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Passed
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatCompactNumber(passed)}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Failed
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatCompactNumber(failed)}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {failedPercentage.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NUMBER FORMAT
// ============================================================

function formatCompactNumber(
  value: number,
) {
  if (value >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(1)}K`;
  }

  return value.toLocaleString();
}

// ============================================================
// EMPTY SELECTION
// ============================================================

function EmptySelection() {
  return (
    <div className="flex min-h-[600px] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <span className="text-xl text-slate-400">
            →
          </span>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">
          Select a simulation
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Select a completed simulation from the
          left to view its performance results.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY RESULT
// ============================================================

function EmptyResult() {
  return (
    <div className="flex min-h-[600px] items-center justify-center p-8">
      <div className="text-center">
        <p className="font-medium text-slate-900">
          Result unavailable
        </p>

        <p className="mt-2 text-sm text-slate-500">
          The simulation completed but no result
          data was returned.
        </p>
      </div>
    </div>
  );
}