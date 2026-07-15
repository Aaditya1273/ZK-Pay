import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Terminal } from "lucide-react"

export function DemoScriptViewer({ agentId }: { agentId: string }) {
  const content = `# To test your new agent, run this in Onchain OS:\nagent call ${agentId} --prompt "Hello!"`

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4" /> Demo CLI Script
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="p-4 text-xs font-mono overflow-auto bg-black text-green-400 h-full">
          {content}
        </pre>
      </CardContent>
    </Card>
  )
}
