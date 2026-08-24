import { Prisma,IdempotencyStatus } from "@prisma/client";
import { prisma } from "../../PrismaClient/prismaclient.js";
export async function getIdempotencyByKeyTx(
  tx: Prisma.TransactionClient,
  key: string,
) {
  return tx.idempotencyKey.findUnique({
    where: {
      key,
    },
  });
}

export async function createIdempotencyReservationTx(
  tx: Prisma.TransactionClient,
  key: string,
  requestHash: string,
  expiresAt: Date,
) {
  return tx.idempotencyKey.create({
    data: {
      key,
      requestHash,
      status: IdempotencyStatus.IN_PROGRESS,
      expiresAt,
    },
  });
}

export async function completeIdempotencyTx(
  tx: Prisma.TransactionClient,
  key: string,
  responseBody: Prisma.InputJsonValue,
) {
  return tx.idempotencyKey.updateMany({
    where: {
      key,
      status: IdempotencyStatus.IN_PROGRESS,
    },
    data: {
      status: IdempotencyStatus.COMPLETED,
      responseBody,
    },
  });
}

export async function failIdempotencyTx(
  tx: Prisma.TransactionClient,
  key: string,
) {
  return tx.idempotencyKey.updateMany({
    where: {
      key,
      status: IdempotencyStatus.IN_PROGRESS,
    },
    data: {
      status: IdempotencyStatus.FAILED,
    },
  });
}

export async function reclaimIdempotencyReservationTx(
  tx: Prisma.TransactionClient,
  key: string,
  requestHash: string,
  expiresAt: Date,
) {
  return tx.idempotencyKey.updateMany({
    where: {
      key,
      requestHash,
      OR: [
        {
          status: IdempotencyStatus.FAILED,
        },
        {
          status: IdempotencyStatus.IN_PROGRESS,
          expiresAt: {
            lt: new Date(),
          },
        },
      ],
    },
    data: {
  status: IdempotencyStatus.IN_PROGRESS,
  requestHash,
  expiresAt,
  responseBody: Prisma.JsonNull,
},
  });
}

export interface AdminIdempotencyFilters {
  page?: number;
  limit?: number;

  key?: string;
  status?: IdempotencyStatus;

  from?: Date;
  to?: Date;

  expired?: boolean;

  order?: "asc" | "desc";
}


export async function getIdempotencyKeysForAdmin(
  filters: AdminIdempotencyFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(
    Math.max(filters.limit ?? 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const now = new Date();

  const where: Prisma.IdempotencyKeyWhereInput = {
    ...(filters.key && {
      key: filters.key,
    }),

    ...(filters.status && {
      status: filters.status,
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

    ...(filters.expired !== undefined && {
      expiresAt: filters.expired
        ? {
            lt: now,
          }
        : {
            gte: now,
          },
    }),
  };

  const [keys, total] =
    await prisma.$transaction([
      prisma.idempotencyKey.findMany({
        where,

        select: {
          key: true,
          requestHash: true,
          responseBody: true,
          status: true,
          createdAt: true,
          expiresAt: true,
        },

        orderBy: [
          {
            createdAt:
              filters.order ?? "desc",
          },
          {
            key:
              filters.order ?? "desc",
          },
        ],

        skip,
        take: limit,
      }),

      prisma.idempotencyKey.count({
        where,
      }),
    ]);

  return {
    keys,

    pagination: {
      page,
      limit,
      total,
      totalPages:
        Math.ceil(total / limit),
    },
  };
}