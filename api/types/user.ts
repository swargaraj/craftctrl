export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  changePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserResponse = Omit<
  User,
  "passwordHash" | "twoFactorSecret" | "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export interface UserSession {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface SessionInfo {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export type ResourceType = "user" | "server" | "server_group";
export type ActionType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "start"
  | "stop"
  | "restart"
  | "console"
  | "logs";

export interface Permission {
  id: string;
  name: string;
  resource: ResourceType;
  action: ActionType;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: Permission[];
  createdAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface ServerPermission {
  id: string;
  userId: string;
  serverId: string;
  permissions: ActionType[];
  grantedAt: Date;
  grantedBy: string;
}

export interface ServerGroup {
  id: string;
  name: string;
  description: string;
  serverIds: string[];
  createdAt: Date;
}

export interface GroupPermission {
  id: string;
  userId: string;
  groupId: string;
  permissions: ActionType[];
  grantedAt: Date;
  grantedBy: string;
}

export interface AccessTokenPayload {
  userId: string;
  sessionId: string;
  username: string;
  permissions: string[];
  isSuperAdmin: boolean;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sessionId: string;
  userId: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface Verify2FARequest {
  username: string;
  totpCode: string;
  sessionToken: string;
}

export interface Setup2FAResponse {
  secret: string;
}

export interface LoginResponse {
  requires2FA?: boolean;
  requiresPasswordChange?: boolean;
  sessionToken?: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  isActive?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface ListUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListUsersResult {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
