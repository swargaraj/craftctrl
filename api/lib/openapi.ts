import { config } from "../config";

export const openapiConfig = {
  info: {
    title: "Node API",
    description: "API documentation for CraftCtrl Node Server",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:" + config.PORT,
      description: "Local server",
    },
    {
      url: "http://0.0.0.0:" + config.PORT,
      description: "Local server",
    },
  ],
  "x-tagGroups": [
    {
      name: "Authentication",
      tags: [
        "Session Management",
        "Two-Factor Authentication",
        "Password Management",
      ],
    },
    {
      name: "Users",
      tags: [
        "User Management",
        "User Status Management",
        "Server Permissions Management",
      ],
    },
  ],
  tags: [
    {
      name: "Session Management",
      description:
        "Endpoints for logging in, logging out, viewing active sessions, and managing session lifecycle.",
    },
    {
      name: "Two-Factor Authentication",
      description:
        "Endpoints for setting up, verifying, enabling, disabling, and removing two-factor authentication for enhanced account security.",
    },
    {
      name: "Password Management",
      description:
        "Endpoints for recovering, resetting, and updating user passwords securely.",
    },
    {
      name: "User Management",
      description:
        "Endpoints for creating, updating, and deleting user accounts.",
    },
    {
      name: "User Status Management",
      description: "Endpoints for managing user status.",
    },
    {
      name: "Server Permissions Management",
      description: "Endpoints for managing server permissions for users.",
    },
    {
      name: "Notification",
      description: "Endpoints for managing user notifications.",
    },
  ],
};
