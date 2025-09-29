"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CircleAlertIcon,
  CheckCircle2,
  Loader,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";

export default function ChangeForm() {
  const [server, setServer] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const params = useParams();
  const router = useRouter();
  const { resetPassword, isLoading } = useAuth();

  const token = params.token as string;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setServer(params.get("server") || "");
  }, []);

  const validateForm = (): boolean => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (!server) {
      setError("Node address is required");
      return false;
    }

    if (!token) {
      setError("Invalid reset token");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    try {
      await resetPassword(token, password, server);
      setSuccess(true);

      setTimeout(() => {
        router.push(`/login?server=${server}`);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <CircleAlertIcon className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Invalid Reset Link</h3>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/forgot")}
            >
              Request New Reset Link
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-medium">Set New Password</CardTitle>
        <CardDescription>
          Password must be at least 6 characters long
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm text-left gap-1 px-4 py-3 flex items-center rounded-md">
                <CircleAlertIcon className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-300/20 text-sm text-left gap-1 px-4 py-3 flex items-center rounded-md">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                Password reset successfully. You will be redirected to the login
                page in 3 seconds.
              </div>
            )}

            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="server">Node Address</Label>
                <Input
                  id="server"
                  type="text"
                  placeholder="192.168.1.5:5575 or https://node.example"
                  required
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  disabled={isLoading || success}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || success}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || success}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || success}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || success}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || success}
              >
                {isLoading ? (
                  <>
                    Resetting Password
                    <Loader className="animate-spin size-4" />
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
