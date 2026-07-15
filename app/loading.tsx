import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground font-medium animate-pulse">Loading...</p>
    </div>
  )
}
