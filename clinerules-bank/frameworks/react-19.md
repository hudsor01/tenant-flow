# React 19 Specific Rules

## Development Environment
- **Turbopack Required**: Use `npm run dev` which auto-configures Turbopack
- **Webpack Incompatible**: React 19 breaks with traditional webpack builds
- **Node Version**: Requires Node.js 22+ for optimal compatibility

## Component Architecture
- **Server Components Default**: Every component is server-rendered unless marked
- **Client Component Marking**: Explicit 'use client' directive required
- **Minimal Client Logic**: Keep client components focused on interactivity only
- **Data Fetching**: Server components handle data fetching, pass to client

## Testing with React 19
- **Act() Wrapping**: All state updates in tests must use act()
- **Async Rendering**: Proper async/await patterns for component testing
- **Mock Updates**: Update mocks to match React 19 behavior
- **Testing Library**: Use latest @testing-library/react version

## New React 19 Features to Leverage
- **use() Hook**: For reading promises and context outside components
- **Concurrent Features**: Improved suspense and error boundaries
- **Server Actions**: Direct form actions from server components
- **Optimistic Updates**: Built-in optimistic state management

## Migration Patterns
```typescript
// Before (React 18)
export function Component() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetchData().then(setData)
  }, [])
  return <div>{data?.title}</div>
}

// After (React 19 Server Component)
export default async function Component() {
  const data = await fetchData()
  return <div>{data.title}</div>
}
```

## Performance Optimizations
- **Server-Side Rendering**: Default SSR for better performance
- **Selective Hydration**: Only hydrate interactive components
- **Streaming**: Leverage React 19's improved streaming capabilities
- **Bundle Splitting**: Dynamic imports for client components only