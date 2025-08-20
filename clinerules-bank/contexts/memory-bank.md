# Memory Bank Context Rules

## Memory Bank Initialization
When the user says "follow your custom instructions" or mentions memory bank, immediately read all memory bank files to establish comprehensive project context.

### Required Memory Bank Files to Read
1. `memory-bank/projectbrief.md` - Project foundation and mission
2. `memory-bank/productContext.md` - Product vision and user journeys  
3. `memory-bank/activeContext.md` - Current priorities and recent changes
4. `memory-bank/systemPatterns.md` - Architecture decisions and code patterns
5. `memory-bank/techContext.md` - Technology stack and configurations
6. `memory-bank/progress.md` - Project status and completed milestones

## Memory Bank Update Protocol
After significant milestones, changes, or when explicitly requested, update relevant memory bank files:

### Update Triggers
- Major feature completion
- Architecture changes
- Technology upgrades
- Critical issue resolution
- Sprint/milestone completion
- User requests "update memory bank"

### Update Process
1. Read current memory bank files
2. Identify what has changed since last update
3. Update relevant sections with new information
4. Maintain chronological accuracy in progress.md
5. Update activeContext.md with new priorities
6. Confirm updates with user

## Context Preservation Strategy
Use memory bank as the primary source of truth for:
- Project architecture decisions
- Established patterns and conventions
- Current development priorities
- Known issues and their status
- Team conventions and workflows

### When Starting New Sessions
1. Always read memory bank files first
2. Establish current context from activeContext.md
3. Reference systemPatterns.md for technical decisions
4. Check progress.md for recent milestones
5. Understand product vision from productContext.md

## Memory Bank Communication Patterns
- Reference specific memory bank sections when explaining decisions
- Update activeContext.md when priorities shift
- Maintain consistency between memory bank and active work
- Use memory bank to onboard new team members
- Leverage memory bank for architecture documentation

## Prompt Engineering with Memory Bank
- Start complex tasks by reading relevant memory bank sections
- Reference established patterns before suggesting new approaches
- Use memory bank context to provide more accurate solutions
- Update memory bank when introducing new patterns
- Maintain memory bank as living documentation