import { Router } from "express";

import {
  getReconciliationRunsForAdminController,
} from "./reconcialation.controller.js";

export const reconciliationRouter =
  Router();

reconciliationRouter.get(
  "/",
  getReconciliationRunsForAdminController,
);