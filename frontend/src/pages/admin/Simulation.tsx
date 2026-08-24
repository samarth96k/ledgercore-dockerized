import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/api";

type SimulationTestType =
  | "NORMAL"
  | "LOAD"
  | "SPIKE"
  | "STRESS";

type SimulationConfig =
  | {
      testType: "NORMAL" | "LOAD";
      vus: number;
      durationSeconds: number;
    }
  | {
      testType: "SPIKE" | "STRESS";
    };

type SimulationRun = {
  id: string;
  testType: SimulationTestType;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  requestedVUs: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  config?: SimulationConfig;
};

export default function Simulation() {
  const [testType, setTestType] =
    useState<SimulationTestType>("NORMAL");

  const [vus, setVus] = useState(2);
  const [durationSeconds, setDurationSeconds] =
    useState(20);

  const [activeRun, setActiveRun] =
    useState<SimulationRun | null>(null);

  const [loading, setLoading] = useState(false);
  const [checkingActive, setCheckingActive] =
    useState(true);

  const [error, setError] = useState("");

  // =========================================================
  // CHECK ACTIVE SIMULATION
  // =========================================================

  const fetchActiveSimulation = async () => {
    try {
      const response = await api.get(
        "/banking/simulation/active",
      );

      if (
        response.data?.success &&
        response.data?.active
      ) {
        setActiveRun(response.data.run);
      } else {
        setActiveRun(null);
      }
    } catch (err) {
      console.error(
        "Failed to fetch active simulation:",
        err,
      );
    } finally {
      setCheckingActive(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchActiveSimulation();
  }, []);

  // =========================================================
  // POLL ACTIVE SIMULATION
  // =========================================================

  useEffect(() => {
    if (!activeRun) {
      return;
    }

    if (
      activeRun.status !== "QUEUED" &&
      activeRun.status !== "RUNNING"
    ) {
      return;
    }

    const interval = setInterval(() => {
      fetchActiveSimulation();
    }, 1500);

    return () => clearInterval(interval);
  }, [activeRun]);

  // =========================================================
  // FORM CONFIGURATION
  // =========================================================

  const config: SimulationConfig = useMemo(() => {
    if (
      testType === "NORMAL" ||
      testType === "LOAD"
    ) {
      return {
        testType,
        vus,
        durationSeconds,
      };
    }

    return {
      testType,
    };
  }, [
    testType,
    vus,
    durationSeconds,
  ]);

  // =========================================================
  // START SIMULATION
  // =========================================================

  const handleStartSimulation = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await api.post(
        "/banking/simulation/run",
        config,
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to start simulation.",
        );
      }

      setActiveRun(response.data.run);
    } catch (err: any) {
      if (
        err?.response?.status === 409
      ) {
        setError(
          "A simulation is already running.",
        );
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to start simulation.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // REMAINING TIME
  // =========================================================

  const getRemainingSeconds = () => {
    if (!activeRun) {
      return null;
    }

    if (
      activeRun.status !== "RUNNING"
    ) {
      return null;
    }

const duration =
  activeRun.config &&
  (activeRun.config.testType === "NORMAL" ||
    activeRun.config.testType === "LOAD")
    ? activeRun.config.durationSeconds
    : null;

    if (!duration) {
      return null;
    }

    const started =
      new Date(
        activeRun.startedAt,
      ).getTime();

    const elapsed =
      (Date.now() - started) / 1000;

    return Math.max(
      0,
      Math.ceil(duration - elapsed),
    );
  };

  const remainingSeconds =
    getRemainingSeconds();

  // =========================================================
  // TEST PROFILE
  // =========================================================

  const renderProfile = () => {
    if (testType === "SPIKE") {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Spike Profile
          </p>

          <p className="mt-2 text-lg font-semibold text-slate-900">
            5 → 25 → 50 → 100 → 25 → 5 VUs
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Uses the predefined spike stages.
          </p>
        </div>
      );
    }

    if (testType === "STRESS") {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Stress Profile
          </p>

          <p className="mt-2 text-lg font-semibold text-slate-900">
            10 → 25 → 50 → 100 → 150 VUs
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Uses the predefined stress stages.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Virtual Users
          </label>

          <input
            type="number"
            min={1}
            value={vus}
            onChange={(e) =>
              setVus(
                Math.max(
                  1,
                  Number(e.target.value),
                ),
              )
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Duration
          </label>

          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={durationSeconds}
              onChange={(e) =>
                setDurationSeconds(
                  Math.max(
                    1,
                    Number(
                      e.target.value,
                    ),
                  ),
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />

            <span className="text-sm text-slate-500">
              seconds
            </span>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Run Simulation
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Run controlled k6 load tests against the
          payment system.
        </p>
      </div>

      {/* ACTIVE SIMULATION */}

      {activeRun &&
        (activeRun.status === "QUEUED" ||
          activeRun.status === "RUNNING") && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  Simulation in progress
                </p>

                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {activeRun.testType}
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {activeRun.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">
                  VUs
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {activeRun.requestedVUs}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Duration
                </p>

                <p className="mt-1 font-semibold text-slate-900">
{activeRun.config &&
(activeRun.config.testType === "NORMAL" ||
  activeRun.config.testType === "LOAD")
  ? `${activeRun.config.durationSeconds}s`
  : "Staged"}
                </p>
              </div>

              {remainingSeconds !== null && (
                <div>
                  <p className="text-xs text-slate-500">
                    Remaining
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    ~{remainingSeconds}s
                  </p>
                </div>
              )}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              You cannot start another simulation while
              this one is running.
            </p>
          </div>
        )}

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* CONFIGURATION */}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Test Configuration
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the type of simulation you want to
            run.
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Simulation Type
          </label>

          <select
            value={testType}
            disabled={
              loading ||
              !!activeRun ||
              checkingActive
            }
            onChange={(e) =>
              setTestType(
                e.target.value as SimulationTestType,
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
          >
            <option value="NORMAL">
              NORMAL
            </option>

            <option value="LOAD">
              LOAD
            </option>

            <option value="SPIKE">
              SPIKE
            </option>

            <option value="STRESS">
              STRESS
            </option>
          </select>
        </div>

        {renderProfile()}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={
              loading ||
              !!activeRun ||
              checkingActive
            }
            onClick={handleStartSimulation}
            className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Starting..."
              : activeRun
                ? "Simulation Running"
                : "Run Simulation"}
          </button>
        </div>
      </div>
    </div>
  );
}