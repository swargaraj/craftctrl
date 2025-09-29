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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import Link from "next/link";
import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, Loader } from "lucide-react";
import { useAuth } from "@/contexts/auth";

export default function TwoFAForm() {
  const [server, setServer] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();
  const { verify2FA, sessionToken, isLoading, isInitialized } =
    useAuth();

  useEffect(() => {
    if (!sessionToken && isInitialized) {
      router.push("/login");
    }
  }, [sessionToken, isInitialized, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setServer(params.get("server") || "");
  }, []);

  useEffect(() => {
    if (code.length === 6 && !isLoading) {
      handleSubmit(new Event("submit") as any);
    }
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      await verify2FA({
        server,
        totpCode: code,
        sessionToken: "",
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "2FA verification failed. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-medium">
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app to continue.
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
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="2fa-code">2FA Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={code}
                    onChange={setCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    Verifying
                    <Loader className="animate-spin size-4" />
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
