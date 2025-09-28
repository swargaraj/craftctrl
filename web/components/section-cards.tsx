import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCards() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Servers</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            12
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Players</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            34
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>CPU Usage</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            24%
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Memory Usage</CardDescription>
          <CardTitle className="text-2xl tabular-nums @[250px]/card:text-3xl">
            52%
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
