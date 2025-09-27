export interface User {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
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
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: string[];
  currentNode: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// @ts-ignore
export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: string | (() => Promise<void>);
  updateCurrentNode: (node: string) => void;
}
