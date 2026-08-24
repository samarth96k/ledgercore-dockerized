import {
  Prisma,
  ReconciliationJobType,
  ReconciliationRunStatus,
} from "@prisma/client";

import { prisma } from "../../PrismaClient/prismaclient.js"; // adjust to your path


export interface AdminReconciliationFilters {
  page?: number;
  limit?: number;

  jobType?: ReconciliationJobType;
  status?: ReconciliationRunStatus;

  hasAnomalies?: boolean;

  from?: Date;
  to?: Date;

  order?: "asc" | "desc";
}


export async function getReconciliationRunsForAdmin(
  filters: AdminReconciliationFilters = {},
) {
  const page = Math.max(filters.page ?? 1, 1);

  const limit = Math.min(
    Math.max(filters.limit ?? 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const where: Prisma.ReconciliationRunWhereInput = {
    ...(filters.jobType && {
      jobType: filters.jobType,
    }),

    ...(filters.status && {
      status: filters.status,
    }),

    ...(filters.hasAnomalies !== undefined && {
      anomaliesFound: filters.hasAnomalies
        ? { gt: 0 }
        : 0,
    }),

    ...((filters.from || filters.to) && {
      startedAt: {
        ...(filters.from && {
          gte: filters.from,
        }),

        ...(filters.to && {
          lte: filters.to,
        }),
      },
    }),
  };

  const [runs, total] = await prisma.$transaction([
    prisma.reconciliationRun.findMany({
      where,

      select: {
        id: true,

        jobType: true,
        status: true,

        startedAt: true,
        completedAt: true,
        durationMs: true,

        itemsScanned: true,
        anomaliesFound: true,

        details: true,
        errorMessage: true,

        dryRun: true,
      },

      orderBy: [
        {
          startedAt: filters.order ?? "desc",
        },
        {
          id: filters.order ?? "desc",
        },
      ],

      skip,
      take: limit,
    }),

    prisma.reconciliationRun.count({
      where,
    }),
  ]);

  return {
    runs,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}