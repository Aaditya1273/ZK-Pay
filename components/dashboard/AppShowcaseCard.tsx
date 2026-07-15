import * as React from "react"
import { Check, Loader2, Sparkles, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface ASPData {
  id: string
  name: string
  description: string
  fee: string
  avatarUrl?: string
  status: "deploying" | "ready" | "failed"
}

interface AppShowcaseCardProps {
  asp: ASPData
  onClick?: (id: string) => void
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  const codePoint = trimmed.codePointAt(0)
  return codePoint ? String.fromCodePoint(codePoint).toUpperCase() : trimmed[0].toUpperCase()
}

export function AppShowcaseCard({ asp, onClick }: AppShowcaseCardProps) {
  const [imageBroken, setImageBroken] = React.useState(false)
  
  React.useEffect(() => {
    setImageBroken(false)
  }, [asp.avatarUrl])
  
  const showImage = asp.avatarUrl && !imageBroken

  return (
    <button
      type="button"
      onClick={() => onClick?.(asp.id)}
      title={asp.name}
      className={cn(
        "group relative w-full aspect-[4/3] rounded-xl overflow-hidden border bg-muted hover:shadow-md transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "border-border hover:border-primary/40 text-left flex flex-col"
      )}
    >
      <div className="relative w-full h-full flex-1">
        {showImage ? (
          <img
            src={asp.avatarUrl!}
            alt={asp.name}
            loading="lazy"
            onError={() => setImageBroken(true)}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
            <span className="text-4xl font-semibold text-primary/80">
              {getInitial(asp.name)}
            </span>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 pointer-events-none">
          {asp.status === "ready" && (
            <Badge className="bg-green-500/90 hover:bg-green-500 shadow-sm border-0">
              <Check className="w-3 h-3 mr-1" /> Live
            </Badge>
          )}
          {asp.status === "deploying" && (
            <Badge variant="secondary" className="bg-background/90 backdrop-blur shadow-sm">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Deploying
            </Badge>
          )}
          {asp.status === "failed" && (
            <Badge variant="destructive" className="shadow-sm">
              <AlertTriangle className="w-3 h-3 mr-1" /> Failed
            </Badge>
          )}
        </div>
        
        {/* Fee Badge */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <Badge variant="outline" className="bg-background/90 backdrop-blur shadow-sm border-primary/20">
            {asp.fee} USDT
          </Badge>
        </div>
      </div>
      
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-3 px-3">
        <h3 className="text-sm font-semibold text-white truncate w-full">
          {asp.name}
        </h3>
        <p className="text-xs text-white/70 line-clamp-1 mt-0.5">
          {asp.description}
        </p>
      </div>
    </button>
  )
}
