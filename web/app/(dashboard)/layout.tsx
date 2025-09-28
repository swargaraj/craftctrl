"use client";

import { useAuth } from "@/contexts/auth";
import { Loader } from "lucide-react";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user, logout, accessToken } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="size-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Authenticating
        </span>
      </div>
    );
  }

  if (!isLoading && user) {
    return <>{children}</>;
  } else {
    logout();
  }
}
