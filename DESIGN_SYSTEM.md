# ChronoWear Design System

## Core Design Principles

1. **Minimalism**: Clean, uncluttered interfaces with purposeful whitespace
2. **Consistency**: Unified visual language across all pages
3. **Mobile-First**: Optimized for touch and small screens
4. **Luxury Aesthetic**: Farfetch-inspired monochromatic palette with subtle accents

## Color System

All colors use HSL format and semantic tokens from `src/index.css`:

### Light Mode
- **Primary**: `hsl(0 0% 10%)` - Pure black for main actions
- **Secondary**: `hsl(0 0% 96%)` - Light gray backgrounds
- **Accent**: `hsl(38 60% 50%)` - Subtle gold for highlights
- **Background**: `hsl(0 0% 100%)` - White
- **Border**: `hsl(0 0% 92%)` - Subtle dividers

### Dark Mode
- **Primary**: `hsl(0 0% 100%)` - White for main actions
- **Secondary**: `hsl(0 0% 18%)` - Dark gray backgrounds
- **Background**: `hsl(0 0% 10%)` - Dark background

## Typography

### Headings
- Font: `font-sans` (system font)
- Weight: `300` (Light)
- Transform: `uppercase`
- Letter spacing: `0.04em`
- Sizes:
  - H1: `text-2xl sm:text-3xl`
  - H2: `text-xl sm:text-2xl`

### Body Text
- Font: `font-sans`
- Letter spacing: `0.02em`
- Sizes:
  - Default: `text-sm sm:text-base`
  - Small: `text-xs sm:text-sm`

## Spacing

Use consistent spacing units:
- Small gap: `gap-2` (0.5rem)
- Medium gap: `gap-4` (1rem)
- Large gap: `gap-6` (1.5rem)
- Section spacing: `space-y-4 sm:space-y-6`

## Components

### Buttons

**Primary Actions**
```tsx
<Button variant="default">Primary Action</Button>
```
- Background: `bg-primary`
- Text: `text-primary-foreground`
- Hover: `hover:bg-primary/90`

**Secondary Actions**
```tsx
<Button variant="outline">Secondary Action</Button>
```
- Background: `bg-background`
- Border: `border-input`
- Hover: `hover:bg-accent`

**Icon Buttons**
```tsx
<Button size="icon" variant="ghost">
  <Heart className="w-4 h-4" />
</Button>
```
- Consistent size: `w-4 h-4` for icons
- Ghost variant for minimal UI

### Cards

**Standard Card**
```tsx
<Card className="overflow-hidden">
  <CardContent className="p-0">
    {/* Content */}
  </CardContent>
</Card>
```
- No borders by default (minimalist)
- Shadow: `shadow-soft` or `shadow-medium`
- Rounded: `rounded-lg`
- Remove padding when containing images: `p-0`

**Hover Effect**
```tsx
<Card className="transition-all hover:shadow-large cursor-pointer">
```

### Badges

```tsx
<Badge variant="outline">{text}</Badge>
```
- Use `variant="outline"` for subtle, minimal appearance
- Small text: `text-xs`

### Icons

**Unified Icon Sizes**
- Small: `w-4 h-4` (buttons, inline)
- Medium: `w-5 h-5` (list items)
- Large: `w-6 h-6` (headers, emphasis)
- Extra Large: `w-8 h-8` or `w-10 h-10` (hero sections)

**Common Icons**
- Heart (favorite): `<Heart className="w-4 h-4" />`
- Add: `<Plus className="w-4 h-4" />`
- Delete: `<Trash2 className="w-4 h-4" />`
- Calendar: `<Calendar className="w-4 h-4" />`
- Location: `<MapPin className="w-4 h-4" />`
- Weather: `<Cloud className="w-4 h-4" />`

### Selected/Active States

**Checkbox/Selection**
```tsx
className={cn(
  "transition-all",
  isSelected && "ring-2 ring-primary"
)}
```
- Use ring instead of border for selection
- Consistent: `ring-2 ring-primary`

**Active Navigation**
```tsx
className={cn(
  "transition-colors",
  isActive && "text-primary"
)}
```

**Favorite/Like State**
```tsx
<Heart className={cn("w-4 h-4", isLiked && "fill-current text-accent")} />
```
- Filled heart with accent color when liked

## Animations

All animations use semantic tokens from `tailwind.config.ts`:

### Transitions
- Default: `transition-all duration-300`
- Fast: `transition-colors duration-200`
- Custom: `var(--transition-smooth)` or `var(--transition-fast)`

### Common Animations
```tsx
// Fade in
className="animate-fade-in"

// Scale on hover
className="hover:scale-105 transition-transform"

// Loading spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
```

## Shadows

Use design system tokens:
- Soft: `shadow-soft` - `0 1px 2px hsl(0 0% 0% / 0.02)`
- Medium: `shadow-medium` - `0 2px 8px hsl(0 0% 0% / 0.04)`
- Large: `shadow-large` - `0 4px 16px hsl(0 0% 0% / 0.06)`
- Gold accent: `shadow-gold` - `0 2px 12px hsl(38 60% 50% / 0.1)`

**Avoid**: Creating custom shadows. Use existing tokens.

## Layout Patterns

### Page Container
```tsx
<div className="space-y-4 sm:space-y-6">
  {/* Page content */}
</div>
```

### Mobile-First Grid
```tsx
// 1 column mobile, 2 columns tablet, 3+ columns desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Responsive Flex
```tsx
<div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
```

### Image Aspect Ratios
```tsx
// Square
className="aspect-square object-cover"

// Portrait (3:4)
className="aspect-[3/4] object-cover"

// Landscape (16:9)
className="aspect-video object-cover"
```

## Mobile Optimization

### Touch Targets
- Minimum size: `h-10` (40px) for buttons
- Icon buttons: `h-10 w-10`
- Adequate spacing: `gap-3` minimum between interactive elements

### Safe Areas
```tsx
className="safe-bottom" // Adds padding for iPhone notch/home indicator
```

### Responsive Text
```tsx
className="text-sm sm:text-base" // Smaller on mobile
className="text-2xl sm:text-3xl" // Headings scale up on larger screens
```

## Borders & Dividers

**Minimize Borders**
- Use shadows instead of borders when possible
- When borders are needed: `border-border` (uses design system)
- Subtle dividers: `border-t` or `border-b`

**DON'T USE**:
- Dashed borders (`border-dashed`)
- Multiple nested borders
- Heavy border weights

## Image Handling

### Product/Garment Images
```tsx
<img 
  src={imageUrl} 
  alt="Description"
  className="w-full aspect-square object-cover rounded-lg"
/>
```

### Avatar/Profile Images
```tsx
<img 
  className="w-10 h-10 rounded-full object-cover"
/>
```

## Forms

### Input Fields
```tsx
<Input 
  placeholder="Placeholder text"
  className="text-sm"
/>
```

### Labels
```tsx
<Label className="text-sm font-medium">Label Text</Label>
```

### Form Spacing
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label>Field 1</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Field 2</Label>
    <Input />
  </div>
</div>
```

## Loading States

### Spinner
```tsx
<div className="flex items-center justify-center">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
</div>
```

### Skeleton
```tsx
<div className="animate-pulse bg-muted rounded-lg h-40" />
```

## Common Patterns

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="w-12 h-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium mb-2">No items yet</h3>
  <p className="text-sm text-muted-foreground mb-4">
    Get started by adding your first item
  </p>
  <Button>Add Item</Button>
</div>
```

### Item List/Grid
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
  {items.map(item => (
    <Card key={item.id} className="overflow-hidden">
      <CardContent className="p-0">
        <img className="aspect-square object-cover" />
        <div className="p-3">
          <h3 className="text-sm font-medium truncate">{item.name}</h3>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Dialog/Modal
```tsx
<Dialog>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

## Accessibility

- Use semantic HTML elements
- Proper heading hierarchy (H1 → H2 → H3)
- Alt text for all images
- Aria labels for icon-only buttons
- Keyboard navigation support
- Sufficient color contrast (WCAG AA minimum)

## Don'ts

❌ Custom colors outside design system  
❌ Dashed/dotted borders for decorative purposes  
❌ Inconsistent icon sizes  
❌ Text smaller than `text-xs`  
❌ Multiple font families  
❌ Bright, saturated colors (maintain monochromatic luxury feel)  
❌ Heavy animations or transitions  
❌ Cluttered layouts with insufficient whitespace
