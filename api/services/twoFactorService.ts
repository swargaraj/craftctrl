import speakeasy from "speakeasy";
import { databaseService } from "./database";
import { AppError } from "../middlewares/error";

export class TwoFactorService {
  async setup2FA(userId: string): Promise<{ secret: string }> {
    const user = await databaseService.users.getUserById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.twoFactorEnabled || user.twoFactorSecret) {
      throw new AppError("2FA is already enabled", 400);
    }

    const secret = speakeasy.generateSecret({
      name: `@${user.username}`,
      issuer: "CraftCtrl",
    });

    await databaseService.users.updateUser(userId, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: true,
    });

    return {
      secret: secret.base32,
    };
  }

  async verify2FA(userId: string, totpCode: string): Promise<boolean> {
    const user = await databaseService.users.getUserById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new AppError("2FA not setup for user", 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: totpCode,
      window: 1,
    });

    return verified;
  }

  async enable2FA(userId: string, code: string): Promise<void> {
    const user = await databaseService.users.getUserById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new AppError("2FA not setup", 400);
    }

    const isValid = await this.verify2FA(userId, code);
    if (!isValid) {
      throw new AppError("Invalid verification code", 400);
    }

    await databaseService.users.updateUser(userId, {
      twoFactorEnabled: true,
    });
  }

  async disable2FA(userId: string, code: string): Promise<void> {
    const user = await databaseService.users.getUserById(userId);
    if (!user || !user.twoFactorEnabled) {
      throw new AppError("2FA is not enabled", 400);
    }

    const isValid = await this.verify2FA(userId, code);
    if (!isValid) {
      throw new AppError("Invalid verification code", 400);
    }

    await databaseService.users.updateUser(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
    });
  }

  async remove2FA(userId: string, code: string): Promise<void> {
    const user = await databaseService.users.getUserById(userId);
    if (!user || !user.twoFactorEnabled) {
      throw new AppError("2FA is not enabled", 400);
    }

    const isValid = await this.verify2FA(userId, code);
    if (!isValid) {
      throw new AppError("Invalid verification code", 400);
    }

    await databaseService.users.updateUser(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
    });
  }
}

export const twoFactorService = new TwoFactorService();
