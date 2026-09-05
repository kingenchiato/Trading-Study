import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NEXORA | Online Training by Sガンダム",
    template: "%s | NEXORA",
  },
  description:
    "NEXORA is a revenue-ready online training platform with courses, live workshops, subscriptions, and certificates. Founded by Sガンダム in Japan.",
  icons: {
    icon: [{ url: "/admin-avatar.png?v=sgundam", type: "image/png" }],
    apple: [{ url: "/admin-avatar.png?v=sgundam", type: "image/png" }],
    shortcut: "/admin-avatar.png?v=sgundam",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-ink-950 bg-aurora antialiased">{children}</body>
    </html>
  );
}
