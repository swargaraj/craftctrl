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
import Image from "next/image";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [server, setServer] = useState(() => searchParams.get("server") || "");
  const [username, setUsername] = useState(
    () => searchParams.get("username") || ""
  );
  const [password, setPassword] = useState("");

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium"
      >
        <Image
          src="/logo.png"
          alt="Logo"
          width={56}
          height={56}
          className="select-none"
        />
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
            <form>
              <div className="grid gap-6">
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="server">Node Address</Label>
                    <Input
                      id="server"
                      type="text"
                      placeholder="192.168.1.5"
                      required
                      onChange={(e) => setServer(e.target.value)}
                      value={server}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="email">Username</Label>
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
                        href={`/auth/forgot?server=${server}&username=${username}`}
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
                  <Button type="submit" className="w-full">
                    Login
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
