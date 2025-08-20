# Prompt Engineering Context Rules

## Advanced Prompting Techniques

### Constraint Stuffing for Complete Code
When requesting code implementation:
- Always add: "ensure the code is complete and not truncated"
- Request: "provide the full implementation with all imports"
- Specify: "include all necessary error handling and types"
- Ask for: "complete file contents, not just snippets"

### Confidence Rating Protocol
Before and after tool usage:
- Ask Cline to rate confidence level (1-10) before implementation
- Request confidence rating after completing tasks
- Challenge assumptions with "count to 10 and reconsider"
- Ask "what could go wrong with this approach?"

### Memory Verification Patterns
Use playful verification to ensure context retention:
- "Do you remember the architecture patterns we discussed?"
- "What are the current priorities from our last conversation?"
- "Can you recall the specific technology versions we're using?"
- "What were the main issues we identified in the test suite?"

## Communication Excellence

### Conversational Approach
- Write naturally, as if talking to a skilled colleague
- Ask specific, guided questions rather than open-ended ones
- Provide context before requesting implementation
- Validate and refine suggestions through dialogue

### Context Provision Strategy
Always provide:
- **Goal**: What we're trying to achieve
- **Constraints**: Technology limitations or requirements  
- **Context**: Related codebase details and patterns
- **Success Criteria**: How to know when it's done right

### Specificity Principles
Instead of: "Fix the tests"
Use: "Fix the 10 failing frontend tests by updating React 19 patterns, fixing import paths, and updating mock data structures"

Instead of: "Implement payment flow"  
Use: "Implement Stripe subscription management with multi-tenant billing isolation, webhook handling, and payment failure recovery"

## Quality Enhancement Techniques

### Challenge and Refine Pattern
- Ask "stupid questions" to challenge assumptions
- Request alternative approaches: "What other ways could we solve this?"
- Seek elegant solutions: "Can we make this more elegant and simple?"
- Encourage thoroughness: "What edge cases should we consider?"

### Analysis Before Implementation
- "Before implementing, analyze the problem thoroughly"
- "What are the potential complications with this approach?"
- "How does this fit with our existing architecture?"
- "What are the security implications of this change?"

### Confidence Building Protocol
```
1. Initial confidence check: "Rate your confidence 1-10"
2. Analysis phase: "Count to 10 and think through this carefully"  
3. Implementation with constraints: "Ensure complete, untruncated code"
4. Post-implementation check: "Rate your confidence in this solution"
5. Challenge phase: "What could we improve about this approach?"
```

## File and Context Management

### File Reference Best Practices
- Use `@filename` to reference specific files when available
- Provide full file paths when discussing modifications
- Reference line numbers for specific changes
- Include surrounding context when showing code snippets

### Breaking Down Complex Tasks
Instead of: "Build the entire payment system"
Break into:
1. "Design the Stripe webhook handling service"
2. "Implement subscription management with RLS policies"
3. "Create billing dashboard components"
4. "Add payment failure recovery logic"
5. "Write comprehensive tests for payment flow"

## TenantFlow-Specific Prompting

### Architecture-Aware Prompting
- Always mention multi-tenant requirements: "ensure org_id filtering"
- Reference established patterns: "following the BaseCrudService pattern"
- Specify technology constraints: "using React 19 server components"
- Include security requirements: "with proper RLS policy implementation"

### Current Context Integration
- Reference current priorities: "this relates to fixing the 10 failing tests"
- Connect to active work: "this supports the Supabase migration effort"
- Link to business goals: "this enables the payment flow feature (#90)"
- Consider technical debt: "this helps address the test coverage gap"

## Validation and Quality Assurance

### Pre-Implementation Checklist
Before any significant code changes, ask:
- "Does this follow TenantFlow's established patterns?"
- "Will this maintain multi-tenant security requirements?"
- "How does this integrate with our React 19 architecture?"
- "What tests need to be written or updated?"
- "Are there any performance implications?"

### Post-Implementation Validation
After implementation, verify:
- "Does the code compile without errors?"
- "Are all imports and dependencies properly handled?"
- "Have we maintained type safety throughout?"
- "Does this solution handle error cases appropriately?"
- "How will we test this implementation?"

## Iterative Improvement Protocol

### Feedback Loop Pattern
1. **Initial Implementation**: "Here's my first approach..."
2. **Confidence Check**: "I'm 7/10 confident in this solution"
3. **Challenge Phase**: "What concerns do you have about this?"
4. **Refinement**: "Based on feedback, here's an improved version"
5. **Final Validation**: "This revised approach addresses the concerns"

### Continuous Learning Application
- Document patterns that work well
- Learn from implementation challenges
- Refine prompting based on results
- Build on successful interaction patterns
- Share effective techniques with team

## Emergency and Critical Issue Handling

### High-Priority Issue Protocol
For critical issues (like the 10 failing tests):
- Start with comprehensive analysis: "Let me understand the full scope"
- Break into manageable pieces: "I'll fix these one test file at a time"
- Validate each step: "After each fix, I'll run the specific test"
- Maintain momentum: "Once this test passes, I'll move to the next"
- Provide progress updates: "3 of 10 test files now passing"

### Risk Mitigation Prompting
- "What could go wrong if we implement this?"
- "How can we test this safely?"
- "What's our rollback plan if this fails?"
- "Are there any dependencies we haven't considered?"
- "How will this affect other parts of the system?"