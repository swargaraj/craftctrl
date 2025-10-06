import type { User, UserResponse } from "../types/user";

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      camelToSnake(key).replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      ),
      value,
    ])
  );
}

export function sanitizeUser(user: User): UserResponse {
  const { passwordHash, twoFactorSecret, ...rest } = user;

  const sanitizedUser: Record<string, any> = {};

  for (const [key, value] of Object.entries(rest)) {
    sanitizedUser[key] = value instanceof Date ? value.toISOString() : value;
  }

  return sanitizedUser as UserResponse;
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return "An unknown error occurred";
  }
}
