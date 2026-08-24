import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

import type { FileHandle } from "node:fs/promises";

import type {
  SimulationConfig,
  SimulationMetrics,
  SimulationResultFile,
  SimulationStage,
  SimulationStatusFile,
  SimulationTestType,
} from "./simulation.types.js";


// =========================================================
// DIRECTORIES
// =========================================================

const SIMULATION_DIR = path.resolve(
  process.cwd(),
  "src",
  "Simulation",
);

const RESULTS_DIR = path.resolve(
  process.cwd(),
  "simulation-results",
);


// =========================================================
// ENVIRONMENT
// =========================================================

const BASE_URL =
  process.env.SIMULATION_BASE_URL ||
  "http://localhost:3000";

const LOGIN_URL =
  process.env.SIMULATION_LOGIN_URL ||
  `${BASE_URL}/api/user/login`;

const TEST_USER_PASSWORD =
  process.env.SIMULATION_TEST_USER_PASSWORD ||
  "root@QWERTY1";


// =========================================================
// ACTIVE SIMULATION
// =========================================================

let activeSimulationId: string | null = null;

export function getActiveSimulation() {
  return activeSimulationId;
}


// =========================================================
// FILE PATHS
// =========================================================

function statusFilePath(runId: string) {
  return path.join(
    RESULTS_DIR,
    `${runId}-status.json`,
  );
}

function resultFilePath(runId: string) {
  return path.join(
    RESULTS_DIR,
    `${runId}-result.json`,
  );
}

function logFilePath(runId: string) {
  return path.join(
    RESULTS_DIR,
    `${runId}.log`,
  );
}

function rawResultFilePath(runId: string) {
  return path.join(
    RESULTS_DIR,
    `${runId}-k6-raw.json`,
  );
}


// =========================================================
// K6 SCRIPT
// =========================================================

function getK6Script(
  testType: SimulationTestType,
): string {
  const scripts: Record<
    SimulationTestType,
    string
  > = {
    NORMAL: "payment-normal.js",
    LOAD: "payment-load.js",
    SPIKE: "payment-spike.js",
    STRESS: "payment-stress.js",
  };

  return path.resolve(
    SIMULATION_DIR,
    scripts[testType],
  );
}


// =========================================================
// STATUS FILE
// =========================================================

async function writeStatus(
  status: SimulationStatusFile,
) {
  await fs.writeFile(
    statusFilePath(status.id),
    JSON.stringify(
      status,
      null,
      2,
    ),
    "utf8",
  );
}

async function readStatus(
  runId: string,
): Promise<SimulationStatusFile> {
  const content =
    await fs.readFile(
      statusFilePath(runId),
      "utf8",
    );

  return JSON.parse(
    content,
  ) as SimulationStatusFile;
}


// =========================================================
// RUN ID
// =========================================================

function createRunId() {
  return `${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}`;
}


// =========================================================
// STAGE HELPERS
// =========================================================

function durationToSeconds(
  duration: string,
): number {
  const value =
    Number.parseFloat(duration);

  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid stage duration: ${duration}`,
    );
  }

  if (duration.endsWith("ms")) {
    return value / 1000;
  }

  if (duration.endsWith("s")) {
    return value;
  }

  if (duration.endsWith("m")) {
    return value * 60;
  }

  if (duration.endsWith("h")) {
    return value * 3600;
  }

  throw new Error(
    `Unsupported stage duration: ${duration}`,
  );
}

function calculateStageDuration(
  stages: SimulationStage[],
): number {
  return stages.reduce(
    (total, stage) =>
      total +
      durationToSeconds(
        stage.duration,
      ),
    0,
  );
}

function getMaximumStageVUs(
  stages: SimulationStage[],
): number {
  return stages.reduce(
    (maximum, stage) =>
      Math.max(
        maximum,
        stage.target,
      ),
    0,
  );
}


// =========================================================
// DEFAULT CONFIG
// =========================================================

function defaultConfig(
  config: SimulationConfig,
): SimulationConfig {

  switch (config.testType) {

    // -------------------------------------------------------
    // NORMAL
    // -------------------------------------------------------

    case "NORMAL":
      return {
        testType: "NORMAL",
        vus:
          config.vus ?? 5,
        durationSeconds:
          config.durationSeconds ?? 30,
      };


    // -------------------------------------------------------
    // LOAD
    // -------------------------------------------------------

    case "LOAD":
      return {
        testType: "LOAD",
        vus:
          config.vus ?? 25,
        durationSeconds:
          config.durationSeconds ?? 120,
      };


    // -------------------------------------------------------
    // SPIKE
    //
    // The frontend can display these stages directly.
    // -------------------------------------------------------

    case "SPIKE": {
      const stages =
        config.stages ?? [
          {
            duration: "20s",
            target: 5,
          },
          {
            duration: "20s",
            target: 25,
          },
          {
            duration: "20s",
            target: 50,
          },
          {
            duration: "20s",
            target: 100,
          },
          {
            duration: "20s",
            target: 25,
          },
          {
            duration: "20s",
            target: 5,
          },
        ];

      return {
        testType: "SPIKE",
        stages,
        durationSeconds:
          calculateStageDuration(
            stages,
          ),
      };
    }


    // -------------------------------------------------------
    // STRESS
    // -------------------------------------------------------

    case "STRESS": {
      const stages =
        config.stages ?? [
          {
            duration: "30s",
            target: 10,
          },
          {
            duration: "30s",
            target: 25,
          },
          {
            duration: "30s",
            target: 50,
          },
          {
            duration: "30s",
            target: 100,
          },
          {
            duration: "30s",
            target: 150,
          },
        ];

      return {
        testType: "STRESS",
        stages,
        durationSeconds:
          calculateStageDuration(
            stages,
          ),
      };
    }
  }
}


// =========================================================
// VALIDATION
// =========================================================

function validateConfig(
  config: SimulationConfig,
) {

  // -------------------------------------------------------
  // FIXED TESTS
  // -------------------------------------------------------

  if (
    config.testType === "NORMAL" ||
    config.testType === "LOAD"
  ) {

    if (
      !Number.isInteger(
        config.vus,
      ) ||
      config.vus < 1 ||
      config.vus > 1000
    ) {
      throw new Error(
        "VUs must be between 1 and 1000.",
      );
    }

    if (
      !Number.isInteger(
        config.durationSeconds,
      ) ||
      config.durationSeconds < 5 ||
      config.durationSeconds > 3600
    ) {
      throw new Error(
        "Duration must be between 5 and 3600 seconds.",
      );
    }

    return;
  }


  // -------------------------------------------------------
  // STAGED TESTS
  // -------------------------------------------------------

  if (
    config.testType !== "SPIKE" &&
    config.testType !== "STRESS"
  ) {
    throw new Error(
      "Invalid staged simulation test type.",
    );
  }

  if (
    config.stages.length === 0
  ) {
    throw new Error(
      "At least one simulation stage is required.",
    );
  }

  for (
    const stage of config.stages
  ) {

    if (
      !Number.isInteger(
        stage.target,
      ) ||
      stage.target < 1 ||
      stage.target > 2000
    ) {
      throw new Error(
        "Stage VUs must be between 1 and 2000.",
      );
    }

    if (
      durationToSeconds(
        stage.duration,
      ) <= 0
    ) {
      throw new Error(
        "Stage duration must be greater than zero.",
      );
    }
  }

  if (
    config.durationSeconds < 5 ||
    config.durationSeconds > 3600
  ) {
    throw new Error(
      "Total simulation duration must be between 5 and 3600 seconds.",
    );
  }
}


// =========================================================
// K6 TYPES
// =========================================================

type K6Metric = {
  values?: Record<
    string,
    number
  >;
};

type K6Summary = {
  metrics?: Record<
    string,
    K6Metric
  >;
};


// =========================================================
// K6 METRICS
// =========================================================

function extractMetric(
  summary: K6Summary,
  name: string,
): Record<
  string,
  number
> | undefined {

  return summary
    .metrics?.[name]
    ?.values;
}


// =========================================================
// PARSE K6 SUMMARY
// =========================================================

function parseK6Summary(
  summary: K6Summary,
): SimulationMetrics {

  const httpReqs =
    extractMetric(
      summary,
      "http_reqs",
    );

  const httpFailed =
    extractMetric(
      summary,
      "http_req_failed",
    );

  const duration =
    extractMetric(
      summary,
      "http_req_duration",
    );

  const checks =
    extractMetric(
      summary,
      "checks",
    );

  const iterations =
    extractMetric(
      summary,
      "iterations",
    );

  const vus =
    extractMetric(
      summary,
      "vus",
    );


  // -------------------------------------------------------
  // HTTP REQUESTS
  // -------------------------------------------------------

  const totalRequests =
    Number(
      httpReqs?.count ?? 0,
    );


  // -------------------------------------------------------
  // FAILURE RATE
  //
  // k6 stores this as a decimal.
  //
  // 0     = 0%
  // 0.01  = 1%
  // -------------------------------------------------------

  const failureRate =
    Number(
      httpFailed?.rate ?? 0,
    );


  const failedRequests =
    Math.round(
      failureRate *
      totalRequests,
    );


  // -------------------------------------------------------
  // RESULT
  // -------------------------------------------------------

  return {

    totalRequests,

    throughput:
      Number(
        httpReqs?.rate ?? 0,
      ),

    failedRequests,

    failureRate,


    // -----------------------------------------------------
    // LATENCY
    // -----------------------------------------------------

    avgLatencyMs:
      Number(
        duration?.avg ?? 0,
      ),

    p90LatencyMs:
      Number(
        duration?.["p(90)"] ?? 0,
      ),

    p95LatencyMs:
      Number(
        duration?.["p(95)"] ?? 0,
      ),

    p99LatencyMs:
      Number(
        duration?.["p(99)"] ?? 0,
      ),

    maxLatencyMs:
      Number(
        duration?.max ?? 0,
      ),


    // -----------------------------------------------------
    // CHECKS
    // -----------------------------------------------------

    checksPassed:
      Number(
        checks?.passes ?? 0,
      ),

    checksFailed:
      Number(
        checks?.fails ?? 0,
      ),


    // -----------------------------------------------------
    // EXECUTION
    // -----------------------------------------------------

    iterations:
      Number(
        iterations?.count ?? 0,
      ),

    maxVUs:
      Number(
        vus?.max ?? 0,
      ),
  };
}


// =========================================================
// WRITE RESULT FILE
// =========================================================

async function writeSimulationResult(
  runId: string,
  config: SimulationConfig,
  status: SimulationStatusFile,
  k6Summary: K6Summary,
) {

  const completedAt =
    status.completedAt ??
    new Date().toISOString();

  const result: SimulationResultFile = {
    id: runId,

    testType:
      config.testType,

    status: "COMPLETED",

    startedAt:
      status.startedAt,

    completedAt,

    durationMs:
      status.durationMs ?? 0,

    config,

    metrics:
      parseK6Summary(
        k6Summary,
      ),

    k6:
      k6Summary,
  };


  await fs.writeFile(
    resultFilePath(runId),
    JSON.stringify(
      result,
      null,
      2,
    ),
    "utf8",
  );

  return result;
}


// =========================================================
// DIRECTORY
// =========================================================

async function ensureResultsDirectory() {
  await fs.mkdir(
    RESULTS_DIR,
    {
      recursive: true,
    },
  );
}


// =========================================================
// START SIMULATION
// =========================================================

export async function startSimulation(
  config: SimulationConfig,
) {

  if (activeSimulationId) {
    throw new Error(
      "A simulation is already running.",
    );
  }


  // -------------------------------------------------------
  // APPLY DEFAULTS
  // -------------------------------------------------------

  const finalConfig =
    defaultConfig(config);


  // -------------------------------------------------------
  // VALIDATE
  // -------------------------------------------------------

  validateConfig(
    finalConfig,
  );


  await ensureResultsDirectory();


  const runId =
    createRunId();


  // -------------------------------------------------------
  // REQUESTED VUS
  // -------------------------------------------------------
let requestedVUs: number;

switch (finalConfig.testType) {
  case "NORMAL":
  case "LOAD":
    requestedVUs = finalConfig.vus;
    break;

  case "SPIKE":
  case "STRESS":
    requestedVUs = getMaximumStageVUs(
      finalConfig.stages,
    );
    break;
}


  const now =
    new Date().toISOString();


  const status: SimulationStatusFile = {
    id: runId,

    testType:
      finalConfig.testType,

    status: "QUEUED",

    requestedVUs,

    config:
      finalConfig,

    startedAt: now,

    updatedAt: now,
  };


  // -------------------------------------------------------
  // CREATE STATUS FILE FIRST
  // -------------------------------------------------------

  await writeStatus(
    status,
  );


  activeSimulationId =
    runId;


  // -------------------------------------------------------
  // START IN BACKGROUND
  // -------------------------------------------------------

  void executeSimulation(
    runId,
    finalConfig,
  ).catch(
    (error) => {
      console.error(
        "Simulation execution failed:",
        error,
      );

      activeSimulationId =
        null;
    },
  );


  return status;
}


// =========================================================
// EXECUTE K6
// =========================================================

async function executeSimulation(
  runId: string,
  config: SimulationConfig,
) {

  let logHandle:
    | FileHandle
    | null = null;

  let finalized = false;


  const finalizeOnce = async (
    callback: () => Promise<void>,
  ) => {

    if (finalized) {
      return;
    }

    finalized = true;

    await callback();
  };


  try {

    const status =
      await readStatus(
        runId,
      );


    const scriptPath =
      getK6Script(
        config.testType,
      );


    const rawResultPath =
      rawResultFilePath(
        runId,
      );


    const logPath =
      logFilePath(
        runId,
      );


    // -----------------------------------------------------
    // VERIFY SCRIPT EXISTS
    // -----------------------------------------------------

    await fs.access(
      scriptPath,
    );


    // -----------------------------------------------------
    // CREATE LOG
    // -----------------------------------------------------

    logHandle =
      await fs.open(
        logPath,
        "w",
      );


    // -----------------------------------------------------
    // ENVIRONMENT FOR K6
    // -----------------------------------------------------

    const env:
      NodeJS.ProcessEnv = {
        ...process.env,
        BASE_URL,
        LOGIN_URL,
        TEST_USER_PASSWORD,
      };

  switch (config.testType) {
  case "NORMAL":
  case "LOAD":
    env.VUS = String(config.vus);
    env.DURATION =
      `${config.durationSeconds}s`;
    break;

  case "SPIKE":
  case "STRESS":
    env.STAGES_JSON =
      JSON.stringify(config.stages);
    break;
}


    // -----------------------------------------------------
    // K6 ARGUMENTS
    // -----------------------------------------------------

    const args = [
      "run",

      "--summary-export",

      rawResultPath,

      scriptPath,
    ];


    // -----------------------------------------------------
    // SPAWN K6
    // -----------------------------------------------------

    const proc =
      spawn(
        "k6",
        args,
        {
          env,

          cwd:
            SIMULATION_DIR,

          shell:
            process.platform ===
            "win32",

          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        },
      );


    // -----------------------------------------------------
    // PROCESS STARTED
    //
    // Only now do we mark RUNNING.
    // -----------------------------------------------------

    proc.once(
      "spawn",
      () => {

        void (async () => {

          try {

            const current =
              await readStatus(
                runId,
              );

            current.status =
              "RUNNING";

            if (
              proc.pid !==
              undefined
            ) {
              current.pid =
                proc.pid;
            }

            current.updatedAt =
              new Date().toISOString();

            await writeStatus(
              current,
            );

          } catch (error) {

            console.error(
              "Unable to update simulation status to RUNNING:",
              error,
            );
          }

        })();

      },
    );


    // -----------------------------------------------------
    // STDOUT
    // -----------------------------------------------------

    proc.stdout.on(
      "data",
      (data: Buffer) => {

        void logHandle?.write(
          data,
        );

      },
    );


    // -----------------------------------------------------
    // STDERR
    // -----------------------------------------------------

    proc.stderr.on(
      "data",
      (data: Buffer) => {

        void logHandle?.write(
          data,
        );

      },
    );


    // -----------------------------------------------------
    // PROCESS ERROR
    // -----------------------------------------------------

    proc.once(
      "error",
      (error) => {

        void finalizeOnce(
          () =>
            finalizeFailedSimulation(
              runId,
              error.message,
              logHandle,
            ),
        );

      },
    );


    // -----------------------------------------------------
    // PROCESS EXIT
    // -----------------------------------------------------

    proc.once(
      "exit",
      (
        code,
        signal,
      ) => {

        void finalizeOnce(
          () =>
            finalizeSimulation(
              runId,
              code,
              signal,
              logHandle,
            ),
        );

      },
    );

  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : String(error);


    if (logHandle) {

      await logHandle.write(
        `\nSimulation error: ${message}\n`,
      );

    }


    await finalizeOnce(
      () =>
        finalizeFailedSimulation(
          runId,
          message,
          logHandle,
        ),
    );
  }
}


// =========================================================
// FINALIZE SUCCESS / PROCESS EXIT
// =========================================================

async function finalizeSimulation(
  runId: string,
  exitCode: number | null,
  signal: NodeJS.Signals | null,
  logHandle: FileHandle | null,
) {

  try {

    // -----------------------------------------------------
    // NON-ZERO EXIT
    // -----------------------------------------------------

    if (
      exitCode !== 0 ||
      signal !== null
    ) {

      await finalizeFailedSimulation(
        runId,

        `k6 exited with code ${exitCode}${
          signal
            ? `, signal ${signal}`
            : ""
        }`,

        logHandle,
      );

      return;
    }


    // -----------------------------------------------------
    // READ RAW K6 RESULT
    // -----------------------------------------------------

    const rawResultPath =
      rawResultFilePath(
        runId,
      );


    let k6Summary:
      K6Summary;

    try {

      const resultContent =
        await fs.readFile(
          rawResultPath,
          "utf8",
        );


      k6Summary =
        JSON.parse(
          resultContent,
        ) as K6Summary;

    } catch {

      await finalizeFailedSimulation(
        runId,
        "k6 finished but the result file was missing or invalid.",
        logHandle,
      );

      return;
    }


    // -----------------------------------------------------
    // UPDATE STATUS
    // -----------------------------------------------------

    const status =
      await readStatus(
        runId,
      );


    status.status =
      "COMPLETED";


    status.completedAt =
      new Date().toISOString();


    status.updatedAt =
      status.completedAt;


    status.durationMs =
      Date.now() -
      new Date(
        status.startedAt,
      ).getTime();


    await writeStatus(
      status,
    );


    // -----------------------------------------------------
    // WRITE CLEAN RESULT
    //
    // IMPORTANT:
    // Use the original status.config.
    //
    // Do NOT reconstruct it from requestedVUs.
    // This preserves SPIKE/STRESS stages.
    // -----------------------------------------------------

    await writeSimulationResult(
      runId,

      status.config,

      status,

      k6Summary,
    );


    // -----------------------------------------------------
    // DELETE TEMPORARY RAW FILE
    // -----------------------------------------------------

    await fs.unlink(
      rawResultPath,
    ).catch(
      () => {},
    );


    activeSimulationId =
      null;

  } finally {

    await closeLogHandle(
      logHandle,
    );
  }
}


// =========================================================
// FINALIZE FAILURE
// =========================================================

async function finalizeFailedSimulation(
  runId: string,
  errorMessage: string,
  logHandle: FileHandle | null,
) {

  try {

    const status =
      await readStatus(
        runId,
      );


    status.status =
      "FAILED";


    status.errorMessage =
      errorMessage;


    status.completedAt =
      new Date().toISOString();


    status.updatedAt =
      status.completedAt;


    status.durationMs =
      Date.now() -
      new Date(
        status.startedAt,
      ).getTime();


    await writeStatus(
      status,
    );


    activeSimulationId =
      null;

  } catch (error) {

    console.error(
      "Failed to finalize simulation:",
      error,
    );

    activeSimulationId =
      null;

  } finally {

    await closeLogHandle(
      logHandle,
    );
  }
}


// =========================================================
// CLOSE LOG SAFELY
// =========================================================

async function closeLogHandle(
  logHandle: FileHandle | null,
) {

  if (!logHandle) {
    return;
  }


  try {

    await logHandle.close();

  } catch {

    // Already closed.

  }
}


// =========================================================
// GET ONE SIMULATION
// =========================================================

export async function getSimulationRun(
  id: string,
) {

  try {

    const status =
      await readStatus(
        id,
      );


    let result:
      SimulationResultFile | null =
      null;


    try {

      const resultContent =
        await fs.readFile(
          resultFilePath(id),
          "utf8",
        );


      result =
        JSON.parse(
          resultContent,
        ) as SimulationResultFile;

    } catch {

      // Result may not exist yet.

    }


    return {
      ...status,

      result,
    };

  } catch {

    return null;

  }
}


// =========================================================
// GET ALL SIMULATIONS
// =========================================================

export async function getSimulationRuns() {

  await ensureResultsDirectory();


  const files =
    await fs.readdir(
      RESULTS_DIR,
    );


  // -------------------------------------------------------
  // ONLY STATUS FILES
  // -------------------------------------------------------

  const statusFiles =
    files.filter(
      (file) =>
        file.endsWith(
          "-status.json",
        ),
    );


  const runs:
    SimulationStatusFile[] =
      [];


  for (
    const file of statusFiles
  ) {

    try {

      const data =
        await fs.readFile(
          path.join(
            RESULTS_DIR,
            file,
          ),
          "utf8",
        );


      const status =
        JSON.parse(
          data,
        ) as SimulationStatusFile;


      runs.push(
        status,
      );

    } catch {

      // Ignore malformed status files.

    }
  }


  // -------------------------------------------------------
  // NEWEST FIRST
  // -------------------------------------------------------

  runs.sort(
    (a, b) =>
      new Date(
        b.startedAt,
      ).getTime() -
      new Date(
        a.startedAt,
      ).getTime(),
  );


  return runs;
}
