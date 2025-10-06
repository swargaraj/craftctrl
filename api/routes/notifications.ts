import type { FastifyPluginAsync } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

import { databaseService } from "../services/database";
import { requireAuth } from "../middlewares/auth";
import { AppError, errorSchema, schemaHeaders } from "../middlewares/error";

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/notifications",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Notification"],
        summary: "Get User Notifications",
        description:
          "Retrieve paginated notifications for the authenticated user.",
        querystring: Type.Object({
          page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          limit: Type.Optional(
            Type.Integer({ minimum: 1, maximum: 50, default: 25 })
          ),
          unreadOnly: Type.Optional(Type.Boolean({ default: false })),
          unreadCount: Type.Optional(Type.Boolean({ default: false })),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              notifications: Type.Array(
                Type.Object({
                  id: Type.String({ format: "uuid" }),
                  title: Type.String(),
                  message: Type.String(),
                  type: Type.Union([
                    Type.Literal("info"),
                    Type.Literal("warning"),
                    Type.Literal("error"),
                    Type.Literal("success"),
                  ]),
                  isRead: Type.Boolean(),
                  createdAt: Type.String({ format: "date-time" }),
                  readAt: Type.Optional(Type.String({ format: "date-time" })),
                })
              ),
              pagination: Type.Object({
                page: Type.Integer(),
                limit: Type.Integer(),
                total: Type.Integer(),
                unreadCount: Type.Integer(),
              }),
            }),
          }),
        },
        headers: schemaHeaders,
      },
    },
    async (request) => {
      const { page = 1, limit = 20, unreadOnly = false } = request.query;
      const offset = (page - 1) * limit;

      const notifications =
        await databaseService.notifications.getUserNotifications(
          request.user!.userId,
          limit,
          offset,
          unreadOnly
        );

      const unreadCount =
        await databaseService.notifications.getUnreadNotificationCount(
          request.user!.userId
        );

      return {
        success: true,
        data: {
          notifications: notifications.map((notification) => ({
            ...notification,
            createdAt: notification.createdAt.toISOString(),
            readAt: notification.readAt?.toISOString(),
          })),
          pagination: {
            page,
            limit,
            total: notifications.length,
            unreadCount,
          },
        },
      };
    }
  );

  server.patch(
    "/notifications/:id/read",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Notification"],
        summary: "Mark Notification as Read",
        description:
          "Mark a specific notification as read for the authenticated user.",
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "Notification ID" }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          ...errorSchema,
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Notification not found",
            }
          ),
        },
        headers: schemaHeaders,
      },
    },
    async (request) => {
      const { id } = request.params;

      const updated =
        await databaseService.notifications.markNotificationAsRead(
          id!,
          request.user!.userId
        );
      if (!updated) {
        throw new AppError("Notification not found", 404);
      }

      return {
        success: true,
        message: "Notification marked as read",
      };
    }
  );

  server.post(
    "/notifications/read-all",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Notification"],
        summary: "Mark All Notifications as Read",
        description:
          "Mark all unread notifications as read for the authenticated user.",
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
        headers: schemaHeaders,
      },
    },
    async (request) => {
      await databaseService.notifications.markAllNotificationsAsRead(
        request.user!.userId
      );

      return {
        success: true,
        message: "All notifications marked as read",
      };
    }
  );

  server.delete(
    "/notifications/:id",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Notification"],
        summary: "Delete Notification",
        description:
          "Permanently delete a specific notification for the authenticated user.",
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "Notification ID" }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Notification not found",
            }
          ),
        },
        headers: schemaHeaders,
      },
    },
    async (request) => {
      const { id } = request.params;

      const deleted = await databaseService.notifications.deleteNotification(
        id!,
        request.user!.userId
      );
      if (!deleted) {
        throw new AppError("Notification not found", 404);
      }

      return {
        success: true,
        message: "Notification deleted successfully",
      };
    }
  );
};

export default notificationRoutes;
