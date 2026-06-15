import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Settings"
        description="Manage your organization and account preferences"
      />
      <SettingsClient />
    </div>
  );
}
