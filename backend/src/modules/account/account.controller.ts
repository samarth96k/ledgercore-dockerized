import type { Request, Response } from "express";
import { AccountType, AccountStatus, SystemAccountType } from "@prisma/client";
import { logger } from "../../common/config/logger.js";
import {
  createAccount,
  getAccountById,
  getAccountByUserId,
  updateAccountStatus,
  getBalanceByAccountId,
  updateCachedBalance,
  getAccountsForAdmin,
  getAccountSearchIndexForAdmin
} from "./account.database.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";

export const createAccountController = async (req: Request, res: Response) => {
  try {
    const { type, currency, status, systemType, aadhaarNumber } = req.body;

    const account = await createAccount(
      type ?? AccountType.USER_WALLET,
      currency ?? "INR",
      status ?? AccountStatus.ACTIVE,
      aadhaarNumber,
      systemType as SystemAccountType | undefined,
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      account,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const getMyAccountController = async (req: Request, res: Response) => {
  try {
    const accountId = req.user.accountId;
    const account = await getAccountById(accountId);
    if (!account) {
      return res.status(400).json({
        success: false,
        message: "Account not found.",
      });
    }
    return res.status(200).json({
      success: true,
      account: serializeBigInt(account),
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getAccountByIdController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const account = await getAccountById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      account: serializeBigInt(account),
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const freezeAccountController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const account = await getAccountById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (account.status === AccountStatus.CLOSE) {
      return res.status(409).json({
        success: false,
        message: "Closed accounts cannot be frozen.",
      });
    }

    if (account.status === AccountStatus.FROZEN) {
      return res.status(409).json({
        success: false,
        message: "Account is already frozen.",
      });
    }

    if (account.type === AccountType.SYSTEM) {
      return res.status(400).json({
        success: false,
        message: "System Accounts cannot be frozen",
      });
    }

    const updatedAccount = await updateAccountStatus(
      accountId,
      AccountStatus.FROZEN,
    );

    return res.status(200).json({
      success: true,
      message: "Account frozen successfully.",
      account: updatedAccount,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const unfreezeAccountController = async (
  req: Request<{ accountId: string }>,
  res: Response,
) => {
  try {
    const { accountId } = req.params;
    const account = await getAccountById(accountId);
    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }
    if (account.status === AccountStatus.CLOSE) {
      return res.status(409).json({
        success: false,
        message: "Closed accounts can not be reopened",
      });
    }
    if (account.status === AccountStatus.ACTIVE) {
      return res
        .status(409)
        .json({ success: false, message: "Account is already unfroze" });
    }
    const updatedAccount = await updateAccountStatus(
      accountId,
      AccountStatus.ACTIVE,
    );
    return res.status(200).json({
      success: true,
      message: "Account unfrozen successfully",
      account: updateAccountStatus,
    });
  } catch (error) {
    logger.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Database status update issue" });
  }
};

export const closeAccountController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const account = await getAccountById(accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (account.status === AccountStatus.CLOSE) {
      return res.status(409).json({
        success: false,
        message: "Account is already closed.",
      });
    }

    /**
     * Future checks:
     * - Balance must be zero.
     * - No pending transactions.
     * - No holds/locks.
     * - No scheduled transfers.
     */

    if (account.balance && account.balance.cachedBalance !== BigInt(0)) {
      return res.status(409).json({
        success: false,
        message: "Account cannot be closed while a balance remains.",
      });
    }

    const updatedAccount = await updateAccountStatus(
      accountId,
      AccountStatus.CLOSE,
    );

    return res.status(200).json({
      success: true,
      message: "Account closed successfully.",
      account: updatedAccount,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const getAccountBalanceController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.user;

    const balance = await getBalanceByAccountId(accountId);

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: "Account balance not found.",
      });
    }

    return res.status(200).json({
      success: true,
      balance: {
        accountId: balance.accountId,
        cachedBalance: balance.cachedBalance.toString(),
        lastLedgerEntryId: balance.lastLedgerEntryId,
        updatedAt: balance.updatedAt,
      },
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const getAccountsForAdminController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    // ---------------------------------------------
    // ACCOUNT STATUS
    // ---------------------------------------------

    let status: AccountStatus | undefined;

    if (typeof req.query.status === "string") {
      if (
        !Object.values(AccountStatus).includes(
          req.query.status as AccountStatus,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid account status.",
        });
      }

      status = req.query.status as AccountStatus;
    }

    // ---------------------------------------------
    // ACCOUNT TYPE
    // ---------------------------------------------

    let type: AccountType | undefined;

    if (typeof req.query.type === "string") {
      if (!Object.values(AccountType).includes(req.query.type as AccountType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account type.",
        });
      }

      type = req.query.type as AccountType;
    }

    // ---------------------------------------------
    // ACCOUNT ID
    // ---------------------------------------------

    const accountId =
      typeof req.query.accountId === "string" ? req.query.accountId : undefined;

    // ---------------------------------------------
    // DATES
    // ---------------------------------------------

    let from: Date | undefined;
    let to: Date | undefined;

    if (typeof req.query.from === "string") {
      from = new Date(req.query.from);

      if (Number.isNaN(from.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from date.",
        });
      }
    }

    if (typeof req.query.to === "string") {
      to = new Date(req.query.to);

      if (Number.isNaN(to.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid to date.",
        });
      }
    }

    // ---------------------------------------------
    // SORT ORDER
    // ---------------------------------------------

    const order = req.query.order === "asc" ? "asc" : "desc";

    // ---------------------------------------------
    // DATABASE
    // ---------------------------------------------

    const result = await getAccountsForAdmin({
      page,
      limit,

      ...(accountId !== undefined && {
        accountId,
      }),

      ...(status !== undefined && {
        status,
      }),

      ...(type !== undefined && {
        type,
      }),

      ...(from !== undefined && {
        from,
      }),

      ...(to !== undefined && {
        to,
      }),

      order,
    });

    return res.status(200).json({
      success: true,

      accounts: serializeBigInt(result.accounts),

      pagination: result.pagination,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,

      message: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

export const getAccountSearchIndexForAdminController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const accounts =
      await getAccountSearchIndexForAdmin();

    return res.status(200).json({
      success: true,
      accounts,
    });
  } catch (error) {
    logger.error(error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal Server Error",
    });
  }
};