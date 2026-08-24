import { prisma } from "../../PrismaClient/prismaclient.js";
import {
  Prisma,
  TransactionEventType,
  EntryType,
  AccountStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import type {
  LedgerEntryCreateInput,
  UpdatedBalance,
  PreparedJournal,
  PostJournalRequest,
  LockedAccount,
} from "./ledger.types.js";

//read
export async function getLedgerEntriesByTransactionId(transactionId: string) {
  return prisma.ledgerEntry.findMany({
    where: {
      transactionId,
    },
    include: {
      account: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getLedgerEntriesByAccountId(accountId: string) {
  return prisma.ledgerEntry.findMany({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getLatestLedgerEntry(accountId: string) {
  return prisma.ledgerEntry.findFirst({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

const SYSTEM_ACCOUNT_NAMES: Record<string, string> = {
  DEPOSIT: "Cash Deposit",
  WITHDRAWAL: "ATM Withdrawal",
  PLATFORM_FEE: "Platform Fee",
  TAX: "Tax",
  CASHBACK: "Cashback",
  DISCOUNT: "Discount",
  SUSPENSE: "Suspense Account",
};
//write and update - uses tx

export async function createLedgerEntries(
  tx: Prisma.TransactionClient,
  entries: LedgerEntryCreateInput[],
) {
  const createdEntries = [];

  for (const entry of entries) {
    const createdEntry = await tx.ledgerEntry.create({
      data: {
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        direction: entry.entryType,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
      },
    });

    createdEntries.push(createdEntry);
  }

  return createdEntries;
}

export async function loadAndLockAccounts(
  tx: Prisma.TransactionClient,
  accountIds: string[],
) {
  const uniqueSortedIds = [...new Set(accountIds)].sort();

  return tx.$queryRaw<LockedAccount[]>`
    SELECT
      a.id AS "accountId",
      a.status,
      a.currency,
      a.version,
      a."type" AS "accountType",
      ab."cachedBalance" AS "cachedBalance",
      ab."lastLedgerEntryId" AS "lastLedgerEntryId",
      ab."updatedAt" AS "updatedAt"

    FROM accounts a
    INNER JOIN account_balances ab
      ON a.id = ab."accountId"

    WHERE a.id = ANY(${uniqueSortedIds}::uuid[])

    ORDER BY a.id

    FOR UPDATE
  `;
}

export async function updateAccountBalances(
  tx: Prisma.TransactionClient,
  balances: {
    accountId: string;
    cachedBalance: bigint;
    lastLedgerEntryId?: string;
  }[],
) {
  for (const balance of balances) {
    const data: Prisma.AccountBalanceUpdateInput = {
      cachedBalance: balance.cachedBalance,
    };

    if (balance.lastLedgerEntryId !== undefined) {
      data.lastLedgerEntryId = balance.lastLedgerEntryId;
    }

    await tx.accountBalance.update({
      where: {
        accountId: balance.accountId,
      },
      data,
    });
  }
}

export interface MyTransactionsFilters {
  page?: number;
  limit?: number;

  direction?: EntryType;
  status?: TransactionStatus;
  type?: TransactionType;

  from?: Date;
  to?: Date;
}

export async function getMyTransactions(
  accountId: string,
  filters: MyTransactionsFilters = {},
) {
  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

  const skip = (page - 1) * limit;

  // ---------------------------------------------------------
  // FILTERS
  // ---------------------------------------------------------

  const where: Prisma.LedgerEntryWhereInput = {
    accountId,

    ...(filters.direction && {
      direction: filters.direction,
    }),

    ...(filters.status && {
      transaction: {
        status: filters.status,
      },
    }),

    ...(filters.type && {
      transaction: {
        ...(filters.status && {
          status: filters.status,
        }),

        type: filters.type,
      },
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
  // QUERY + COUNT
  // ---------------------------------------------------------

  const [entries, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where,

      select: {
        id: true,
        transactionId: true,
        accountId: true,
        direction: true,
        amount: true,
        balanceAfter: true,
        createdAt: true,

        transaction: {
          select: {
            id: true,
            type: true,
            status: true,
            currency: true,
            failureReason: true,
            createdAt: true,
            updatedAt: true,

            ledgerEntries: {
              select: {
                id: true,
                accountId: true,
                direction: true,
                amount: true,

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
            },
          },
        },
      },

      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],

      skip,
      take: limit,
    }),

    prisma.ledgerEntry.count({
      where,
    }),
  ]);

  // ---------------------------------------------------------
  // FORMAT USER TRANSACTIONS
  // ---------------------------------------------------------

  const groupedTransactions = entries.map((entry) => {
    const rows = [];

    for (const ledger of entry.transaction.ledgerEntries) {
      // Never show the user's own ledger entry.
      if (ledger.id === entry.id) {
        continue;
      }

      const systemAccountType = ledger.account.systemType;

      const isSystemAccount = systemAccountType != null;

      const isSelfTransfer = ledger.accountId === entry.accountId;

      // -----------------------------------------------------
      // USER RECEIVED MONEY
      // -----------------------------------------------------
      //
      // Example:
      //
      // Sender       DEBIT   1.23
      // User         CREDIT  0.95
      // Fee Revenue  CREDIT  0.10
      // Treasury     CREDIT  0.18
      //
      // User should see ONLY:
      //
      // Sender       +0.95
      //
      // The fee/tax accounts are hidden because the user
      // did not pay those charges.
      // -----------------------------------------------------

      if (
        entry.direction === "CREDIT" &&
        isSystemAccount &&
        systemAccountType !== "DEPOSIT"
      ) {
        continue;
      }

      // -----------------------------------------------------
      // DETERMINE DISPLAY NAME
      // -----------------------------------------------------

      let name: string;

      if (isSelfTransfer) {
        name = "Self Transfer";
      } else if (isSystemAccount) {
        name =
          SYSTEM_ACCOUNT_NAMES[systemAccountType!] ??
          systemAccountType!
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
      } else {
        name = ledger.account.user?.name ?? "Unknown";
      }

      // -----------------------------------------------------
      // ADD DISPLAY ROW
      // -----------------------------------------------------

      rows.push({
        name,

        accountId: isSystemAccount ? null : ledger.account.id,

        isSystemAccount,

        // Sign is always from the user's perspective.
        direction: entry.direction,

        // Amount belongs to the actual counterparty
        // ledger posting.
        amount: ledger.amount,
      });
    }

    return {
      transactionId: entry.transactionId,

      date: entry.createdAt,

      type: entry.transaction.type,

      status: entry.transaction.status,

      currency: entry.transaction.currency,

      failureReason: entry.transaction.failureReason,

      balanceAfter: entry.balanceAfter,

      rows,
    };
  });

  // ---------------------------------------------------------
  // RESPONSE
  // ---------------------------------------------------------

  return {
    entries: groupedTransactions,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface AdminLedgerFilters {
  page?: number;
  limit?: number;

  accountId?: string;
  transactionId?: string;
  direction?: EntryType;

  from?: Date;
  to?: Date;

  order?: "asc" | "desc";
}

export async function getLedgerEntriesForAdmin(
  filters: AdminLedgerFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

  const skip = (page - 1) * limit;

  const where: Prisma.LedgerEntryWhereInput = {
    ...(filters.accountId && {
      accountId: filters.accountId,
    }),

    ...(filters.transactionId && {
      transactionId: filters.transactionId,
    }),

    ...(filters.direction && {
      direction: filters.direction,
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

  const [entries, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where,

      select: {
        id: true,
        transactionId: true,
        accountId: true,

        direction: true,

        amount: true,
        balanceAfter: true,

        createdAt: true,

        // Useful information without another request
        transaction: {
          select: {
            type: true,
            status: true,
            currency: true,
          },
        },

        account: {
          select: {
            type: true,
            systemType: true,
            status: true,

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

    prisma.ledgerEntry.count({
      where,
    }),
  ]);

  return {
    entries,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function toTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
