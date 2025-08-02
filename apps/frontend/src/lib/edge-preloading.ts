/**
 * Edge Preloading Strategy for Vercel Deployment
 * Optimizes resource loading for better Core Web Vitals
 */

interface PreloadResource {
  href: string
  as: 'script' | 'style' | 'font' | 'image'
  crossorigin?: 'anonymous' | 'use-credentials'
  type?: string
  media?: string
}

interface PrefetchResource {
  href: string
  priority?: 'high' | 'low'
}

class EdgePreloadManager {
  private preloadedResources = new Set<string>()
  private prefetchedResources = new Set<string>()
  private observer?: IntersectionObserver

  /**
   * Preload critical resources immediately
   */
  preloadCriticalResources() {
    const criticalResources: PreloadResource[] = [
      // Critical fonts - must be loaded first
      {
        href: '/static/fonts/inter-var.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous'
      },
      // Critical CSS chunks
      {
        href: '/static/css/main.css',
        as: 'style'
      },
      // Core React bundle
      {
        href: '/static/js/react-vendor.js',
        as: 'script'
      },
      // Router bundle (needed early)
      {
        href: '/static/js/router-vendor.js',
        as: 'script'
      }
    ]

    criticalResources.forEach(resource => this.preloadResource(resource))
  }

  /**
   * Preload resources with different priorities
   */
  private preloadResource(resource: PreloadResource) {
    if (this.preloadedResources.has(resource.href)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource.href
    link.as = resource.as
    
    if (resource.crossorigin) {
      link.crossOrigin = resource.crossorigin
    }
    
    if (resource.type) {
      link.type = resource.type
    }

    if (resource.media) {
      link.media = resource.media
    }

    document.head.appendChild(link)
    this.preloadedResources.add(resource.href)
  }

  /**
   * Prefetch resources for next navigation
   */
  prefetchNextRoutes(routes: PrefetchResource[]) {
    routes.forEach(route => {
      if (this.prefetchedResources.has(route.href)) return

      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = route.href
      
      if (route.priority === 'high') {
        link.setAttribute('importance', 'high')
      }

      document.head.appendChild(link)
      this.prefetchedResources.add(route.href)
    })
  }

  /**
   * Setup intelligent route prefetching based on user behavior
   */
  setupIntelligentPrefetch() {
    // Prefetch on link hover with debouncing
    document.addEventListener('mouseover', this.handleLinkHover.bind(this), { passive: true })
    
    // Prefetch based on viewport intersection
    this.setupViewportPrefetch()
    
    // Prefetch based on user patterns
    this.setupPatternBasedPrefetch()
  }

  private handleLinkHover = ((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const link = target.closest('a[href]') as HTMLAnchorElement
    
    if (!link || !link.href.startsWith(window.location.origin)) return

    // Debounce prefetching
    setTimeout(() => {
      this.prefetchRoute(link.href, 'high')
    }, 100)
  })

  private setupViewportPrefetch() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const link = entry.target as HTMLAnchorElement
          if (link.href) {
            this.prefetchRoute(link.href, 'low')
          }
        }
      })
    }, {
      rootMargin: '200px'
    })

    // Observe all internal links
    document.querySelectorAll('a[href^="/"]').forEach(link => {
      this.observer?.observe(link)
    })
  }

  private setupPatternBasedPrefetch() {
    // Common navigation patterns for property management
    const currentPath = window.location.pathname

    if (currentPath === '/dashboard') {
      // Users typically go to properties or tenants from dashboard
      this.prefetchNextRoutes([
        { href: '/properties', priority: 'high' },
        { href: '/tenants', priority: 'high' },
        { href: '/maintenance', priority: 'low' }
      ])
    } else if (currentPath.startsWith('/properties')) {
      // Property viewers often check tenants and maintenance
      this.prefetchNextRoutes([
        { href: '/tenants', priority: 'high' },
        { href: '/maintenance', priority: 'high' },
        { href: '/reports', priority: 'low' }
      ])
    } else if (currentPath === '/') {
      // Landing page visitors likely to sign up or login
      this.prefetchNextRoutes([
        { href: '/auth/signup', priority: 'high' },
        { href: '/auth/login', priority: 'high' },
        { href: '/pricing', priority: 'low' }
      ])
    }
  }

  private prefetchRoute(href: string, priority: PrefetchResource['priority']) {
    // Extract route chunks to prefetch
    const routeChunks = this.getRouteChunks(href)
    routeChunks.forEach(chunk => {
      this.prefetchNextRoutes([{ href: chunk, priority }])
    })
  }

  private getRouteChunks(path: string): string[] {
    const chunks: string[] = []
    
    if (path.startsWith('/dashboard') || path.startsWith('/properties') || path.startsWith('/tenants')) {
      chunks.push('/static/js/authenticated-routes.js')
      chunks.push('/static/js/auth-vendor.js')
    }
    
    if (path.startsWith('/auth')) {
      chunks.push('/static/js/auth-routes.js')
      chunks.push('/static/js/forms-vendor.js')
    }
    
    if (path === '/' || path.startsWith('/about') || path.startsWith('/contact')) {
      chunks.push('/static/js/public-routes.js')
    }

    return chunks
  }

  /**
   * Preload images with intersection observer
   */
  setupLazyImageLoading() {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          if (img.dataset.src) {
            img.src = img.dataset.src
            img.removeAttribute('data-src')
            imageObserver.unobserve(img)
          }
        }
      })
    }, {
      rootMargin: '50px'
    })

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img)
    })
  }

  /**
   * Optimize third-party script loading
   */
  optimizeThirdPartyScripts() {
    // Defer non-critical scripts
    const scripts = [
      {
        src: 'https://js.stripe.com/v3/',
        defer: true,
        condition: () => window.location.pathname.includes('billing') || window.location.pathname.includes('pricing')
      },
      {
        src: 'https://us.i.posthog.com/static/array.js',
        defer: true,
        condition: () => process.env.NODE_ENV === 'production'
      }
    ]

    scripts.forEach(script => {
      if (script.condition && script.condition()) {
        const scriptElement = document.createElement('script')
        scriptElement.src = script.src
        scriptElement.defer = script.defer
        scriptElement.async = true
        document.head.appendChild(scriptElement)
      }
    })
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observer?.disconnect()
  }
}

// Export singleton instance
export const edgePreloadManager = new EdgePreloadManager()

// Initialize on DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      edgePreloadManager.preloadCriticalResources()
      edgePreloadManager.setupIntelligentPrefetch()
      edgePreloadManager.setupLazyImageLoading()
      edgePreloadManager.optimizeThirdPartyScripts()
    })
  } else {
    edgePreloadManager.preloadCriticalResources()
    edgePreloadManager.setupIntelligentPrefetch()
    edgePreloadManager.setupLazyImageLoading()
    edgePreloadManager.optimizeThirdPartyScripts()
  }
}