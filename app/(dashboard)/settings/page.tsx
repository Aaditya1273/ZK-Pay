"use client"

import { ProviderSettings } from "@/components/settings/ProviderSettings"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your API keys and deployment preferences.</p>
      </div>
      
      <ProviderSettings />
      
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-lg border-b pb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Dark Mode</Label>
            <p className="text-sm text-muted-foreground">Toggle between light and dark theme.</p>
          </div>
          <Switch 
            checked={theme === "dark"} 
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
          />
        </div>
      </div>
    </div>
  )
}
