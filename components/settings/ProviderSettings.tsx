import * as React from "react"
import { Key, Save, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ProviderSettings() {
  const [apiKey, setApiKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [passphrase, setPassphrase] = React.useState("")
  const [isSaved, setIsSaved] = React.useState(false)

  const handleSave = () => {
    // In a real app, you'd store these securely, e.g., Next.js server actions or encrypted localStorage
    localStorage.setItem("OKX_API_KEY", apiKey)
    localStorage.setItem("OKX_SECRET_KEY", secretKey)
    localStorage.setItem("OKX_PASSPHRASE", passphrase)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  React.useEffect(() => {
    setApiKey(localStorage.getItem("OKX_API_KEY") || "")
    setSecretKey(localStorage.getItem("OKX_SECRET_KEY") || "")
    setPassphrase(localStorage.getItem("OKX_PASSPHRASE") || "")
  }, [])

  return (
    <Card className="w-full max-w-2xl mx-auto border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <CardTitle>OKX.AI Credentials</CardTitle>
        </div>
        <CardDescription>
          Required to deploy Agent Service Providers to the OKX.AI ecosystem. Your keys are stored locally and never sent to our servers.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-muted border-border text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Warning</AlertTitle>
          <AlertDescription>
            These credentials grant access to create on-chain identities. Keep them secure.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input 
              id="apiKey"
              type="password"
              placeholder="okx-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <Input 
              id="secretKey"
              type="password"
              placeholder="Enter your secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="font-mono bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input 
              id="passphrase"
              type="password"
              placeholder="Enter your passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="font-mono bg-background"
            />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center border-t border-border pt-6 mt-2 bg-muted/50 rounded-b-xl">
        <p className="text-sm text-muted-foreground">
          Apply for keys at the OKX Developer Portal.
        </p>
        <Button onClick={handleSave} className="min-w-[120px]">
          {isSaved ? "Saved!" : <><Save className="w-4 h-4 mr-2" /> Save Keys</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
