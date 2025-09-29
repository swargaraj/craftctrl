import Link from "next/link";

export function AuthBase({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium"
      >
        <h1 className="font-alt text-3xl font-[600]">CTRL</h1>
      </Link>
      <div className="flex flex-col gap-6">
        {children}
        <div className="text-muted-foreground text-center text-xs text-balance">
          This website doesn't store or save any data. Every request is sent
          directly to your own node, and nothing is kept on our servers.
        </div>
      </div>
    </div>
  );
}
