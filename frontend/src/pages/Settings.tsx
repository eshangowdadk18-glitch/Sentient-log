import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your preferences.</p>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Theme toggles coming soon...</div>
        </CardContent>
      </Card>
    </div>
  )
}
