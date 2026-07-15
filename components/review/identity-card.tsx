import { GeneratedPayload } from "@/stores/shipit.store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"

export function IdentityCard({ payload }: { payload: GeneratedPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" /> Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-muted rounded-full overflow-hidden border">
            {/* Using an img since we download it to /tmp locally, but for UI preview we can just show a placeholder */}
            {payload.avatarUrl ? (
              <img src={"https://api.dicebear.com/7.x/shapes/png?seed=" + payload.name} alt="Avatar" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{payload.name}</h3>
            <p className="text-sm text-muted-foreground">ASP Agent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
