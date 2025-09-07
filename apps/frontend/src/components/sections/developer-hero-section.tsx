"use client"

import { ArrowRight, Code, GitBranch, Terminal, Star, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

interface DeveloperHeroSectionProps {
  className?: string
}

export function DeveloperHeroSection({ className }: DeveloperHeroSectionProps) {
  return (
    <section className={cn(
      "relative min-h-screen bg-gray-50 dark:bg-gray-950",
      className
    )}>
      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center min-h-screen justify-center py-20">
          
          {/* Open Source Badge */}
          <BlurFade delay={0.1} inView>
            <Badge className="mb-8 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full">
              <Code className="w-4 h-4 mr-2" />
              Open source property management
              <ArrowRight className="w-4 h-4 ml-2" />
            </Badge>
          </BlurFade>

          {/* Developer-focused headline */}
          <BlurFade delay={0.2} inView>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 dark:text-white mb-8 leading-tight">
              Built by developers,
              <br />
              for <span className="font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg text-blue-600 dark:text-blue-400">property managers</span>
            </h1>
          </BlurFade>

          {/* Technical description */}
          <BlurFade delay={0.3} inView>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Self-hosted, API-first property management platform. Deploy on your infrastructure,
              customize with our extensive API, and maintain full control of your data.
            </p>
          </BlurFade>

          {/* Technical CTAs */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
              <Button
                size="lg"
                className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-medium rounded-lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Download & Deploy
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 font-medium rounded-lg"
              >
                <GitBranch className="w-5 h-5 mr-2" />
                View on GitHub
              </Button>
            </div>
          </BlurFade>

          {/* GitHub stats */}
          <BlurFade delay={0.5} inView>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">2.4k</span>
                <span className="text-sm">stars</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                <GitBranch className="w-4 h-4" />
                <span className="font-medium">347</span>
                <span className="text-sm">forks</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                <Download className="w-4 h-4" />
                <span className="font-medium">12k</span>
                <span className="text-sm">downloads</span>
              </div>
            </div>
          </BlurFade>

          {/* Code preview */}
          <BlurFade delay={0.6} inView>
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
                
                {/* Terminal header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Terminal className="w-4 h-4" />
                      <span>tenantflow-deploy</span>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs">bash</div>
                </div>

                {/* Code content */}
                <div className="p-6 font-mono text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-green-400 mr-2">$</span>
                      <span className="text-gray-300">git clone https://github.com/tenantflow/tenantflow.git</span>
                    </div>
                    <div className="text-gray-500">Cloning into 'tenantflow'...</div>
                    <div className="text-gray-500">remote: Enumerating objects: 1247, done.</div>
                    
                    <div className="flex items-center mt-4">
                      <span className="text-green-400 mr-2">$</span>
                      <span className="text-gray-300">cd tenantflow && npm install</span>
                    </div>
                    <div className="text-gray-500">npm WARN using --force</div>
                    <div className="text-gray-500">added 247 packages in 12s</div>
                    
                    <div className="flex items-center mt-4">
                      <span className="text-green-400 mr-2">$</span>
                      <span className="text-gray-300">docker-compose up -d</span>
                    </div>
                    <div className="text-blue-400">Creating tenantflow_db_1 ... done</div>
                    <div className="text-blue-400">Creating tenantflow_api_1 ... done</div>
                    <div className="text-blue-400">Creating tenantflow_web_1 ... done</div>
                    
                    <div className="flex items-center mt-4">
                      <span className="text-green-400 mr-2">$</span>
                      <span className="text-gray-300">npm run migrate</span>
                    </div>
                    <div className="text-green-400">Database migrated successfully</div>
                    <div className="text-green-400">TenantFlow is running on http://localhost:3000</div>
                    
                    <div className="flex items-center mt-4">
                      <span className="text-blue-400 mr-2 animate-pulse">▊</span>
                      <span className="text-gray-400">Ready for deployment...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* API preview */}
              <div className="mt-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                      <Code className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">REST API Example</span>
                  </div>
                </div>
                
                <div className="p-6 font-mono text-sm">
                  <div className="space-y-1">
                    <div className="text-blue-600 dark:text-blue-400">GET</div>
                    <div className="text-gray-900 dark:text-white">/api/properties</div>
                    <div className="text-gray-500 mt-2">// Response</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-2">{"{"}</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-4">"properties": [</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-6">{"{"}</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-8">"id": "prop_123",</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-8">"name": "Downtown Plaza",</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-8">"units": 45,</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-8">"occupancy": 0.94</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-6">{"}"}</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-4">],</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-4">"total": 247</div>
                    <div className="text-gray-700 dark:text-gray-300 pl-2">{"}"}</div>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* Tech specs */}
          <BlurFade delay={0.7} inView>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Docker</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Container ready</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">REST API</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Full access</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">PostgreSQL</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Production ready</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">TypeScript</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Type safe</div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}