import { EtheralShadow } from "@/components/noise";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full h-[40rem] justify-center items-center">
      <EtheralShadow
        color="rgba(128, 128, 128, 1)"
        animation={{ scale: 100, speed: 50 }}
        noise={{ opacity: 0.8, scale: 1.2 }}
        sizing="fill"
      >
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
          {children}
        </div>
      </EtheralShadow>
    </div>
  );
}
