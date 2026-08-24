import { Router } from "express";

import {
  getIdempotencyKeysForAdminController,
} from "./idempotency.controller.js";

export const idempotencyRouter =
  Router();

idempotencyRouter.get(
  "/",
  getIdempotencyKeysForAdminController,
);