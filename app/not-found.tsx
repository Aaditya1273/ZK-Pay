export default function NotFound() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center space-y-6">
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="text-6xl font-bold text-muted/50 mb-4">404</div>
        <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
    </div>
  )
}
