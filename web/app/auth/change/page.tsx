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

export default function ChangePage() {
  const searchParams = useSearchParams();
  const [server, setServer] = useState(() => searchParams.get("server") || "");

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
                Set New Password
              </CardTitle>
              <CardDescription>
                Create a new password to continue managing your node.
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
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Change Password
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
