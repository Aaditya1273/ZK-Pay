import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { GeneratedPayload } from "@/stores/shipit.store"

export function ReadmeViewer({ payload }: { payload: GeneratedPayload }) {
  const content = `# ${payload.name}
  
> ${payload.description.split('\n')[0]}

This agent is registered as an OKX.AI ASP using the A2MCP protocol.

## Usage
To use this agent, ensure you provide:
${payload.description.split('\n')[1] || "Required context."}

**Fee:** ${payload.fee} USDT`

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" /> README.md
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="p-4 text-xs font-mono overflow-auto bg-muted/50 h-full">
          {content}
        </pre>
      </CardContent>
    </Card>
  )
}
