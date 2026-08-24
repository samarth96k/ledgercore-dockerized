import type {
  Request,
  Response,
} from "express";

import {
  getActiveSimulation,
  getSimulationRun,
  getSimulationRuns,
  startSimulation,
} from "./simulation.service.js";

import type {
  SimulationConfig,
} from "./simulation.types.js";

// =========================================================
// START SIMULATION
// =========================================================

export async function startSimulationController(
  req: Request,
  res: Response,
) {
  try {
    const config =
      req.body as SimulationConfig;

    const run =
      await startSimulation(config);

    return res.status(202).json({
      success: true,
      message: "Simulation started.",
      run,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start simulation.";

    // -------------------------------------------------------
    // Another simulation is already active
    // -------------------------------------------------------

    if (
      message ===
      "A simulation is already running."
    ) {
      return res.status(409).json({
        success: false,
        message,
      });
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

// =========================================================
// ACTIVE SIMULATION
// =========================================================

export async function getActiveSimulationController(
  _req: Request,
  res: Response,
) {
  const runId =
    getActiveSimulation();

  // No simulation currently running
  if (!runId) {
    return res.status(200).json({
      success: true,
      active: false,
      run: null,
    });
  }

  const run =
    await getSimulationRun(runId);

  // -------------------------------------------------------
  // In-memory active ID exists but the status file
  // no longer exists.
  // -------------------------------------------------------

  if (!run) {
    return res.status(200).json({
      success: true,
      active: false,
      run: null,
    });
  }

  const active =
    run.status === "QUEUED" ||
    run.status === "RUNNING";

  return res.status(200).json({
    success: true,
    active,
    run,
  });
}

// =========================================================
// GET ONE SIMULATION
// =========================================================

export async function getSimulationRunController(
  req: Request<{
    runId: string;
  }>,
  res: Response,
) {
  const run =
    await getSimulationRun(
      req.params.runId,
    );

  if (!run) {
    return res.status(404).json({
      success: false,
      message: "Simulation run not found.",
    });
  }

  return res.status(200).json({
    success: true,
    run,
  });
}

// =========================================================
// GET SIMULATION HISTORY
// =========================================================

export async function getSimulationRunsController(
  _req: Request,
  res: Response,
) {
  const runs =
    await getSimulationRuns();

  return res.status(200).json({
    success: true,
    runs,
  });
}