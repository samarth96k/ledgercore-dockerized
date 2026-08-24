import type { Request, Response } from "express";

import {
  getLedgerEntriesByTransactionId,
  getLedgerEntriesByAccountId,
  getLatestLedgerEntry,
  getMyTransactions,
  getLedgerEntriesForAdmin
} from "./ledger.database.js";
import { serializeBigInt } from "../../common/config/serialiseBigInt.js";
import { logger } from "../../common/config/logger.js";
import {
  EntryType,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

export const getLedgerEntriesByTransactionIdController = async (
  req: Request<{ transactionId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    const entries =
      await getLedgerEntriesByTransactionId(
        transactionId,
      );

    return res.status(200).json({
      success: true,
      entries:serializeBigInt(entries),
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

export const getLedgerEntriesByAccountIdController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const entries =
      await getLedgerEntriesByAccountId(
        accountId,
      );

    return res.status(200).json({
      success: true,
      entries:serializeBigInt(entries),
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

export const getLatestLedgerEntryController = async (
  req: Request<{ accountId: string }>,
  res: Response,
): Promise<Response> => {
  try {
    const { accountId } = req.params;

    const entry =
      await getLatestLedgerEntry(accountId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Ledger entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      entry:serializeBigInt (entry),
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

export const getMyTransactionsController = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    /*
     * IMPORTANT:
     * accountId comes from authenticated identity,
     * NOT from req.params or req.query.
     */
    const accountId = req.user.accountId;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "No account associated with this user.",
      });
    }


    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const page = Math.max(
      Number(req.query.page) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100,
    );


    // -------------------------------------------------------
    // OPTIONAL FILTERS
    // -------------------------------------------------------

const direction =
  parseEntryType(req.query.direction);

const status =
  parseTransactionStatus(req.query.status);

const type =
  parseTransactionType(req.query.type);

    // -------------------------------------------------------
    // DATE FILTERS
    // -------------------------------------------------------

    const from =
      typeof req.query.from === "string"
        ? new Date(req.query.from)
        : undefined;

    const to =
      typeof req.query.to === "string"
        ? new Date(req.query.to)
        : undefined;


    // -------------------------------------------------------
    // DATABASE
    // -------------------------------------------------------

const result = await getMyTransactions(
  accountId,
  {
    page,
    limit,

    ...(direction !== undefined && {
      direction,
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
  },
);


    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return res.status(200).json({
      success: true,

      entries: serializeBigInt(
        result.entries,
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
function parseEntryType(
  value: unknown,
): EntryType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (
    Object.values(EntryType).includes(
      value as EntryType,
    )
  ) {
    return value as EntryType;
  }

  throw new Error(
    `Invalid direction: ${value}`,
  );
}


function parseTransactionStatus(
  value: unknown,
): TransactionStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (
    Object.values(TransactionStatus).includes(
      value as TransactionStatus,
    )
  ) {
    return value as TransactionStatus;
  }

  throw new Error(
    `Invalid transaction status: ${value}`,
  );
}


function parseTransactionType(
  value: unknown,
): TransactionType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (
    Object.values(TransactionType).includes(
      value as TransactionType,
    )
  ) {
    return value as TransactionType;
  }

  throw new Error(
    `Invalid transaction type: ${value}`,
  );
}

export const getLedgerEntriesForAdminController =
  async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      // ==========================================
      // PAGINATION
      // ==========================================

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

      // ==========================================
      // DIRECTION
      // ==========================================

      let direction:
        | EntryType
        | undefined;

      if (
        typeof req.query.direction ===
        "string"
      ) {
        if (
          !Object.values(
            EntryType,
          ).includes(
            req.query
              .direction as EntryType,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid ledger direction.",
          });
        }

    direction:
req.query.direction
  ? (req.query.direction as EntryType)
  : undefined
      }

      // ==========================================
      // IDs
      // ==========================================

      const accountId =
        typeof req.query.accountId ===
        "string"
          ? req.query.accountId
          : undefined;

      const transactionId =
        typeof req.query
          .transactionId === "string"
          ? req.query.transactionId
          : undefined;

      // ==========================================
      // DATE RANGE
      // ==========================================

      let from: Date | undefined;
      let to: Date | undefined;

      if (
        typeof req.query.from === "string"
      ) {
        from = new Date(req.query.from);

        if (
          Number.isNaN(from.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid from date.",
          });
        }
      }

      if (
        typeof req.query.to === "string"
      ) {
        to = new Date(req.query.to);

        if (
          Number.isNaN(to.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date.",
          });
        }
      }

      // ==========================================
      // SORT
      // ==========================================

      const order:
        | "asc"
        | "desc" =
        req.query.order === "asc"
          ? "asc"
          : "desc";

      // ==========================================
      // DATABASE
      // ==========================================

      const result =
        await getLedgerEntriesForAdmin({
          page,
          limit,

          ...(accountId !== undefined && {
            accountId,
          }),

          ...(transactionId !==
            undefined && {
            transactionId,
          }),

          ...(direction !== undefined && {
            direction,
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

        entries: serializeBigInt(
          result.entries,
        ),

        pagination:
          result.pagination,
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