import {
    IconActivity,
  IconAdjustmentsHorizontal,
  IconBellCog,
  IconBrandDiscord,
  IconBrandGithub,
  IconCamera,
  IconDatabase,
  IconDatabaseImport,
  IconFileAi,
  IconFileDescription,
  IconFolder,
  IconLockCog,
  IconLogs,
  IconMenu3,
  IconPlug,
  IconServerCog,
  IconTerminal,
  IconUserCog,
  IconUsers,
  IconWorldCog,
} from "@tabler/icons-react";

export const navData = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconMenu3,
    },
    {
      title: "Logs",
      url: "/logs",
      icon: IconLogs,
    },
    {
      title: "Users",
      url: "/users",
      icon: IconUsers,
    },
  ],
  manage: [
    {
      name: "Overview",
      url: "/overview",
      icon: IconServerCog,
    },
    {
      name: "Console",
      url: "/console",
      icon: IconTerminal,
    },
    {
      name: "Configure",
      url: "/configure",
      icon: IconAdjustmentsHorizontal,
    },
    {
      name: "Players",
      url: "/players",
      icon: IconUserCog,
    },
    {
      name: "Files",
      url: "/files",
      icon: IconFolder,
    },
    {
      name: "Worlds",
      url: "/worlds",
      icon: IconWorldCog,
    },
    {
      name: "Plugins",
      url: "/plugins",
      icon: IconPlug,
    },
    {
      name: "Backups",
      url: "/backups",
      icon: IconDatabaseImport,
    },
    {
      name: "Access",
      url: "/access",
      icon: IconLockCog,
    },
    {
      name: "Alerts",
      url: "/alerts",
      icon: IconBellCog,
    },
    {
      name: "Activity",
      url: "/activity",
      icon: IconActivity,
    },
  ],
};
