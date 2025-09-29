"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import {
  AuthState,
  AuthContextType,
  LoginCredentials,
  TwoFAVerificationRequest,
  ForgotPasswordRequest,
} from "@/types/auth";
import { apiClient } from "@/lib/client";
import { storage } from "@/lib/storage";
import { useRouter } from "next/navigation";

const AUTH_KEYS = {
  ACCESS_TOKEN: "ctrl_access_token",
  REFRESH_TOKEN: "ctrl_refresh_token",
  USER_DATA: "ctrl_user_data",
  CURRENT_NODE: "ctrl_current_node",
  SESSION_TOKEN: "ctrl_session_token",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: any }
  | { type: "LOGOUT" }
  | { type: "SET_NODE"; payload: string }
  | {
      type: "UPDATE_TOKENS";
      payload: { accessToken: string; refreshToken: string };
    }
  | { type: "INITIALIZED" }
  | { type: "SET_SESSION_TOKEN"; payload: string };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      };
    case "LOGOUT":
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        currentNode: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      };
    case "SET_NODE":
      return { ...state, currentNode: action.payload };
    case "UPDATE_TOKENS":
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case "INITIALIZED":
      return { ...state, isInitialized: true };
    case "SET_SESSION_TOKEN":
      return { ...state, sessionToken: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  currentNode: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
};

class AuthService {
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

  getCurrentNode(): string | null {
    return storage.getItem(AUTH_KEYS.CURRENT_NODE);
  }

  setCurrentNode(node: string) {
    storage.setItem(AUTH_KEYS.CURRENT_NODE, node);
  }

  getSessionToken(): string | null {
    return storage.getItem(AUTH_KEYS.SESSION_TOKEN);
  }

  setSessionToken(token: string) {
    storage.setItem(AUTH_KEYS.SESSION_TOKEN, token);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  private clearAuthData() {
    storage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
    storage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
    storage.removeItem(AUTH_KEYS.USER_DATA);
    storage.removeItem(AUTH_KEYS.SESSION_TOKEN);
  }

  private normalizeNodeUrl(node: string): string {
    node = node.endsWith("/") ? node.slice(0, -1) : node;

    if (node.startsWith("http://") || node.startsWith("https://")) {
      return node;
    }
    return `http://${node}`;
  }

  async login(credentials: LoginCredentials): Promise<any> {
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
  }

  async verify2FA(credentials: TwoFAVerificationRequest): Promise<any> {
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
  }

  async requestPasswordReset(
    credentials: ForgotPasswordRequest
  ): Promise<void> {
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
  }

  async resetPassword(
    token: string,
    newPassword: string,
    server: string
  ): Promise<void> {
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

    if (currentNode && accessToken) {
      try {
        await apiClient.post(
          "/auth/logout",
          {},
          this.normalizeNodeUrl(currentNode),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }

    this.clearAuthData();
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
  const authService = new AuthService();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        if (userData) {
          dispatch({
            type: "LOGIN_SUCCESS",
            payload: {
              user: userData.user,
              accessToken: authService.getAccessToken(),
              refreshToken: authService.getRefreshToken(),
            },
          });
          dispatch({
            type: "SET_NODE",
            payload: authService.getCurrentNode() || "",
          });
        } else {
          authService.logout();
          dispatch({ type: "LOGOUT" });
        }
      } else {
        const sessionToken = authService.getSessionToken();
        const currentNode = authService.getCurrentNode();
        if (sessionToken && currentNode) {
          dispatch({ type: "SET_SESSION_TOKEN", payload: sessionToken });
          dispatch({ type: "SET_NODE", payload: currentNode });
        }
        dispatch({ type: "LOGOUT" });
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      authService.logout();
      dispatch({ type: "LOGOUT" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      if (!state.isInitialized) {
        dispatch({ type: "INITIALIZED" });
      }
    }
  };

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const authData = await authService.login(credentials);
      dispatch({ type: "LOGIN_SUCCESS", payload: authData });
      return authData;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });

      if (error instanceof Error) {
        if (error.message === "2FA_REQUIRED") {
          dispatch({
            type: "SET_SESSION_TOKEN",
            payload: authService.getSessionToken()!,
          });
          dispatch({ type: "SET_NODE", payload: credentials.server });
        } else if (error.message === "PASSWORD_CHANGE_REQUIRED") {
          dispatch({
            type: "SET_SESSION_TOKEN",
            payload: authService.getSessionToken()!,
          });
          dispatch({ type: "SET_NODE", payload: credentials.server });
        }
      }

      if (!state.isInitialized) {
        dispatch({ type: "INITIALIZED" });
      }
      throw error;
    }
  };

  const verify2FA = async (credentials: TwoFAVerificationRequest) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const authData = await authService.verify2FA(credentials);
      dispatch({ type: "LOGIN_SUCCESS", payload: authData });
      return authData;
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const requestPasswordReset = async (credentials: ForgotPasswordRequest) => {
    try {
      await authService.requestPasswordReset(credentials);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (
    token: string,
    newPassword: string,
    server: string
  ) => {
    try {
      await authService.resetPassword(token, newPassword, server);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: "LOGOUT" });
    router.push("/login");
  };

  const refreshToken = async () => {
    try {
      const tokens = await authService.refreshToken();
      dispatch({ type: "UPDATE_TOKENS", payload: tokens });
    } catch (error) {
      logout();
      throw error;
    }
  };

  const updateCurrentNode = (node: string) => {
    authService.setCurrentNode(node);
    dispatch({ type: "SET_NODE", payload: node });
  };

  const value: AuthContextType = {
    ...state,
    login,
    verify2FA,
    requestPasswordReset,
    resetPassword,
    logout,
    refreshToken,
    updateCurrentNode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
