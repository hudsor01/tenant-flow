# TenantFlow Memory Bank

This Memory Bank system transforms Cline from a stateless assistant into a persistent development partner that maintains comprehensive project context across all sessions.

## 📚 Memory Bank Files

### Core Project Context
1. **`projectbrief.md`** - Project foundation, mission, and core requirements
2. **`productContext.md`** - Product vision, user journeys, and business context
3. **`activeContext.md`** - Current priorities, recent changes, and immediate focus
4. **`systemPatterns.md`** - Architecture decisions, code patterns, and technical standards
5. **`techContext.md`** - Technology stack, configurations, and development setup
6. **`progress.md`** - Project status, completed milestones, and known issues

## 🚀 How to Use the Memory Bank

### Starting a New Session
Simply say in chat:
```
follow your custom instructions
```
This triggers Cline to read all memory bank files and establish full project context.

### For Specific Context
Reference specific areas:
```
review the current priorities from activeContext
check systemPatterns for architecture decisions
update progress with recent milestone completion
```

### Updating the Memory Bank
After significant changes:
```
update memory bank with [specific changes/milestones]
```

## 🔄 Memory Bank Lifecycle

### When Cline Reads Memory Bank
- At the start of new sessions when prompted
- Before major architectural decisions
- When clarifying project requirements
- During onboarding of new features or team members

### When to Update Memory Bank
- ✅ Major feature completion
- ✅ Architecture or technology changes
- ✅ Critical issue resolution
- ✅ Sprint or milestone completion
- ✅ Significant progress on current priorities

### Update Process
1. Cline reads current memory bank files
2. Identifies changes since last update
3. Updates relevant sections with new information
4. Maintains chronological accuracy
5. Confirms updates with user

## 📁 File Purposes & Contents

### projectbrief.md
- **Purpose**: Foundational project understanding
- **Contains**: Mission, target users, value propositions, constraints
- **Update Frequency**: Rarely (only major pivots or expansions)

### productContext.md  
- **Purpose**: Product vision and user experience design
- **Contains**: Problem statement, user journeys, expected outcomes
- **Update Frequency**: Quarterly or when product strategy changes

### activeContext.md
- **Purpose**: Current development focus and immediate priorities
- **Contains**: Sprint goals, critical issues, recent changes, risk factors
- **Update Frequency**: Weekly or after major milestone completion

### systemPatterns.md
- **Purpose**: Technical architecture and development patterns
- **Contains**: Architecture decisions, code patterns, design principles
- **Update Frequency**: When new patterns are established or changed

### techContext.md
- **Purpose**: Technology stack and development environment
- **Contains**: Framework versions, configurations, tools, deployment
- **Update Frequency**: When technology is upgraded or added

### progress.md
- **Purpose**: Project status and historical achievements
- **Contains**: Completed milestones, metrics, lessons learned, roadmap
- **Update Frequency**: Monthly or after major deliveries

## 🎯 Benefits for TenantFlow Development

### Context Preservation
- **Multi-tenant Architecture**: Always remembers RLS requirements and org_id filtering
- **React 19 Patterns**: Maintains server-component-first approach across sessions
- **Security Standards**: Consistently applies input validation and authentication patterns
- **Code Quality**: Enforces TypeScript strict mode and testing requirements

### Development Efficiency
- **Pattern Consistency**: References established BaseCrudService and repository patterns
- **Technology Alignment**: Remembers React 19, NestJS 11, Supabase configuration requirements
- **Priority Focus**: Maintains awareness of critical issues (10 failing tests, Supabase migration)
- **Quality Standards**: Consistently applies `npm run claude:check` validation

### Team Coordination
- **Onboarding**: New team members get consistent context and patterns
- **Knowledge Sharing**: Architectural decisions preserved and accessible
- **Progress Tracking**: Historical context helps inform future decisions
- **Risk Management**: Known issues and technical debt tracked systematically

## 🛠 Integration with Cline Rules

### Memory Bank Context Rule
Activate the memory bank context when working extensively with project memory:
```bash
cp clinerules-bank/contexts/memory-bank.md .clinerules/05-memory-bank.md
```

### Prompt Engineering Enhancement
Use advanced prompting techniques for better memory bank interactions:
```bash
cp clinerules-bank/contexts/prompt-engineering.md .clinerules/06-prompt-engineering.md
```

## 📊 Current Memory Bank Status

### Last Updated
- **activeContext.md**: January 2025 - Current sprint priorities
- **progress.md**: January 2025 - Recent milestones and metrics
- **techContext.md**: January 2025 - React 19 and NestJS 11 configurations
- **systemPatterns.md**: December 2024 - BaseCrudService patterns
- **productContext.md**: November 2024 - Product vision established
- **projectbrief.md**: October 2024 - Project foundation defined

### Health Score: 95/100
- ✅ **Comprehensive Coverage**: All six core files implemented
- ✅ **Current Information**: Active context reflects latest priorities
- ✅ **Technical Accuracy**: System patterns match actual implementation
- ✅ **Business Alignment**: Product context aligned with development work
- ⚠️ **Update Frequency**: Could benefit from more frequent progress updates

## 🎮 Advanced Usage Patterns

### Architecture Consultation
```
"Based on our systemPatterns, how should we implement the notification system?"
```

### Priority Clarification
```
"Review activeContext and confirm the order of priority for current issues"
```

### Technical Decision Making
```
"Given our techContext, what's the best approach for the Stripe integration?"
```

### Progress Assessment
```
"Update progress.md with completion of the 10 failing tests milestone"
```

### Onboarding Support
```
"Walk through the memory bank to onboard a new developer to TenantFlow"
```

---

*This Memory Bank system ensures that every Cline interaction benefits from comprehensive project context, leading to more consistent, accurate, and aligned development assistance.*