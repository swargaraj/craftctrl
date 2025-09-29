"use client";

import { EtheralShadow } from "@/components/noise";
import { useAuth } from "@/contexts/auth";
import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthBase } from "./_components/base";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex w-full h-full justify-center items-center">
      <EtheralShadow
        color="rgba(128, 128, 128, 1)"
        animation={{ scale: 100, speed: 50 }}
        noise={{ opacity: 0.8, scale: 1.2 }}
        sizing="fill"
      >
        <div className="flex flex-col items-center w-full justify-center gap-6 p-6 md:p-10">
          <AuthBase>{children}</AuthBase>
        </div>
      </EtheralShadow>
    </div>
  );
}
