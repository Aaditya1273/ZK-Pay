import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Code2 } from "lucide-react"
import { GeneratedPayload } from "@/stores/shipit.store"

export function PayloadViewer({ payload }: { payload: GeneratedPayload }) {
  const json = JSON.stringify({
    role: "asp",
    name: payload.name,
    description: payload.description,
    picture: "https://example.com/avatar.png",
    service: [
      {
        name: `${payload.name} Service`,
        description: payload.description,
        type: "A2MCP",
        fee: payload.fee,
        endpoint: "https://example.com/api"
      }
    ]
  }, null, 2)

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Code2 className="h-4 w-4" /> OKX Payload
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="p-4 text-xs font-mono overflow-auto bg-muted/50 h-full text-blue-400">
          {json}
        </pre>
      </CardContent>
    </Card>
  )
}
