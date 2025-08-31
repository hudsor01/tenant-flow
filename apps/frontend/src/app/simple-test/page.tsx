export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold gradient-text">
          TenantFlow Magic
        </h1>
        <p className="text-xl text-muted-foreground">
          Testing our enhanced UI/UX
        </p>
        <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:shadow-lg transition-all">
          Get Started
        </button>
      </div>
    </div>
  )
}