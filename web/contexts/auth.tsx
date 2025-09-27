"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import { AuthState, AuthContextType, LoginCredentials } from "@/types/auth";
import { authService } from "@/services/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: any }
  | { type: "LOGOUT" }
  | { type: "SET_NODE"; payload: string }
  | {
      type: "UPDATE_TOKENS";
      payload: { accessToken: string; refreshToken: string };
    };

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
        permissions: action.payload.permissions,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOGOUT":
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        permissions: [],
        currentNode: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case "SET_NODE":
      return { ...state, currentNode: action.payload };
    case "UPDATE_TOKENS":
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  permissions: [],
  currentNode: null,
  isAuthenticated: false,
  isLoading: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

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
              permissions: userData.permissions,
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
      }
    } catch (error) {
      authService.logout();
      dispatch({ type: "LOGOUT" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const authData = await authService.login(credentials);
      dispatch({ type: "LOGIN_SUCCESS", payload: authData });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: "LOGOUT" });
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
