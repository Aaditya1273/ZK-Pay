import { GeneratedPayload } from "@/stores/shipit.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Server } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ServiceList({ payload }: { payload: GeneratedPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" /> Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{payload.name} Service</h4>
              <Badge variant="secondary" className="mt-1">A2MCP</Badge>
            </div>
            <div className="text-right">
              <div className="font-semibold">{payload.fee} USDT</div>
              <div className="text-xs text-muted-foreground">Fee</div>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Description</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payload.description}</p>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Endpoint</div>
            <code className="text-xs bg-muted px-2 py-1 rounded">https://example.com/api</code>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
