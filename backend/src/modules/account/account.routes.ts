import express from "express";

import { Router } from "express";
import { authUser,requireAdmin } from "../../common/middleware/auth.middleware.js";
import {
  createAccountController,
  getMyAccountController,
  getAccountByIdController,
  freezeAccountController,
  unfreezeAccountController,
  closeAccountController,
  getAccountBalanceController,
  getAccountsForAdminController,
  getAccountSearchIndexForAdminController
} from "./account.controller.js";
import { getMyTransactionsController } from "../Ledger/ledger.controller.js";

export const router = Router();
// User routes

router.get("/me", authUser, getMyAccountController); //tested
router.get("/me/balance", authUser, getAccountBalanceController); //tested
router.get("/me/transactions",authUser,getMyTransactionsController,);


// Admin routes
router.get("/",authUser,requireAdmin,getAccountsForAdminController,);
router.post("/createAccount", authUser, requireAdmin, createAccountController); //tested
router.get("/:accountId", authUser, requireAdmin, getAccountByIdController); //tested
router.patch("/:accountId/freeze", authUser, requireAdmin, freezeAccountController); //tested
router.patch("/:accountId/unfreeze", authUser, requireAdmin, unfreezeAccountController); //tested
router.patch("/:accountId/close", authUser, requireAdmin, closeAccountController); //tested
router.get(
  "/admin/search-index",
  authUser,
  requireAdmin,
  getAccountSearchIndexForAdminController,
);

export default router;  