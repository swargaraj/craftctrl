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
import { CircleAlertIcon, CheckCircle2, Loader } from "lucide-react";
import { useAuth } from "@/contexts/auth";

export default function ForgotForm() {
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { requestPasswordReset, isLoading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setServer(params.get("server") || "");
    setUsername(params.get("username") || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await requestPasswordReset({ server, username });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-medium">Reset Password</CardTitle>
        <CardDescription>
          Enter your username to receive a password reset link and regain access
          to your node.
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
                If the user exists, a password reset link has been sent to the
                associated email address.
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
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    Sending
                    <Loader className="animate-spin size-4" />
                  </>
                ) : (
                  "Send Email"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
