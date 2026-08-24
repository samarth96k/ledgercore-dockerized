import type {
  Request,
  Response,
} from "express";

import {
  ReconciliationJobType,
  ReconciliationRunStatus,
} from "@prisma/client";

import {
  getReconciliationRunsForAdmin,
} from "./reconciliation.database.js";

import {
  logger,
} from "../../common/config/logger.js";


export const getReconciliationRunsForAdminController =
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
      // JOB TYPE
      // ==========================================

      let jobType:
        | ReconciliationJobType
        | undefined;

      if (typeof req.query.jobType === "string") {
        if (
          !Object.values(
            ReconciliationJobType,
          ).includes(
            req.query.jobType as ReconciliationJobType,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid reconciliation job type.",
          });
        }

        jobType =
          req.query.jobType as ReconciliationJobType;
      }


      // ==========================================
      // STATUS
      // ==========================================

      let status:
        | ReconciliationRunStatus
        | undefined;

      if (typeof req.query.status === "string") {
        if (
          !Object.values(
            ReconciliationRunStatus,
          ).includes(
            req.query.status as ReconciliationRunStatus,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid reconciliation status.",
          });
        }

        status =
          req.query.status as ReconciliationRunStatus;
      }


      // ==========================================
      // HAS ANOMALIES
      // ==========================================

      let hasAnomalies:
        | boolean
        | undefined;

      if (
        typeof req.query.hasAnomalies === "string"
      ) {
        if (
          req.query.hasAnomalies !== "true" &&
          req.query.hasAnomalies !== "false"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "hasAnomalies must be true or false.",
          });
        }

        hasAnomalies =
          req.query.hasAnomalies === "true";
      }


      // ==========================================
      // DATE RANGE
      // ==========================================

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


      // ==========================================
      // ORDER
      // ==========================================

      const order: "asc" | "desc" =
        req.query.order === "asc"
          ? "asc"
          : "desc";


      // ==========================================
      // QUERY
      // ==========================================

      const result =
        await getReconciliationRunsForAdmin({
          page,
          limit,

          ...(jobType !== undefined && {
            jobType,
          }),

          ...(status !== undefined && {
            status,
          }),

          ...(hasAnomalies !== undefined && {
            hasAnomalies,
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

        runs: result.runs,

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