import { Router } from "express";

import {
  requireAdmin,
} from "../../src/common/middleware/auth.middleware.js";

import {
  startSimulationController,
  getActiveSimulationController,
  getSimulationRunController,
  getSimulationRunsController,
} from "./simulation.controller.js";

export const simulationRouter = Router();

// =========================================================
// START
// =========================================================

simulationRouter.post(
  "/run",
  requireAdmin,
  startSimulationController,
);

// =========================================================
// ACTIVE
// =========================================================

simulationRouter.get(
  "/active",
  requireAdmin,
  getActiveSimulationController,
);

// =========================================================
// HISTORY
// =========================================================

simulationRouter.get(
  "/runs",
  requireAdmin,
  getSimulationRunsController,
);

// =========================================================
// ONE RUN
// =========================================================

simulationRouter.get(
  "/runs/:runId",
  requireAdmin,
  getSimulationRunController,
);

export default simulationRouter;