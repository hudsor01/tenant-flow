"use client"

import * as React from "react"
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
  TrendingUp
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

interface CommandPaletteProps {
  open?: boolean
  setOpen?: (open: boolean) => void
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

  const runCommand = React.useCallback((command: () => unknown) => {
    handleSetOpen(false)
    command()
  }, [handleSetOpen])

  // Property Management specific commands
  const commandGroups: CommandGroup[] = [
    {
      heading: "Quick Actions",
      items: [
        {
          label: "Add New Property",
          value: "add-property",
          icon: <Plus className="mr-2 h-4 w-4" />,
          shortcut: "⌘P",
          onSelect: () => runCommand(() => console.log("Add property")),
          keywords: ["create", "new", "property", "building"]
        },
        {
          label: "Add New Tenant", 
          value: "add-tenant",
          icon: <UserPlus className="mr-2 h-4 w-4" />,
          shortcut: "⌘T",
          onSelect: () => runCommand(() => console.log("Add tenant")),
          keywords: ["create", "new", "tenant", "resident"]
        },
        {
          label: "Create Maintenance Request",
          value: "add-maintenance",
          icon: <Wrench className="mr-2 h-4 w-4" />,
          shortcut: "⌘M",
          onSelect: () => runCommand(() => console.log("Add maintenance")),
          keywords: ["create", "maintenance", "repair", "work", "order"]
        },
        {
          label: "Schedule Lease Signing",
          value: "add-appointment",
          icon: <CalendarPlus className="mr-2 h-4 w-4" />,
          shortcut: "⌘L",
          onSelect: () => runCommand(() => console.log("Schedule lease")),
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
          onSelect: () => runCommand(() => console.log("Navigate to dashboard")),
          keywords: ["dashboard", "home", "overview", "stats"]
        },
        {
          label: "Properties",
          value: "properties",
          icon: <Home className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Navigate to properties")),
          keywords: ["properties", "buildings", "real estate"]
        },
        {
          label: "Tenants",
          value: "tenants", 
          icon: <Users className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Navigate to tenants")),
          keywords: ["tenants", "residents", "renters", "occupants"]
        },
        {
          label: "Leases",
          value: "leases",
          icon: <FileText className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Navigate to leases")),
          keywords: ["leases", "contracts", "agreements", "rental"]
        },
        {
          label: "Maintenance",
          value: "maintenance",
          icon: <Wrench className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Navigate to maintenance")),
          keywords: ["maintenance", "repairs", "work orders", "requests"]
        },
        {
          label: "Finances", 
          value: "finances",
          icon: <DollarSign className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Navigate to finances")),
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
          onSelect: () => runCommand(() => console.log("Search properties")),
          keywords: ["find", "search", "properties", "buildings"]
        },
        {
          label: "Search Tenants",
          value: "search-tenants",
          icon: <User className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Search tenants")),
          keywords: ["find", "search", "tenants", "residents"]
        },
        {
          label: "Search Documents",
          value: "search-documents",
          icon: <FileTextIcon className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Search documents")),
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
          onSelect: () => runCommand(() => console.log("Open calculator")),
          keywords: ["calculator", "math", "calculate", "numbers"]
        },
        {
          label: "Calendar",
          value: "calendar",
          icon: <Calendar className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Open calendar")),
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
          onSelect: () => runCommand(() => console.log("Open profile")),
          keywords: ["profile", "account", "settings", "personal"]
        },
        {
          label: "Billing Settings",
          value: "billing",
          icon: <CreditCard className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Open billing")),
          keywords: ["billing", "payment", "subscription", "plan"]
        },
        {
          label: "Application Settings",
          value: "settings",
          icon: <Settings className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log("Open settings")),
          keywords: ["settings", "preferences", "configuration", "options"]
        }
      ]
    }
  ]

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
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {commandGroups.map((group, groupIndex) => (
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
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {groupIndex < commandGroups.length - 1 && <CommandSeparator />}
            </React.Fragment>
          ))}
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

  const runCommand = React.useCallback((command: () => unknown) => {
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
          onSelect: () => runCommand(() => console.log(`Add unit to ${propertyName}`)),
          keywords: ["add", "unit", "apartment", "room"]
        },
        {
          label: "Add Tenant to Property",
          value: "add-tenant-property", 
          icon: <UserPlus className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log(`Add tenant to ${propertyName}`)),
          keywords: ["tenant", "resident", "add", "new"]
        },
        {
          label: "Schedule Inspection",
          value: "schedule-inspection",
          icon: <Calendar className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log(`Schedule inspection for ${propertyName}`)),
          keywords: ["inspection", "schedule", "appointment", "visit"]
        },
        {
          label: "Create Maintenance Order",
          value: "maintenance-order",
          icon: <Wrench className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log(`Create maintenance for ${propertyName}`)),
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
          onSelect: () => runCommand(() => console.log(`View ${propertyName} details`)),
          keywords: ["details", "information", "property", "view"]
        },
        {
          label: "Financial Summary",
          value: "financial-summary",
          icon: <DollarSign className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log(`View ${propertyName} finances`)),
          keywords: ["finances", "money", "rent", "income", "summary"]
        },
        {
          label: "Occupancy Report",
          value: "occupancy-report",
          icon: <Users className="mr-2 h-4 w-4" />,
          onSelect: () => runCommand(() => console.log(`View ${propertyName} occupancy`)),
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