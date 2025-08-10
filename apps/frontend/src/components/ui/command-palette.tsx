"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  User,
  Home,
  Users,
  FileText,
  Wrench,
  DollarSign,
  Plus,
  Search,
  Building,
  UserPlus,
  CalendarPlus,
  FileTextIcon,
  TrendingUp,
  Clock,
  Star,
  Zap,
  ArrowRight,
  Brain,
  History,
  Sparkles
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
// import { springConfig } from "@/lib/animations" - unused

interface CommandPaletteProps {
  open?: boolean
  setOpen?: (open: boolean) => void
}

interface RecentAction {
  id: string
  label: string
  timestamp: Date
  frequency: number
}

interface AIContextSuggestion {
  id: string
  label: string
  description: string
  confidence: number
  context: string
  icon: React.ReactNode
}

interface CommandAction {
  label: string
  value: string
  icon: React.ReactNode
  shortcut?: string
  onSelect?: () => void
  keywords?: string[]
}

interface CommandGroup {
  heading: string
  items: CommandAction[]
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [recentActions, setRecentActions] = React.useState<RecentAction[]>([])
  const [aiSuggestions, setAiSuggestions] = React.useState<AIContextSuggestion[]>([])
  const isOpen = open !== undefined ? open : internalOpen
  const handleSetOpen = setOpen || setInternalOpen

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSetOpen(!isOpen)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [isOpen, handleSetOpen])

  // Generate AI suggestions function (defined before useEffect to avoid hoisting issues)
  const generateAISuggestions = React.useCallback(() => {
    // Simulate AI-powered contextual suggestions
    const hour = new Date().getHours()
    const suggestions: AIContextSuggestion[] = []
    
    // Time-based suggestions
    if (hour >= 9 && hour <= 17) {
      suggestions.push({
        id: 'daily-overview',
        label: 'Daily Property Overview',
        description: 'Review today\'s key metrics and activities',
        confidence: 0.85,
        context: 'Working hours detected',
        icon: <TrendingUp className="w-4 h-4" />
      })
    }
    
    if (hour >= 8 && hour <= 10) {
      suggestions.push({
        id: 'maintenance-check',
        label: 'Check Pending Maintenance',
        description: 'Review overnight maintenance requests',
        confidence: 0.75,
        context: 'Morning routine',
        icon: <Wrench className="w-4 h-4" />
      })
    }
    
    // Workflow-based suggestions
    suggestions.push({
      id: 'rent-collection',
      label: 'Monthly Rent Collection',
      description: 'Set up automated rent collection for this month',
      confidence: 0.70,
      context: 'Common workflow',
      icon: <DollarSign className="w-4 h-4" />
    })
    
    setAiSuggestions(suggestions)
  }, [])

  // Load recent actions from localStorage
  React.useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('tenantflow-recent-actions')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setRecentActions(parsed.map((item: { id: string; label: string; timestamp: string; frequency: number }) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })))
        } catch (error) {
          console.error('Failed to parse recent actions:', error)
        }
      }
      
      // Generate AI suggestions based on current context
      if (typeof generateAISuggestions === 'function') {
        generateAISuggestions()
      }
    }
  }, [isOpen, generateAISuggestions])

  const runCommand = React.useCallback((command: () => unknown, actionLabel: string, actionValue: string) => {
    handleSetOpen(false)
    command()
    
    // Track action in recent actions
    const now = new Date()
    setRecentActions(prev => {
      const existing = prev.find(action => action.id === actionValue)
      const updated = existing
        ? prev.map(action => 
            action.id === actionValue 
              ? { ...action, timestamp: now, frequency: action.frequency + 1 }
              : action
          )
        : [...prev, { id: actionValue, label: actionLabel, timestamp: now, frequency: 1 }]
      
      // Keep only the 10 most recent/frequent actions
      const sorted = updated
        .sort((a, b) => b.frequency - a.frequency || b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
      
      // Persist to localStorage
      localStorage.setItem('tenantflow-recent-actions', JSON.stringify(sorted))
      return sorted
    })
  }, [handleSetOpen])

  // Fuzzy search with typo tolerance
  const fuzzySearch = React.useCallback((query: string, text: string, keywords: string[] = []): number => {
    if (!query) return 0
    
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()
    const allText = [textLower, ...keywords.map(k => k.toLowerCase())].join(' ')
    
    // Exact match gets highest score
    if (allText.includes(queryLower)) return 100
    
    // Character-by-character fuzzy matching
    let score = 0
    let textIndex = 0
    
    for (let i = 0; i < queryLower.length; i++) {
      const char = queryLower[i]
      const found = allText.indexOf(char, textIndex)
      if (found !== -1) {
        score += 1
        textIndex = found + 1
      }
    }
    
    return (score / queryLower.length) * 80 // Max 80 for fuzzy matches
  }, [])

  // Property Management specific commands
  const commandGroups: CommandGroup[] = React.useMemo(() => [
    {
      heading: "Quick Actions",
      items: [
        {
          label: "Add New Property",
          value: "add-property",
          icon: <Plus className="mr-2 h-4 w-4" />,
          shortcut: "⌘P",
          onSelect: () => runCommand(() => {}, "Add New Property", "add-property"),
          keywords: ["create", "new", "property", "building"]
        },
        {
          label: "Add New Tenant", 
          value: "add-tenant",
          icon: <UserPlus className="mr-2 h-4 w-4" />,
          shortcut: "⌘T",
          onSelect: () => runCommand(() => {}, "Add New Tenant", "add-tenant"),
          keywords: ["create", "new", "tenant", "resident"]
        },
        {
          label: "Create Maintenance Request",
          value: "add-maintenance",
          icon: <Wrench className="mr-2 h-4 w-4" />,
          shortcut: "⌘M",
          onSelect: () => runCommand(() => {}, "Create Maintenance Request", "add-maintenance"),
          keywords: ["create", "maintenance", "repair", "work", "order"]
        },
        {
          label: "Schedule Lease Signing",
          value: "add-appointment",
          icon: <CalendarPlus className="mr-2 h-4 w-4" />,
          shortcut: "⌘L",
          onSelect: () => runCommand(() => {}, "Schedule Lease Signing", "add-appointment"),
          keywords: ["schedule", "appointment", "lease", "signing", "calendar"]
        }
      ]
    },
    {
      heading: "Navigation",
      items: [
        {
          label: "Dashboard",
          value: "dashboard",
          icon: <TrendingUp className="mr-2 h-4 w-4" />,
          shortcut: "⌘D",
          onSelect: () => runCommand(() => {}, "Dashboard", "dashboard"),
          keywords: ["dashboard", "home", "overview", "stats"]
        },
        {
          label: "Properties",
          value: "properties",
          icon: <Home className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Properties", "properties"),
          keywords: ["properties", "buildings", "real estate"]
        },
        {
          label: "Tenants",
          value: "tenants", 
          icon: <Users className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Tenants", "tenants"),
          keywords: ["tenants", "residents", "renters", "occupants"]
        },
        {
          label: "Leases",
          value: "leases",
          icon: <FileText className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Leases", "leases"),
          keywords: ["leases", "contracts", "agreements", "rental"]
        },
        {
          label: "Maintenance",
          value: "maintenance",
          icon: <Wrench className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Maintenance", "maintenance"),
          keywords: ["maintenance", "repairs", "work orders", "requests"]
        },
        {
          label: "Finances", 
          value: "finances",
          icon: <DollarSign className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Finances", "finances"),
          keywords: ["finances", "money", "rent", "payments", "revenue"]
        }
      ]
    },
    {
      heading: "Search",
      items: [
        {
          label: "Search Properties",
          value: "search-properties",
          icon: <Building className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Search Properties", "search-properties"),
          keywords: ["find", "search", "properties", "buildings"]
        },
        {
          label: "Search Tenants",
          value: "search-tenants",
          icon: <User className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Search Tenants", "search-tenants"),
          keywords: ["find", "search", "tenants", "residents"]
        },
        {
          label: "Search Documents",
          value: "search-documents",
          icon: <FileTextIcon className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Search Documents", "search-documents"),
          keywords: ["find", "search", "documents", "files", "leases"]
        }
      ]
    },
    {
      heading: "Tools",
      items: [
        {
          label: "Calculator",
          value: "calculator",
          icon: <Calculator className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Calculator", "calculator"),
          keywords: ["calculator", "math", "calculate", "numbers"]
        },
        {
          label: "Calendar",
          value: "calendar",
          icon: <Calendar className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Calendar", "calendar"),
          keywords: ["calendar", "schedule", "appointments", "dates"]
        }
      ]
    },
    {
      heading: "Settings",
      items: [
        {
          label: "Profile Settings",
          value: "profile",
          icon: <User className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Profile Settings", "profile"),
          keywords: ["profile", "account", "settings", "personal"]
        },
        {
          label: "Billing Settings",
          value: "billing",
          icon: <CreditCard className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Billing Settings", "billing"),
          keywords: ["billing", "payment", "subscription", "plan"]
        },
        {
          label: "Application Settings",
          value: "settings",
          icon: <Settings className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Application Settings", "settings"),
          keywords: ["settings", "preferences", "configuration", "options"]
        }
      ]
    }
  ], [runCommand])

  // Enhanced search that includes fuzzy matching
  const getSearchResults = React.useCallback(() => {
    if (!searchValue.trim()) return commandGroups
    
    const results = commandGroups.map(group => ({
      ...group,
      items: group.items
        .map(item => ({
          ...item,
          searchScore: fuzzySearch(searchValue, item.label, item.keywords)
        }))
        .filter(item => item.searchScore > 0)
        .sort((a, b) => b.searchScore - a.searchScore)
    })).filter(group => group.items.length > 0)
    
    return results
  }, [searchValue, fuzzySearch, commandGroups])

  const shouldShowRecentActions = !searchValue && recentActions.length > 0
  const shouldShowAISuggestions = !searchValue && aiSuggestions.length > 0
  const searchResults = getSearchResults()

  // Component for highlighting search matches
  const HighlightedMatch = React.memo(function HighlightedMatch({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>
    
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return <>{text}</>
    
    const before = text.slice(0, index)
    const match = text.slice(index, index + query.length)
    const after = text.slice(index + query.length)
    
    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground px-0.5 rounded-sm">
          {match}
        </mark>
        {after}
      </>
    )
  })

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start rounded-lg bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => handleSetOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search commands...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={isOpen} onOpenChange={handleSetOpen}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try different keywords or check spelling
                </p>
              </div>
            </div>
          </CommandEmpty>
          
          {/* AI Suggestions Section */}
          {shouldShowAISuggestions && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
              >
                <CommandGroup heading="✨ AI Suggestions">
                  {aiSuggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.id}
                      value={suggestion.id}
                      onSelect={() => runCommand(() => {}, suggestion.label, suggestion.id)}
                      className="flex items-center gap-3 px-3 py-4"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{suggestion.label}</span>
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {Math.round(suggestion.confidence * 100)}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {suggestion.description}
                        </p>
                        <p className="text-xs text-blue-600/70 mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {suggestion.context}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </motion.div>
            </AnimatePresence>
          )}

          {/* Recent Actions Section */}
          {shouldShowRecentActions && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
              >
                <CommandGroup heading="🕒 Recent Actions">
                  {recentActions.slice(0, 5).map((action) => (
                    <CommandItem
                      key={action.id}
                      value={action.id}
                      onSelect={() => runCommand(() => {}, action.label, action.id)}
                      className="flex items-center gap-3 px-3 py-3"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
                        <History className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{action.label}</span>
                          {action.frequency > 1 && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              {action.frequency}×
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.timestamp.toLocaleDateString()} at {action.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </motion.div>
            </AnimatePresence>
          )}
          
          {/* Search Results or All Commands */}
          {searchResults.map((group, groupIndex) => (
            <React.Fragment key={group.heading}>
              <CommandGroup heading={group.heading}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={item.onSelect}
                    keywords={item.keywords}
                    className="flex items-center gap-2 px-3 py-3"
                  >
                    <div className="flex h-4 w-4 items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="flex-1">
                      {searchValue ? (
                        <HighlightedMatch text={item.label} query={searchValue} />
                      ) : (
                        item.label
                      )}
                    </span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                    {'searchScore' in item && item.searchScore != null && typeof item.searchScore === 'number' && item.searchScore < 100 && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">fuzzy</span>
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {groupIndex < searchResults.length - 1 && <CommandSeparator />}
            </React.Fragment>
          ))}

          {/* Quick Shortcuts Help */}
          {!searchValue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="px-3 py-4 border-t"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">esc</kbd>
                    close
                  </span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <Brain className="w-3 h-3" />
                  <span>AI-powered</span>
                </div>
              </div>
            </motion.div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

// Property-specific command palette for contextual usage
interface PropertyCommandPaletteProps {
  propertyId?: string
  propertyName?: string
  open?: boolean
  setOpen?: (open: boolean) => void
}

export function PropertyCommandPalette({ 
  propertyId: _propertyId, 
  propertyName,
  open, 
  setOpen 
}: PropertyCommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const handleSetOpen = setOpen || setInternalOpen

  const runCommand = React.useCallback((command: () => unknown, _actionLabel?: string, _actionValue?: string) => {
    handleSetOpen(false)
    command()
  }, [handleSetOpen])

  const propertyCommands: CommandGroup[] = [
    {
      heading: `${propertyName} Actions`,
      items: [
        {
          label: "Add New Unit",
          value: "add-unit",
          icon: <Plus className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Add New Unit", "add-unit"),
          keywords: ["add", "unit", "apartment", "room"]
        },
        {
          label: "Add Tenant to Property",
          value: "add-tenant-property", 
          icon: <UserPlus className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Add Tenant to Property", "add-tenant-property"),
          keywords: ["tenant", "resident", "add", "new"]
        },
        {
          label: "Schedule Inspection",
          value: "schedule-inspection",
          icon: <Calendar className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Schedule Inspection", "schedule-inspection"),
          keywords: ["inspection", "schedule", "appointment", "visit"]
        },
        {
          label: "Create Maintenance Order",
          value: "maintenance-order",
          icon: <Wrench className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Create Maintenance Order", "maintenance-order"),
          keywords: ["maintenance", "repair", "work", "order", "fix"]
        }
      ]
    },
    {
      heading: "Property Information",
      items: [
        {
          label: "View Property Details",
          value: "property-details",
          icon: <Building className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "View Property Details", "property-details"),
          keywords: ["details", "information", "property", "view"]
        },
        {
          label: "Financial Summary",
          value: "financial-summary",
          icon: <DollarSign className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Financial Summary", "financial-summary"),
          keywords: ["finances", "money", "rent", "income", "summary"]
        },
        {
          label: "Occupancy Report",
          value: "occupancy-report",
          icon: <Users className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => {}, "Occupancy Report", "occupancy-report"),
          keywords: ["occupancy", "tenants", "vacancy", "report"]
        }
      ]
    }
  ]

  return (
    <CommandDialog open={isOpen} onOpenChange={handleSetOpen}>
      <CommandInput placeholder={`Search ${propertyName} commands...`} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {propertyCommands.map((group, groupIndex) => (
          <React.Fragment key={group.heading}>
            <CommandGroup heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={item.onSelect}
                  keywords={item.keywords}
                  className="flex items-center gap-2 px-2 py-3"
                >
                  <div className="flex h-4 w-4 items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="flex-1">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {groupIndex < propertyCommands.length - 1 && <CommandSeparator />}
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

export type { CommandPaletteProps }