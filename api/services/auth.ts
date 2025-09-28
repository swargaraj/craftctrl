import jwt from "jsonwebtoken";
import { config } from "../config";
import { databaseService } from "./database";
import type {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  AccessTokenPayload,
  RefreshTokenPayload,
  UserSession,
  Verify2FARequest,
  LoginResponse,
} from "../types/user";
import { AppError } from "../middlewares/error";
import { twoFactorService } from "./twoFactorService";
import bcrypt from "bcryptjs";

export class AuthService {
  async login(
    credentials: LoginRequest,
    userAgent?: string,
    ipAddress?: string
  ): Promise<LoginResponse | AuthResponse> {
    const user = await databaseService.users.getUserByUsername(
      credentials.username
    );

    if (!user?.isActive) {
      throw new AppError("User not found or inactive", 401);
    }

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const bcrypt = require("bcryptjs");
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new AppError("Invalid credentials", 401);
    }

    if (user.changePassword) {
      const sessionToken = await authService.requestPasswordReset(
        user.username!
      );
      if (!sessionToken) {
        throw new AppError("Failed to request password reset", 500);
      }

      return {
        requiresPasswordChange: true,
        sessionToken,
      };
    }

    if (user.twoFactorEnabled) {
      const sessionToken = this.generateSessionToken(user.id, "2FA");

      await databaseService.sessions.createTempSession(
        sessionToken,
        user.id,
        "2FA",
        userAgent,
        ipAddress
      );

      return {
        requires2FA: true,
        sessionToken,
      } as LoginResponse;
    }

    return (await this.completeLogin(
      user,
      userAgent,
      ipAddress
    )) as AuthResponse;
  }

  async verify2FA(
    credentials: Verify2FARequest,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    const tempSession = await databaseService.sessions.getTempSession(
      credentials.sessionToken
    );

    if (!tempSession) {
      throw new AppError("Invalid or expired session", 401);
    }

    const user = await databaseService.users.getUserById(tempSession.userId);
    if (!user || !user.isActive) {
      throw new AppError("User not found or inactive", 401);
    }

    const isValid2FACode = await twoFactorService.verify2FA(
      user.id,
      credentials.totpCode
    );

    if (!isValid2FACode) {
      throw new AppError("Invalid 2FA code", 401);
    }

    await databaseService.sessions.deleteTempSession(credentials.sessionToken);

    return await this.completeLogin(user, userAgent, ipAddress);
  }

  private async completeLogin(
    user: User,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponse> {
    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await databaseService.sessions.createSession(
      sessionId,
      user.id,
      refreshToken,
      expiresAt,
      userAgent,
      ipAddress
    );

    const permissions = await databaseService.permissions.getUserPermissions(
      user.id
    );
    const accessToken = this.generateAccessToken(user, sessionId, permissions);
    const newRefreshToken = this.generateRefreshToken(sessionId, user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: user,
      permissions,
    };
  }

  private generateSessionToken(
    userId: string,
    type: "2FA" | "RECOVERY"
  ): string {
    const expiry = type === "2FA" ? 5 : 60;

    return jwt.sign(
      {
        userId,
        type: "session",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiry * 60, // 5 minutes
      },
      config.JWT_SECRET
    );
  }

  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        config.JWT_SECRET
      ) as RefreshTokenPayload;

      const session = await databaseService.sessions.getSession(
        decoded.sessionId
      );
      if (
        !session ||
        session.refreshToken !== refreshToken ||
        session.expiresAt < new Date()
      ) {
        throw new AppError("Invalid refresh token", 401);
      }

      const user = await databaseService.users.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError("User not found or inactive", 401);
      }

      const permissions = await databaseService.permissions.getUserPermissions(
        user.id
      );
      const accessToken = this.generateAccessToken(
        user,
        decoded.sessionId,
        permissions
      );
      const newRefreshToken = this.generateRefreshToken(session.id, user.id);

      await databaseService.sessions.updateSession(session.id, newRefreshToken);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new AppError("Invalid refresh token", 401);
    }
  }
  async requestPasswordReset(username: string): Promise<void | string> {
    const user = await databaseService.users.getUserByUsername(username);
    if (!user || !user.isActive) {
      return;
    }

    const token = await databaseService.recovery.createPasswordResetToken(
      user.id
    );

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await databaseService.recovery.getPasswordResetToken(
      token
    );
    if (!resetToken) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      config.BCRYPT_ROUNDS
    );

    await databaseService.users.updateUser(resetToken.user_id, {
      passwordHash: newPasswordHash,
      changePassword: false,
    });

    await databaseService.recovery.markPasswordResetTokenUsed(token);
    await databaseService.sessions.deleteAllUserSessions(resetToken.user_id);
  }

  async forcePasswordChange(userId: string): Promise<void> {
    await databaseService.users.updateUser(userId, {
      changePassword: true,
    });

    await databaseService.sessions.deleteAllUserSessions(userId);
  }

  async logout(sessionId: string): Promise<void> {
    await databaseService.sessions.deleteSession(sessionId);
  }

  async logoutAllSessions(userId: string, sessionId?: string): Promise<void> {
    await databaseService.sessions.deleteAllUserSessions(userId, sessionId);
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await databaseService.sessions.getUserSessions(userId);
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await databaseService.sessions.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      return false;
    }

    await databaseService.sessions.deleteSession(sessionId);
    return true;
  }

  private generateAccessToken(
    user: User,
    sessionId: string,
    permissions: string[]
  ): string {
    const payload: AccessTokenPayload = {
      userId: user.id,
      sessionId,
      username: user.username,
      permissions,
      isSuperAdmin: user.isSuperAdmin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };

    return jwt.sign(payload, config.JWT_SECRET);
  }

  private generateRefreshToken(sessionId: string, userId: string): string {
    const payload: RefreshTokenPayload = {
      sessionId,
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return jwt.sign(payload, config.JWT_SECRET);
  }
}

export const authService = new AuthService();
