import { prisma } from "../../PrismaClient/prismaclient.js";
import { TransactionStatus } from "@prisma/client";
import { TransactionEventType, Prisma, TransactionType  } from "@prisma/client";
import type { CreateTransactionInput } from "./transaction.types.js";

//read functions so they do not require transaction parameter from payment module
export async function getTransactionById(transactionId: string) {
  return prisma.transaction.findUnique({
    where: {
      id: transactionId,
    },
    include: {
      ledgerEntries: {
        include: {
          account: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      events: true,
      initiator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function getTransactionByIdempotencyKey(idempotencyKey: string) {
  return prisma.transaction.findUnique({
    where: {
      idempotencyKey,
    },
  });
}

export async function getTransactionEvents(transactionId: string) {
  return prisma.transactionEvent.findMany({
    where: {
      transactionId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getTransactionsByUserId(userId: string) {
  return prisma.transaction.findMany({
    where: {
      initiatorUserId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getTransactionsByStatus(status: TransactionStatus) {
  return prisma.transaction.findMany({
    where: {
      status,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getRecentTransactions(limit = 20) {
  return prisma.transaction.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });
}


//write functions tx required to mantAin atomicity

export async function createTransaction(
  tx: Prisma.TransactionClient,
  {
    type,
    initiatorUserId,
    amount,
    currency = "INR",
    idempotencyKey,
    status = TransactionStatus.PENDING,
    lockingStrategy,
    reversalOfId,
  }: CreateTransactionInput,
) {
  return tx.transaction.create({
    data: {
      type,
      initiatorUserId,
      amount,
      currency,
      idempotencyKey,
      status,
      lockingStrategy,
        ...(reversalOfId && { reversalOfId }),
    },
  });
}




export async function updateTransactionStatus(
  tx: Prisma.TransactionClient,
  transactionId: string,
  status: TransactionStatus,
  failureReason?: string,
) {
  return tx.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      status,
      failureReason: failureReason ?? null,
    },
  });
}

export async function markTransactionFailed(
  tx: Prisma.TransactionClient,
  transactionId: string,
  failureReason: string,
) {
  return tx.transaction.updateMany({
    where: {
      id: transactionId,
      status: TransactionStatus.PENDING,
    },
    data: {
      status: TransactionStatus.FAILED,
      failureReason,
    },
  });
}

export async function markTransactionSuccessful(
  tx: Prisma.TransactionClient,
  transactionId: string,
) {
  return updateTransactionStatus(
    tx,
    transactionId,
    TransactionStatus.SUCCESS,
  );
}

export async function markTransactionReversed(
  tx: Prisma.TransactionClient,
  transactionId: string,
) {
  return updateTransactionStatus(
    tx,
    transactionId,
    TransactionStatus.REVERSED,
  );
}

export async function createTransactionEvent(
  tx:Prisma.TransactionClient,
  transactionId: string,
  event: TransactionEventType,
  metadata?: Prisma.InputJsonValue,
) {
  return tx.transactionEvent.create({
    data: {
      transactionId,
      event,
      ...(metadata !== undefined && { metadata }),
    },
  });
}

export async function getTransactionByIdTx(
    tx: Prisma.TransactionClient,
    transactionId: string,
) {
    return tx.transaction.findUnique({
        where: { id: transactionId },
    });
}

export async function getLedgerEntriesByTransactionIdTx(
    tx: Prisma.TransactionClient,
    transactionId: string,
) {
    return tx.ledgerEntry.findMany({
        where: { transactionId },
        orderBy: {
            createdAt: "asc",
        },
    });
}

export interface AdminTransactionFilters {
  page?: number;
  limit?: number;

  status?: TransactionStatus;
  type?: TransactionType;

  userId?: string;
  transactionId?: string;

  from?: Date;
  to?: Date;

  order?: "asc" | "desc";
}

export async function getTransactionsForAdmin(
  filters: AdminTransactionFilters = {},
) {
  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(
    Math.max(filters.limit ?? 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  // ---------------------------------------------------------
  // FILTERS
  // ---------------------------------------------------------

  const where: Prisma.TransactionWhereInput = {
    ...(filters.transactionId && {
      id: filters.transactionId,
    }),

    ...(filters.userId && {
      initiatorUserId: filters.userId,
    }),

    ...(filters.status && {
      status: filters.status,
    }),

    ...(filters.type && {
      type: filters.type,
    }),

    ...((filters.from || filters.to) && {
      createdAt: {
        ...(filters.from && {
          gte: filters.from,
        }),

        ...(filters.to && {
          lte: filters.to,
        }),
      },
    }),
  };

  // ---------------------------------------------------------
  // QUERY
  // ---------------------------------------------------------

  const [transactions, total] =
    await prisma.$transaction([
      prisma.transaction.findMany({
        where,

        select: {
          id: true,
          type: true,
          status: true,

          initiatorUserId: true,

          amount: true,
          currency: true,

          lockingStrategy: true,
          reversalOfId: true,

          failureReason: true,

          createdAt: true,
          updatedAt: true,

          initiator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },

          // ---------------------------------------------------
          // ALL ACCOUNTING LEGS
          // ---------------------------------------------------

          ledgerEntries: {
            select: {
              id: true,
              accountId: true,
              direction: true,
              amount: true,
              balanceAfter: true,

              account: {
                select: {
                  id: true,
                  type: true,
                  systemType: true,

                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },

            orderBy: {
              createdAt: "asc",
            },
          },

          _count: {
            select: {
              ledgerEntries: true,
              events: true,
            },
          },
        },

        orderBy: [
          {
            createdAt:
              filters.order ?? "desc",
          },
          {
            id:
              filters.order ?? "desc",
          },
        ],

        skip,
        take: limit,
      }),

      prisma.transaction.count({
        where,
      }),
    ]);

  // ---------------------------------------------------------
  // SYSTEM ACCOUNT NAMES
  // ---------------------------------------------------------

  const SYSTEM_ACCOUNT_NAMES: Record<
    string,
    string
  > = {
    DEPOSIT: "Cash Deposit",
    WITHDRAWAL: "ATM Withdrawal",
    PLATFORM_FEE: "Platform Fee",
    TAX: "Tax",
    CASHBACK: "Cashback",
    DISCOUNT: "Discount",
    SUSPENSE: "Suspense Account",
  };

  // ---------------------------------------------------------
  // ACCOUNT DISPLAY NAME
  // ---------------------------------------------------------

  function getAccountName(
    account: {
      id: string;
      systemType: string | null;
      user: {
        id: string;
        name: string;
        email: string;
      } | null;
    },
  ) {
    if (account.systemType !== null) {
      return (
        SYSTEM_ACCOUNT_NAMES[
          account.systemType
        ] ??
        account.systemType
          .toLowerCase()
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) =>
            c.toUpperCase(),
          )
      );
    }

    return (
      account.user?.name ??
      "Unknown Account"
    );
  }

  // ---------------------------------------------------------
  // FORMAT TRANSACTIONS
  // ---------------------------------------------------------

  const formattedTransactions =
    transactions.map((transaction) => {
      const debits =
        transaction.ledgerEntries.filter(
          (entry) =>
            entry.direction === "DEBIT",
        );

      const credits =
        transaction.ledgerEntries.filter(
          (entry) =>
            entry.direction === "CREDIT",
        );

      // -----------------------------------------------------
      // MAIN FROM
      //
      // Prefer a USER account.
      // System accounts are fallback.
      // -----------------------------------------------------

      const mainFrom =
        debits.find(
          (entry) =>
            entry.account.systemType ===
            null,
        ) ??
        debits[0] ??
        null;

      // -----------------------------------------------------
      // MAIN TO
      //
      // Prefer a USER account.
      // System accounts are fallback.
      // -----------------------------------------------------

      const mainTo =
        credits.find(
          (entry) =>
            entry.account.systemType ===
            null,
        ) ??
        credits[0] ??
        null;

      // -----------------------------------------------------
      // ADDITIONAL ENTRIES
      //
      // Everything except the primary From / To.
      // These are what the dropdown will show.
      // -----------------------------------------------------

      const additionalEntries =
        transaction.ledgerEntries
          .filter(
            (entry) =>
              entry.id !==
                mainFrom?.id &&
              entry.id !==
                mainTo?.id,
          )
          .map((entry) => ({
            id: entry.id,

            accountId:
              entry.account.id,

            name: getAccountName(
              entry.account,
            ),

            email:
              entry.account.user
                ?.email ?? null,

            direction:
              entry.direction,

            amount:
              entry.amount,

            balanceAfter:
              entry.balanceAfter,

            isSystemAccount:
              entry.account.systemType !==
              null,
          }));

      // -----------------------------------------------------
      // MAIN FROM
      // -----------------------------------------------------

      const from = mainFrom
        ? {
            accountId:
              mainFrom.account.id,

            name: getAccountName(
              mainFrom.account,
            ),

            email:
              mainFrom.account.user
                ?.email ?? null,

            amount:
              mainFrom.amount,

            isSystemAccount:
              mainFrom.account.systemType !==
              null,
          }
        : null;

      // -----------------------------------------------------
      // MAIN TO
      // -----------------------------------------------------

      const to = mainTo
        ? {
            accountId:
              mainTo.account.id,

            name: getAccountName(
              mainTo.account,
            ),

            email:
              mainTo.account.user
                ?.email ?? null,

            amount:
              mainTo.amount,

            isSystemAccount:
              mainTo.account.systemType !==
              null,
          }
        : null;

      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      return {
        id: transaction.id,

        type: transaction.type,

        status: transaction.status,

        amount: transaction.amount,

        currency: transaction.currency,

        initiatorUserId:
          transaction.initiatorUserId,

        initiator:
          transaction.initiator,

        from,

        to,

        additionalEntries,

        lockingStrategy:
          transaction.lockingStrategy,

        reversalOfId:
          transaction.reversalOfId,

        failureReason:
          transaction.failureReason,

        createdAt:
          transaction.createdAt,

        updatedAt:
          transaction.updatedAt,

        ledgerEntryCount:
          transaction._count.ledgerEntries,

        eventCount:
          transaction._count.events,
      };
    });

  // ---------------------------------------------------------
  // RESPONSE
  // ---------------------------------------------------------

  return {
    transactions:
      formattedTransactions,

    pagination: {
      page,
      limit,
      total,
      totalPages:
        Math.ceil(total / limit),
    },
  };
}

export interface AdminTransactionEventFilters {
  page?: number;
  limit?: number;

  transactionId?: string;
  event?: TransactionEventType;

  from?: Date;
  to?: Date;

  order?: "asc" | "desc";
}

export async function getTransactionEventsForAdmin(
  filters: AdminTransactionEventFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(
    Math.max(filters.limit ?? 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const where: Prisma.TransactionEventWhereInput = {
    ...(filters.transactionId && {
      transactionId: filters.transactionId,
    }),

    ...(filters.event && {
      event: filters.event,
    }),

    ...((filters.from || filters.to) && {
      createdAt: {
        ...(filters.from && {
          gte: filters.from,
        }),

        ...(filters.to && {
          lte: filters.to,
        }),
      },
    }),
  };

  const [events, total] =
    await prisma.$transaction([
      prisma.transactionEvent.findMany({
        where,

        select: {
          id: true,
          transactionId: true,
          event: true,
          metadata: true,
          createdAt: true,

          transaction: {
            select: {
              type: true,
              status: true,
              amount: true,
              currency: true,
              initiatorUserId: true,
            },
          },
        },

        orderBy: [
          {
            createdAt: filters.order ?? "desc",
          },
          {
            id: filters.order ?? "desc",
          },
        ],

        skip,
        take: limit,
      }),

      prisma.transactionEvent.count({
        where,
      }),
    ]);

  return {
    events,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}