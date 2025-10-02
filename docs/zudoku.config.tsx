import type { ZudokuConfig } from "zudoku";

const config: ZudokuConfig = {
  metadata: {
    defaultTitle: "CraftCtrl Docs",
    applicationName: "CraftCtrl",
  },
  site: {
    showPoweredBy: false,
    title: "CraftCtrl Docs",
  },
  navigation: [
    {
      type: "category",
      label: "Documentation",
      icon: "book",
      items: [
        {
          type: "doc",
          label: "Introduction",
          file: "introduction",
        },
        {
          type: "category",
          label: "Getting Started",
          collapsible: false,
          items: [
            {
              type: "doc",
              label: "Installation",
              file: "installation",
            },
            {
              type: "doc",
              label: "Configuration",
              file: "installation",
            },
          ],
        },
        {
          type: "doc",
          label: "Setup Emails",
          file: "introduction",
        },
      ],
    },
    {
      type: "link",
      to: "/api",
      label: "API Reference",
      icon: "code",
    },
  ],
  redirects: [{ from: "/", to: "/introduction" }],
  search: {
    type: "pagefind",
  },
  apis: [
    {
      type: "url",
      input: "http://localhost:5575/docs/json",
      path: "/api",
    },
  ],
  theme: {
    light: {
      background: "oklch(100% 0 none)",
      foreground: "oklch(14.7% 0.004 49.3)",
      card: "oklch(100% 0 none)",
      cardForeground: "oklch(14.7% 0.004 49.3)",
      popover: "oklch(100% 0 none)",
      popoverForeground: "oklch(14.7% 0.004 49.3)",
      primary: "oklch(86% 0.173 91.8)",
      primaryForeground: "oklch(28.5% 0.064 53.8)",
      secondary: "oklch(97% 0.001 106)",
      secondaryForeground: "oklch(21.6% 0.006 56)",
      muted: "oklch(97% 0.001 106)",
      mutedForeground: "oklch(55.3% 0.012 58.1)",
      accent: "oklch(97% 0.001 106)",
      accentForeground: "oklch(21.6% 0.006 56)",
      destructive: "oklch(63.7% 0.208 25.3)",
      destructiveForeground: "oklch(98.5% 0.001 106)",
      border: "oklch(92.3% 0.003 48.7)",
      input: "oklch(92.3% 0.003 48.7)",
      ring: "oklch(14.7% 0.004 49.3)",
    },
    dark: {
      background: "oklch(14.7% 0.004 49.3)",
      foreground: "oklch(98.5% 0.001 106)",
      card: "oklch(14.7% 0.004 49.3)",
      cardForeground: "oklch(98.5% 0.001 106)",
      popover: "oklch(14.7% 0.004 49.3)",
      popoverForeground: "oklch(98.5% 0.001 106)",
      primary: "oklch(86% 0.173 91.8)",
      primaryForeground: "oklch(28.5% 0.064 53.8)",
      secondary: "oklch(26.9% 0.006 34.3)",
      secondaryForeground: "oklch(98.5% 0.001 106)",
      muted: "oklch(26.9% 0.006 34.3)",
      mutedForeground: "oklch(71.6% 0.009 56.3)",
      accent: "oklch(26.9% 0.006 34.3)",
      accentForeground: "oklch(98.5% 0.001 106)",
      destructive: "oklch(39.6% 0.133 25.7)",
      destructiveForeground: "oklch(98.5% 0.001 106)",
      border: "oklch(26.9% 0.006 34.3)",
      input: "oklch(26.9% 0.006 34.3)",
      ring: "oklch(55.4% 0.121 66.5)",
    },
  },
  //   TODO: Sitemaps
};

export default config;
