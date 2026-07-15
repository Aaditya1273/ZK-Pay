import * as React from "react"
import { AppShowcaseCard, ASPData } from "./AppShowcaseCard"
import { Package } from "lucide-react"

interface AppListProps {
  asps: ASPData[]
  onSelect?: (id: string) => void
}

export function AppList({ asps, onSelect }: AppListProps) {
  if (asps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No ASPs Deployed Yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Use the Idea Generator above to automatically create, configure, and deploy your first Agent Service Provider on OKX.AI.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Your Deployed ASPs</h2>
        <span className="text-sm text-muted-foreground">
          {asps.length} {asps.length === 1 ? 'Service' : 'Services'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {asps.map((asp) => (
          <AppShowcaseCard 
            key={asp.id} 
            asp={asp} 
            onClick={onSelect} 
          />
        ))}
      </div>
    </div>
  )
}
