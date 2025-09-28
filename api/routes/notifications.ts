import type { FastifyPluginAsync } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

import { databaseService } from "../services/database";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/error";

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/notifications",
    {
      preHandler: requireAuth(),
      schema: {
        querystring: Type.Object({
          page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          limit: Type.Optional(
            Type.Integer({ minimum: 1, maximum: 50, default: 25 })
          ),
          unreadOnly: Type.Optional(Type.Boolean({ default: false })),
          unreadCount: Type.Optional(Type.Boolean({ default: false })),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              notifications: Type.Array(
                Type.Object({
                  id: Type.String(),
                  title: Type.String(),
                  message: Type.String(),
                  type: Type.Union([
                    Type.Literal("info"),
                    Type.Literal("warning"),
                    Type.Literal("error"),
                    Type.Literal("success"),
                  ]),
                  isRead: Type.Boolean(),
                  createdAt: Type.String(),
                  readAt: Type.Optional(Type.String()),
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
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
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
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
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
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
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
