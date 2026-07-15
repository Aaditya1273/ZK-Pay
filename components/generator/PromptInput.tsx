import * as React from "react"
import { SendHorizontalIcon, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isGenerating: boolean
  placeholder?: string
}

export function PromptInput({
  onSubmit,
  isGenerating,
  placeholder = "Build an AI agent that writes SEO blogs...",
}: PromptInputProps) {
  const [value, setValue] = React.useState("")
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isGenerating) {
        onSubmit(value)
        setValue("")
      }
    }
  }

  return (
    <div className="relative group w-full max-w-4xl mx-auto shadow-sm ring-1 ring-border rounded-xl bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary transition-all">
      <div className="flex px-4 pt-4 pb-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          className="min-h-[100px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 p-0 text-base"
        />
      </div>
      
      <div className="flex items-center justify-between px-4 pb-3 pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span>SHIPIT Auto-Generation Engine</span>
        </div>
        
        <Button 
          size="icon" 
          disabled={!value.trim() || isGenerating}
          onClick={() => {
            onSubmit(value)
            setValue("")
          }}
          className={cn(
            "rounded-full h-8 w-8 transition-all",
            value.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
          )}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SendHorizontalIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
