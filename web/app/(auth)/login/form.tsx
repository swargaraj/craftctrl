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
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, Loader } from "lucide-react";
import { storage } from "@/lib/storage";
import { AUTH_KEYS } from "@/services/auth";

export default function LoginForm() {
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setServer(
      params.get("server") || storage.getItem(AUTH_KEYS.CURRENT_NODE) || ""
    );
    setUsername(params.get("username") || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login({ server, username, password });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium"
      >
        <h1 className="font-alt text-3xl font-[600]">CTRL</h1>
      </Link>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-medium">
              Login to Your Node
            </CardTitle>
            <CardDescription>
              Connect to your node to manage servers, monitor performance, and
              configure settings.
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

                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="server">Node Address</Label>
                    <Input
                      id="server"
                      type="text"
                      placeholder="192.168.1.5:5575 or https://node.example"
                      required
                      onChange={(e) => setServer(e.target.value)}
                      value={server}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="bob"
                      required
                      onChange={(e) => setUsername(e.target.value)}
                      value={username}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href={`/forgot?server=${server}&username=${username}`}
                        className="ml-auto text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      onChange={(e) => setPassword(e.target.value)}
                      value={password}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        Processing
                        <Loader className="animate-spin" />
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-muted-foreground text-center text-xs text-balance">
          This website doesn't store or save any data. Every request is sent
          directly to your own node, and nothing is kept on our servers.
        </div>
      </div>
    </div>
  );
}
