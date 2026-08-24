
import type {
  Request,
  Response,
} from "express";

import {
  IdempotencyStatus,
} from "@prisma/client";

import {
  getIdempotencyKeysForAdmin,
} from "./idempotency.database.js";

import {
  logger,
} from "../../common/config/logger.js";
export const getIdempotencyKeysForAdminController =
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

      // ------------------------------------------
      // STATUS
      // ------------------------------------------

      let status:
        | IdempotencyStatus
        | undefined;

      if (
        typeof req.query.status === "string"
      ) {
        if (
          !Object.values(
            IdempotencyStatus,
          ).includes(
            req.query
              .status as IdempotencyStatus,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid idempotency status.",
          });
        }

        status =
          req.query
            .status as IdempotencyStatus;
      }

      // ------------------------------------------
      // KEY
      // ------------------------------------------

      const key =
        typeof req.query.key === "string"
          ? req.query.key
          : undefined;

      // ------------------------------------------
      // EXPIRED
      // ------------------------------------------

      let expired:
        | boolean
        | undefined;

      if (
        typeof req.query.expired === "string"
      ) {
        if (
          req.query.expired !== "true" &&
          req.query.expired !== "false"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "expired must be true or false.",
          });
        }

        expired =
          req.query.expired === "true";
      }

      // ------------------------------------------
      // DATE RANGE
      // ------------------------------------------

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

      const result =
        await getIdempotencyKeysForAdmin({
          page,
          limit,

          ...(key !== undefined && {
            key,
          }),

          ...(status !== undefined && {
            status,
          }),

          ...(expired !== undefined && {
            expired,
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
        keys: result.keys,
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