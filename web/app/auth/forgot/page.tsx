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

export default function ForgotPage() {
  const searchParams = useSearchParams();
  const [server, setServer] = useState(() => searchParams.get("server") || "");
  const [username, setUsername] = useState(
    () => searchParams.get("username") || ""
  );

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
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
                Reset Password
              </CardTitle>
              <CardDescription>
                Enter your username to receive a password reset link and regain
                access to your node.
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
                    <Button type="submit" className="w-full">
                      Send Email
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
    </div>
  );
}
