# Code Maintenance Guide

## Overview

This document provides guidelines for maintaining clean, well-documented code in the ChronoWear AI project. All code comments and documentation should be in English for consistency and international collaboration.

## Documentation Standards

### File Header Comments

Every major TypeScript/JavaScript file should start with a JSDoc module comment:

```typescript
/**
 * Module Name - Brief Description
 * 
 * Detailed description of what this module does.
 * List key features and responsibilities.
 * 
 * Features:
 * - Feature 1
 * - Feature 2
 * 
 * @module path/to/module
 */
```

### Function Documentation

All exported functions should have JSDoc comments:

```typescript
/**
 * Brief function description
 * 
 * Detailed explanation of what the function does,
 * including any important implementation details.
 * 
 * @param paramName - Description of the parameter
 * @returns Description of return value
 * @throws Description of any exceptions (if applicable)
 */
export function myFunction(paramName: Type): ReturnType {
  // Implementation
}
```

### Component Documentation

React components should document their props and purpose:

```typescript
/**
 * ComponentName - Brief description
 * 
 * Detailed description of component functionality.
 * 
 * Features:
 * - Feature list
 * 
 * @param props - Component props
 * @returns React component
 */
export function ComponentName(props: Props) {
  // Implementation
}
```

### Interface/Type Documentation

Document complex types and interfaces:

```typescript
/**
 * Description of what this type represents
 * Include usage context and important fields
 */
interface MyInterface {
  /** Description of this field */
  field1: string;
  
  /** Description of this field */
  field2: number;
}
```

## Code Organization

### File Structure

```
src/
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   └── ...           # Feature-specific components
├── pages/            # Page components (route handlers)
├── utils/            # Utility functions
├── services/         # API and external service integrations
├── hooks/            # Custom React hooks
├── contexts/         # React context providers
├── lib/              # Third-party library configurations
├── types/            # TypeScript type definitions
└── integrations/     # Third-party integrations (Supabase, etc.)
```

### Naming Conventions

#### Files
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `userActivity.ts`)
- Hooks: `use*.ts` (e.g., `useWeather.ts`)
- Types: `camelCase.ts` or `index.ts`

#### Variables and Functions
- Variables: `camelCase` (e.g., `userData`)
- Functions: `camelCase` (e.g., `getUserProfile`)
- Components: `PascalCase` (e.g., `UserProfile`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_ENDPOINT`)

#### Interfaces and Types
- Interfaces: `PascalCase` (e.g., `UserProfile`)
- Type aliases: `PascalCase` (e.g., `UserRole`)
- Enums: `PascalCase` (e.g., `UserStatus`)

## Code Quality Standards

### TypeScript Usage

1. **Always define types explicitly**
   ```typescript
   // Good
   function getName(user: User): string {
     return user.name;
   }
   
   // Avoid
   function getName(user: any) {
     return user.name;
   }
   ```

2. **Use interfaces for objects, types for unions/primitives**
   ```typescript
   // Good
   interface User {
     id: string;
     name: string;
   }
   
   type UserId = string | number;
   ```

3. **Avoid type assertions when possible**
   ```typescript
   // Prefer type guards
   if (typeof value === 'string') {
     // value is string here
   }
   ```

### Error Handling

1. **Always handle errors gracefully**
   ```typescript
   try {
     await riskyOperation();
   } catch (error) {
     console.error('Operation failed:', error);
     // Handle appropriately
   }
   ```

2. **Use specific error messages**
   ```typescript
   if (!user) {
     throw new Error('User not found');
   }
   ```

3. **Log errors with context**
   ```typescript
   console.error('Failed to fetch user profile:', {
     userId,
     error: error.message
   });
   ```

### Async Operations

1. **Use async/await over .then()**
   ```typescript
   // Good
   const data = await fetchData();
   
   // Avoid
   fetchData().then(data => { ... });
   ```

2. **Handle Promise rejections**
   ```typescript
   const result = await operation().catch(error => {
     console.error('Operation failed:', error);
     return null;
   });
   ```

3. **Use Promise.race for timeouts**
   ```typescript
   const timeout = new Promise((_, reject) => 
     setTimeout(() => reject(new Error('Timeout')), 5000)
   );
   
   const result = await Promise.race([operation(), timeout]);
   ```

## React Best Practices

### Component Structure

```typescript
/**
 * Component documentation
 */
export function MyComponent({ prop1, prop2 }: Props) {
  // 1. Hooks
  const [state, setState] = useState();
  const navigate = useNavigate();
  
  // 2. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 3. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 4. Render logic
  if (loading) {
    return <Spinner />;
  }
  
  // 5. JSX
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Hooks

1. **Follow rules of hooks**
   - Only call at top level
   - Only call from React functions

2. **Use custom hooks for reusable logic**
   ```typescript
   function useUserProfile(userId: string) {
     const [profile, setProfile] = useState<Profile | null>(null);
     
     useEffect(() => {
       fetchProfile(userId).then(setProfile);
     }, [userId]);
     
     return profile;
   }
   ```

3. **Memoize expensive computations**
   ```typescript
   const expensiveValue = useMemo(() => {
     return computeExpensiveValue(data);
   }, [data]);
   ```

## Database Interactions

### Supabase Queries

1. **Always handle errors**
   ```typescript
   const { data, error } = await supabase
     .from('table')
     .select('*');
   
   if (error) {
     console.error('Query failed:', error);
     return null;
   }
   ```

2. **Use specific selects**
   ```typescript
   // Good - only fetch needed fields
   .select('id, name, email')
   
   // Avoid - fetches everything
   .select('*')
   ```

3. **Add appropriate filters**
   ```typescript
   const { data } = await supabase
     .from('profiles')
     .select('*')
     .eq('id', userId)
     .single();
   ```

## Performance Considerations

### 1. Lazy Loading

```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

### 2. Debouncing

```typescript
// Debounce search input
const debouncedSearch = useMemo(
  () => debounce((query: string) => performSearch(query), 300),
  []
);
```

### 3. Memoization

```typescript
// Memoize expensive components
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Complex rendering */}</div>;
});
```

## Testing Guidelines

### Unit Tests

```typescript
describe('getUserActivity', () => {
  it('should return user profile for authenticated user', async () => {
    const profile = await getUserActivity();
    expect(profile).toBeDefined();
    expect(profile?.id).toBeTruthy();
  });
  
  it('should return null for unauthenticated user', async () => {
    // Mock unauthenticated state
    const profile = await getUserActivity();
    expect(profile).toBeNull();
  });
});
```

## Commit Message Guidelines

Follow conventional commits format:

```
type(scope): subject

body

footer
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build process or auxiliary tool changes

### Examples
```
feat(auth): add user activity tracking

Implement login activity tracking that records:
- First login timestamp
- Last login timestamp
- Total login count

Closes #123
```

```
fix(profile): resolve avatar upload issue

Fixed issue where avatar upload would fail for large images
by implementing client-side compression before upload.
```

## Security Best Practices

### 1. Never expose secrets

```typescript
// Good - use environment variables
const apiKey = import.meta.env.VITE_API_KEY;

// Bad - hardcoded secrets
const apiKey = 'sk-1234567890';
```

### 2. Validate user input

```typescript
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### 3. Sanitize data before display

```typescript
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(userInput);
```

## Maintenance Checklist

### Before Committing

- [ ] All new code has appropriate comments
- [ ] Functions have JSDoc documentation
- [ ] No console.logs in production code (use proper logging)
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Code follows naming conventions
- [ ] Tests are written for new features
- [ ] No unused imports or variables
- [ ] Code is formatted (run `npm run format`)
- [ ] No linting errors (run `npm run lint`)

### Code Review Focus

- [ ] Clear and maintainable code
- [ ] Appropriate error handling
- [ ] Performance considerations
- [ ] Security implications
- [ ] Test coverage
- [ ] Documentation quality
- [ ] Type safety

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)

---

**Last Updated**: October 23, 2025
**Maintained by**: ChronoWear AI Team