import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Twitter } from "lucide-react"
import { GeneratedPayload } from "@/stores/shipit.store"

export function XPostViewer({ payload }: { payload: GeneratedPayload }) {
  const content = `Just deployed ${payload.name} to @okx AI via SHIPIT! 🚀

${payload.description.split('\n')[0]}

Zero-touch deployment is the future. Try it out on Onchain OS now. #OKXAI #SHIPIT`

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Twitter className="h-4 w-4" /> Launch Tweet
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-muted/50">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  )
}
