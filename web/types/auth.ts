export interface User {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  changePassword: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  permissions: string[];
}

export interface LoginCredentials {
  server: string;
  username: string;
  password: string;
}

export interface AuthState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentNode: string | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface AuthContextType extends Omit<AuthState, "refreshToken"> {
  login: (credentials: LoginCredentials) => Promise<any>;
  verify2FA: (credentials: TwoFAVerificationRequest) => Promise<any>;
  requestPasswordReset: (credentials: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (
    token: string,
    newPassword: string,
    server: string
  ) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateCurrentNode: (node: string) => void;
}

export interface TwoFAVerificationRequest {
  server: string;
  sessionToken: string;
  totpCode: string;
}

export interface ForgotPasswordRequest {
  server: string;
  username: string;
}
