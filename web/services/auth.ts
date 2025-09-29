import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginCredentials,
  TwoFAVerificationRequest,
} from "@/types/auth";
import { apiClient } from "@/lib/client";
import { storage } from "@/lib/storage";

export const AUTH_KEYS = {
  ACCESS_TOKEN: "ctrl_access_token",
  REFRESH_TOKEN: "ctrl_refresh_token",
  USER_DATA: "ctrl_user_data",
  CURRENT_NODE: "ctrl_current_node",
  SESSION_TOKEN: "ctrl_session_token",
};

class AuthService {
  private currentNode: string | null = null;

  constructor() {
    this.currentNode = storage.getItem(AUTH_KEYS.CURRENT_NODE);
  }

  setCurrentNode(node: string) {
    this.currentNode = node;
    storage.setItem(AUTH_KEYS.CURRENT_NODE, node);
  }

  getCurrentNode(): string | null {
    return this.currentNode || storage.getItem(AUTH_KEYS.CURRENT_NODE);
  }

  setSessionToken(token: string) {
    storage.setItem(AUTH_KEYS.SESSION_TOKEN, token);
  }

  getSessionToken(): string | null {
    return storage.getItem(AUTH_KEYS.SESSION_TOKEN);
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post(
        "/auth/login",
        {
          username: credentials.username,
          password: credentials.password,
        },
        this.normalizeNodeUrl(credentials.server)
      );

      if (response.success && response.data) {
        if (response.data.requires2FA) {
          this.setSessionToken(response.data.sessionToken);
          this.setCurrentNode(credentials.server);
          throw new Error("2FA_REQUIRED");
        }

        if (response.data.requiresPasswordChange) {
          this.setSessionToken(response.data.sessionToken);
          this.setCurrentNode(credentials.server);
          throw new Error("PASSWORD_CHANGE_REQUIRED");
        }

        this.setCurrentNode(credentials.server);
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        this.setUserData(response.data.user);
        return response.data;
      }

      throw new Error(response.error || "Login failed");
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "2FA_REQUIRED" ||
          error.message === "PASSWORD_CHANGE_REQUIRED")
      ) {
        throw error;
      }

      this.clearAuthData();
      throw error;
    }
  }

  async verify2FA(
    credentials: TwoFAVerificationRequest
  ): Promise<AuthResponse> {
    try {
      const sessionToken = this.getSessionToken();
      if (!sessionToken) {
        throw new Error("No active session found");
      }

      const response = await apiClient.post(
        "/auth/2fa/verify",
        {
          totpCode: credentials.totpCode,
          sessionToken: sessionToken,
        },
        this.normalizeNodeUrl(credentials.server)
      );

      if (response.success && response.data) {
        this.setTokens(response.data.accessToken, response.data.refreshToken);
        this.setUserData(response.data.user);
        storage.removeItem(AUTH_KEYS.SESSION_TOKEN);
        return response.data;
      }

      throw new Error(response.error || "2FA verification failed");
    } catch (error) {
      throw error;
    }
  }

  async requestPasswordReset(
    credentials: ForgotPasswordRequest
  ): Promise<void> {
    try {
      const response = await apiClient.post(
        "/auth/forgot-password",
        {
          username: credentials.username,
        },
        this.normalizeNodeUrl(credentials.server)
      );

      if (!response.success) {
        throw new Error(response.error || "Password reset request failed");
      }
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(
    token: string,
    newPassword: string,
    server: string
  ): Promise<void> {
    try {
      const response = await apiClient.post(
        "/auth/reset-password",
        {
          token,
          newPassword,
        },
        this.normalizeNodeUrl(server)
      );

      if (!response.success) {
        throw new Error(response.error || "Password reset failed");
      }
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    const currentNode = this.getCurrentNode();

    if (!refreshToken || !currentNode) {
      throw new Error("No refresh token or node available");
    }

    const response = await apiClient.post(
      "/auth/refresh",
      {
        refreshToken,
      },
      this.normalizeNodeUrl(currentNode)
    );

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      return response.data;
    }

    throw new Error("Token refresh failed");
  }

  async getCurrentUser() {
    const currentNode = this.getCurrentNode();
    const accessToken = this.getAccessToken();

    if (!currentNode || !accessToken) {
      return null;
    }

    try {
      const response = await apiClient.get(
        "/auth/me",
        this.normalizeNodeUrl(currentNode),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.success && response.data) {
        this.setUserData(response.data.user);
        return response.data;
      }
    } catch (error) {
      this.clearAuthData();
    }

    return null;
  }

  async logout() {
    const currentNode = this.getCurrentNode();
    const accessToken = this.getAccessToken();

    if (!currentNode || !accessToken) {
      return;
    }

    const response = await apiClient.post(
      "/auth/logout",
      {},
      this.normalizeNodeUrl(currentNode),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.success) {
      throw new Error("Failed to delete session");
    }

    this.clearAuthData();
  }

  private setTokens(accessToken: string, refreshToken: string) {
    storage.setItem(AUTH_KEYS.ACCESS_TOKEN, accessToken);
    storage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
  }

  private setUserData(user: any) {
    storage.setItem(AUTH_KEYS.USER_DATA, JSON.stringify(user));
  }

  getAccessToken(): string | null {
    return storage.getItem(AUTH_KEYS.ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return storage.getItem(AUTH_KEYS.REFRESH_TOKEN);
  }

  getUser(): any | null {
    const userData = storage.getItem(AUTH_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private clearAuthData() {
    storage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
    storage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
    storage.removeItem(AUTH_KEYS.USER_DATA);
    storage.removeItem(AUTH_KEYS.SESSION_TOKEN);
    this.currentNode = null;
  }

  private normalizeNodeUrl(node: string): string {
    node = node.endsWith("/") ? node.slice(0, -1) : node;

    if (node.startsWith("http://") || node.startsWith("https://")) {
      return node;
    }
    return `http://${node}`;
  }
}

export const authService = new AuthService();
