# Development Guidelines

This document outlines the coding standards, patterns, and best practices for contributing to Dockerflare. Following these guidelines ensures consistent, maintainable, and high-quality code.

## 💻 Code Style & Standards

### TypeScript Best Practices

**Type Safety First:**

```typescript
// ✅ Good: Explicit types
interface User {
  id: string;
  name: string;
  role: "admin" | "user";
}

// ❌ Bad: Any type or implicit any
interface User {
  id: any; // Avoid any
  name; // Implicit any
  role: string; // Too broad
}
```

**Function Signatures:**

```typescript
// ✅ Good: Descriptive parameter names and return types
async function getContainer(
  hostUrl: string,
  containerId: string,
): Promise<Container> {
  // Implementation
}

// ❌ Bad: Generic parameter names, implicit return types
async function get(c: string, i: string) {
  // Implementation
}
```

### Component Patterns

**Functional Components with Hooks:**

```tsx
// ✅ Good: Custom hook for data fetching
function useContainers(hostUrl: string) {
  return useQuery({
    queryKey: ["containers", hostUrl],
    queryFn: () => trpc.docker.getContainers.query({ hostUrl }),
  });
}

function ContainerList({ hostUrl }: { hostUrl: string }) {
  const { data: containers, isLoading } = useContainers(hostUrl);

  if (isLoading) return <Loading />;

  return (
    <div>
      {containers?.map((container) => (
        <ContainerCard key={container.Id} container={container} />
      ))}
    </div>
  );
}
```

**Props Interface:**

```tsx
// ✅ Good: Define props interface
interface ContainerCardProps {
  container: Container;
  onAction?: (action: ContainerAction, containerId: string) => void;
}

function ContainerCard({ container, onAction }: ContainerCardProps) {
  // Implementation
}
```

## 🏗️ Architecture Patterns

### API Layer Structure

**tRPC Router Organization:**

```typescript
// ✅ Good: Logical grouping
export const dockerRouter = router({
  // Host management
  getHosts: publicProcedure.query(/* ... */),
  syncHosts: publicProcedure.mutation(/* ... */),

  // Container operations
  getContainers: publicProcedure
    .input(z.object({ hostUrl: z.string() }))
    .query(/* ... */),

  performContainerAction: publicProcedure
    .input(
      z.object({
        hostUrl: z.string(),
        containerId: z.string(),
        action: z.enum(["start", "stop", "restart"]),
      }),
    )
    .mutation(/* ... */),
});
```

**Input Validation:**

```typescript
// ✅ Good: Comprehensive validation
const createContainerSchema = z.object({
  hostUrl: z.string().url(),
  config: z.object({
    name: z.string().optional(),
    image: z.string().min(1),
    env: z.array(z.string()).optional(),
  }),
});

// ❌ Bad: No validation
function createContainer(data: any) {
  // Unsafe usage of data
}
```

## 🎨 UI/UX Guidelines

### Component Design

**Consistent Spacing:**

```tsx
// ✅ Good: Use Tailwind spacing scale
<div className="space-y-4">
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Container Name</h3>
      <Badge variant="secondary">Running</Badge>
    </div>
  </Card>
</div>
```

**Loading States:**

```tsx
// ✅ Good: Use Skeleton loaders
function ContainerList({ containers, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Normal render
}
```

**Error Handling:**

```tsx
// ✅ Good: User-friendly error messages
function ContainerActions({ containerId }) {
  const { mutate, isLoading, error } = useContainerAction();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to perform action: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Button
      onClick={() => mutate({ containerId, action: "start" })}
      disabled={isLoading}
    >
      {isLoading ? <Loader className="animate-spin" /> : <Play />}
      Start
    </Button>
  );
}
```

## 🔒 Security Guidelines

### Input Validation

**Client and Server Validation:**

```typescript
// ✅ Good: Double validation
const containerActionSchema = z.object({
  containerId: z.string().regex(/^[a-f0-9]{64}$/), // Docker container ID format
  action: z.enum(["start", "stop", "restart"]),
});

export const performContainerAction = publicProcedure
  .input(containerActionSchema)
  .mutation(async ({ input }) => {
    // Server-side validation already passed
    return await dockerAPI.performAction(input);
  });
```

### Authentication & Authorization

**Secure API Access:**

```typescript
// ✅ Good: Proper authentication checks
const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
```

## 📝 Commit Guidelines

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Testing related changes
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(containers): add bulk container actions
fix(dashboard): resolve memory leak in activity feed
docs(api): update WebSocket endpoint documentation
style(components): format ContainerCard with Prettier
refactor(api): extract container validation logic
test(components): add ContainerActions test coverage
chore(deps): update React to v19
```

### Branch Naming

```
<type>/<description>
```

**Examples:**

- `feat/container-terminal`
- `fix/websocket-connection`
- `docs/api-reference`
- `refactor/docker-client`

## 🔍 Code Review Checklist

**Before submitting a PR:**

- [ ] Code follows TypeScript best practices
- [ ] All type errors resolved
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No console.log statements left in production code
- [ ] Security review completed for user inputs

**PR Description Template:**

```markdown
## Description

Brief description of the changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security review completed
```

## 🎯 Performance Guidelines

### Bundle Size Management

**Code Splitting:**

```typescript
// ✅ Good: Lazy load heavy components
const Terminal = lazy(() => import('@/components/Terminal'));

function ContainerDetail({ containerId }) {
  const [showTerminal, setShowTerminal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowTerminal(true)}>Open Terminal</button>
      {showTerminal && (
        <Suspense fallback={<div>Loading terminal...</div>}>
          <Terminal containerId={containerId} />
        </Suspense>
      )}
    </div>
  );
}
```

### React Optimization

**Memoization:**

```tsx
// ✅ Good: Memoize expensive computations
const containerStats = useMemo(() => {
  return containers.map((container) => ({
    id: container.Id,
    cpuPercent: calculateCpuPercent(container),
    memoryUsage: calculateMemoryUsage(container),
  }));
}, [containers]);
```

**Callback Stability:**

```tsx
// ✅ Good: Stable callbacks with useCallback
const handleContainerAction = useCallback(
  (action, containerId) => {
    mutate({ action, containerId });
  },
  [mutate],
);
```

These guidelines ensure Dockerflare remains maintainable, performant, and secure as it grows. Always consider the impact of changes on the overall architecture and user experience.
