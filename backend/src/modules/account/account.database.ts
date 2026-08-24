import { prisma } from "../../PrismaClient/prismaclient.js";

import { AccountType, AccountStatus, SystemAccountType,Prisma } from "@prisma/client";

export async function createAccount(
  type: AccountType = AccountType.USER_WALLET,
  currency: string = "INR",
  status: AccountStatus = AccountStatus.ACTIVE,
  aadhaarNumber:string,
  systemType?: SystemAccountType,
) {
  if (type === AccountType.SYSTEM && !systemType) {
  throw new Error("System accounts must specify a system type.");
}

if (type === AccountType.USER_WALLET && systemType) {
  throw new Error("User wallet accounts cannot have a system type.");
}
  return await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        type,
        currency,
        status,
        systemType: systemType ?? null,
        aadhaarNumber
      },
    });

    await tx.accountBalance.create({
      data: {
        accountId: account.id,
        cachedBalance: BigInt(0),
        lastLedgerEntryId: null,
      },
    });

    return account;
  });
}

export async function getAccountByIdTx(
  tx: Prisma.TransactionClient,
  accountId: string,
) {
  return tx.account.findUnique({
    where: {
      id: accountId,
    },
    include: {
      balance: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getAccountByUserIdTx(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  return tx.account.findFirst({
    where: {
      userId,
    },
    include: {
      balance: true,
    },
  });
}

export async function updateAccountStatus(
  accountId: string,
  status: AccountStatus,
) {
  return prisma.account.update({
    where: {
      id: accountId,
    },
    data: {
      status,
    },
  });
}

export async function getBalanceByAccountId(accountId: string) {
  return prisma.accountBalance.findUnique({
    where: {
      accountId,
    },
  });
}

export async function updateCachedBalance(
  accountId: string,
  cachedBalance: bigint,
  lastLedgerEntryId: string|null,
) {
  return prisma.accountBalance.update({
    where: {
      accountId,
    },
    data: {
      cachedBalance,
      lastLedgerEntryId,
    },
  });
}



//wrapper functions for public api (admin here)
export async function getAccountByUserId(
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    return getAccountByUserIdTx(tx, userId);
  });
}

export async function getAccountById(
  accountId: string,
) {
  return prisma.$transaction(async (tx) => {
    return getAccountByIdTx(tx, accountId);
  });
}

export interface AdminAccountFilters {
  page?: number;
  limit?: number;

  accountId?: string;
  status?: AccountStatus;
  type?: AccountType;

  from?: Date;
  to?: Date;

  sortBy?: "createdAt";
  order?: "asc" | "desc";
}

export async function getAccountsForAdmin(
  filters: AdminAccountFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(
    Math.max(filters.limit ?? 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const where: Prisma.AccountWhereInput = {
    ...(filters.accountId && {
      id: filters.accountId,
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

  const [accounts, total] = await prisma.$transaction([
    prisma.account.findMany({
      where,

      select: {
        id: true,
        type: true,
        systemType: true,
        currency: true,
        status: true,
        version: true,
        createdAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        balance: {
          select: {
            cachedBalance: true,
            lastLedgerEntryId: true,
            updatedAt: true,
          },
        },
      },

      orderBy: {
        createdAt: filters.order ?? "desc",
      },

      skip,
      take: limit,
    }),

    prisma.account.count({
      where,
    }),
  ]);

  return {
    accounts,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAccountSearchIndexForAdmin() {
  return prisma.account.findMany({
    select: {
      id: true,

      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}