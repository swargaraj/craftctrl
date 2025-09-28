import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Dashboard</h1>
        <div className="ml-auto flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="relative size-3 flex items-center justify-center">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
              <span className="relative inline-block size-2 rounded-full bg-emerald-500"></span>
            </div>
            All servers are operational
          </div>
          {/* <div className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-amber-500" />
            Some services experiencing issues
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-gray-500" />
            Servers currently offline
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-red-500" />
            Critical failures detected
          </div> */}
        </div>
      </div>
    </header>
  );
}
