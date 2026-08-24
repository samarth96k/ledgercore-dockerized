import type { Request, Response ,NextFunction} from "express";

import {
  getTransactionById,
  getTransactionsByUserId,
  getTransactionsByStatus,
  getRecentTransactions,
  getTransactionEvents,
  getTransactionsForAdmin,
  getTransactionEventsForAdmin
} from "./transaction.database.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";
import { TransactionStatus } from "@prisma/client";
import { TransactionType } from "@prisma/client";
import { LockingStrategy } from "@prisma/client";
import { createPayment } from "../payments/payment.service.js";
import { logger } from "../../common/config/logger.js";
import { TransactionEventType } from "@prisma/client";
import { randomUUID } from "crypto";


export const getTransactionByIdController = async (
  req: Request<{ transactionId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    const transaction = await getTransactionById(
      transactionId,
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    return res.status(200).json({
      success: true,
      transaction:serializeBigInt(transaction),
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

export const getTransactionsByUserIdController = async (
  req: Request<{ userId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { userId } = req.params;

    const transactions =
      await getTransactionsByUserId(userId);

    return res.status(200).json({
      success: true,
      transactions:serializeBigInt(transactions),
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

export const getTransactionsByStatusController = async (
  req: Request<{ status: TransactionStatus }>,
  res: Response,
): Promise<Response> => {
  try {
    const { status } = req.params;

    const transactions =
      await getTransactionsByStatus(status);

    return res.status(200).json({
      success: true,
      transactions:serializeBigInt(transactions),
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

export const getRecentTransactionsController = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const transactions =
      await getRecentTransactions();

    return res.status(200).json({
      success: true,
      transactions:serializeBigInt(transactions),
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

export const getTransactionEventsController = async (
  req: Request<{ transactionId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    const events =
      await getTransactionEvents(transactionId);

    return res.status(200).json({
      success: true,
      events,
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

// admin.controller.ts

export async function reverseTransactionController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "transactionId is required",
      });
    }

    // Replace this with however your auth middleware exposes the user.
    const adminUserId = req.user.id;

    const result = await createPayment(
      adminUserId,
      {
        transactionType: TransactionType.REVERSAL,

        transactionIdToReverse: transactionId,

        // Required by your current CreatePaymentRequest.
        // executeReversalTransaction() ignores them.
        amount: 0n,
        toAccountId: "",

        idempotencyKey: randomUUID(),

        lockingStrategy:
          LockingStrategy.PESSIMISTIC,
      },
      {},
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export const getTransactionsForAdminController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // =====================================================
    // PAGINATION
    // =====================================================

    const page = Math.max(
      Number(req.query.page) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100,
    );

    // =====================================================
    // STATUS
    // =====================================================

    let status: TransactionStatus | undefined;

    if (typeof req.query.status === "string") {
      if (
        !Object.values(TransactionStatus).includes(
          req.query.status as TransactionStatus,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction status.",
        });
      }

      status =
        req.query.status as TransactionStatus;
    }

    // =====================================================
    // TYPE
    // =====================================================

    let type: TransactionType | undefined;

    if (typeof req.query.type === "string") {
      if (
        !Object.values(TransactionType).includes(
          req.query.type as TransactionType,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type.",
        });
      }

      type =
        req.query.type as TransactionType;
    }

    // =====================================================
    // IDs
    // =====================================================

    const userId =
      typeof req.query.userId === "string"
        ? req.query.userId
        : undefined;

    const transactionId =
      typeof req.query.transactionId === "string"
        ? req.query.transactionId
        : undefined;

    // =====================================================
    // DATE RANGE
    // =====================================================

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

    // =====================================================
    // ORDER
    // =====================================================

    const order: "asc" | "desc" =
      req.query.order === "asc"
        ? "asc"
        : "desc";

    // =====================================================
    // QUERY
    // =====================================================

    const result =
      await getTransactionsForAdmin({
        page,
        limit,

        ...(status !== undefined && {
          status,
        }),

        ...(type !== undefined && {
          type,
        }),

        ...(userId !== undefined && {
          userId,
        }),

        ...(transactionId !== undefined && {
          transactionId,
        }),

        ...(from !== undefined && {
          from,
        }),

        ...(to !== undefined && {
          to,
        }),

        order,
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,

      transactions: serializeBigInt(
        result.transactions,
      ),

      pagination: result.pagination,
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

export const getTransactionEventsForAdminController =
  async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 20,
          1,
        ),
        100,
      );

      // -----------------------------------------
      // EVENT TYPE
      // -----------------------------------------

      let event:
        | TransactionEventType
        | undefined;

      if (
        typeof req.query.event === "string"
      ) {
        if (
          !Object.values(
            TransactionEventType,
          ).includes(
            req.query
              .event as TransactionEventType,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid transaction event type.",
          });
        }

        event =
          req.query
            .event as TransactionEventType;
      }

      // -----------------------------------------
      // TRANSACTION ID
      // -----------------------------------------

      const transactionId =
        typeof req.query
          .transactionId === "string"
          ? req.query.transactionId
          : undefined;

      // -----------------------------------------
      // DATES
      // -----------------------------------------

      let from: Date | undefined;
      let to: Date | undefined;

      if (
        typeof req.query.from === "string"
      ) {
        from = new Date(req.query.from);

        if (Number.isNaN(from.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date.",
          });
        }
      }

      if (
        typeof req.query.to === "string"
      ) {
        to = new Date(req.query.to);

        if (Number.isNaN(to.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date.",
          });
        }
      }

      const order: "asc" | "desc" =
        req.query.order === "asc"
          ? "asc"
          : "desc";

      // -----------------------------------------
      // DATABASE
      // -----------------------------------------

      const result =
        await getTransactionEventsForAdmin({
          page,
          limit,

          ...(transactionId !== undefined && {
            transactionId,
          }),

          ...(event !== undefined && {
            event,
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

        events: serializeBigInt(
          result.events,
        ),

        pagination: result.pagination,
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