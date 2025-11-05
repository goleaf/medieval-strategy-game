# Button Icons System

## Overview

The medieval strategy game features a comprehensive icon system for all buttons throughout the application. Icons are implemented using Lucide React, providing consistent, scalable vector icons that enhance user experience and visual clarity.

## Icon Library

The application uses **Lucide React** (lucide-react) for all icons. This library provides:
- Scalable SVG icons
- Consistent design language
- Accessibility support
- Tree-shaking friendly

## Icon Usage Guidelines

### Size Standards
- **Standard buttons**: `w-4 h-4` (16px)
- **Small buttons**: `w-3 h-3` (12px)
- **Icon-only buttons**: `size-9` or `size-10`

### Spacing
- Use `gap-1` for compact spacing
- Use `gap-2` for standard spacing
- Icons should be left-aligned with text

### Color
- Icons inherit text color by default
- Use Tailwind classes for custom colors when needed
- Icons respect button variant colors (primary, secondary, destructive, etc.)

## Icon Mapping

### Navigation Icons
| Page/Action | Icon | Component |
|-------------|------|-----------|
| Dashboard/Home | `Home` | Back to Dashboard buttons |
| Map | `Map` | Map navigation |
| Attacks | `Swords` | Attack management |
| Market | `ShoppingCart` | Marketplace |
| Messages | `MessageCircle` | Message center |
| Tribes | `Users` | Tribe management |
| Leaderboard | `Trophy` | Rankings |

### Action Icons
| Action | Icon | Usage |
|--------|------|-------|
| View/Details | `Eye` | View details, inspect items |
| Edit/Modify | `Edit` | Edit settings, modify data |
| Delete/Remove | `Trash2` | Delete items, remove content |
| Add/Create | `Plus` | Add new items, create content |
| Search | `Search` | Search functionality |
| Filter | `Filter` | Filter options |
| Sort | `ArrowUpDown` | Sort data |
| Settings | `Settings` | Configuration options |

### Game-Specific Icons
| Feature | Icon | Usage |
|---------|------|-------|
| Buildings | `Hammer` | Building management |
| Troops | `Shield` | Troop management |
| Attacks | `Swords` | Combat actions |
| Training | `Sword` | Troop training |
| Upgrades | `Zap` | Upgrade actions |
| Cancel | `X` | Cancel operations |
| Target | `Target` | Target selection |
| Launch | `Swords` | Launch attacks |

### Authentication Icons
| Action | Icon | Usage |
|--------|------|-------|
| Login | `LogIn` | User login |
| Register | `UserPlus` | User registration |
| Logout | `LogOut` | User logout |

## Implementation Examples

### Basic Button with Icon
```tsx
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

<Button>
  <Eye className="w-4 h-4" />
  View Details
</Button>
```

### Icon-Only Button
```tsx
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

<Button variant="icon" size="icon">
  <Settings className="w-4 h-4" />
</Button>
```

### Navigation Link with Icon
```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Map } from "lucide-react"

<Link href="/map">
  <Button variant="ghost" size="sm">
    <Map className="w-4 h-4" />
    Map
  </Button>
</Link>
```

## Icon Implementation Status

### ✅ Completed Pages

1. **Dashboard** (`/app/dashboard/page.tsx`)
   - Navigation links: Map, Attacks, Market, Messages, Tribes, Rankings
   - Action buttons: View Details, Buildings, Troops

2. **Buildings** (`/app/village/[id]/buildings/page.tsx`)
   - Back button, Upgrade buttons

3. **Building Queue** (`/components/game/building-queue.tsx`)
   - Cancel buttons

4. **Authentication**
   - Login page: Login button
   - Register page: Register button

5. **Attack Planning** (`/components/game/attack-planner.tsx`)
   - Plan Attack, Select Troops, Cancel, Launch Attack, Back buttons

6. **Troop Training** (`/components/game/troop-trainer.tsx`)
   - Select buttons, Train button

7. **Village Management**
   - Village detail page: View, Manage Buildings, Manage Troops
   - Troops page: Back buttons

8. **Attacks** (`/app/attacks/page.tsx`)
   - Back button, View buttons

## Adding New Icons

### 1. Import the Icon
```tsx
import { NewIcon } from "lucide-react"
```

### 2. Add to Button
```tsx
<Button>
  <NewIcon className="w-4 h-4" />
  Button Text
</Button>
```

### 3. Update Documentation
Add the new icon to this document in the appropriate category.

## Accessibility Considerations

- Icons should have appropriate ARIA labels when used without text
- Screen readers can announce button text with icons
- Color should not be the only indicator of meaning
- Icons should be visually distinct and clear

## Performance Notes

- Lucide React icons are tree-shakeable
- Icons are loaded as needed, not bundled all at once
- SVG format ensures crisp display at any size
- No additional HTTP requests for icon fonts

## Maintenance

- Regularly review icon usage for consistency
- Update this documentation when adding new icons
- Test icon visibility across different themes
- Ensure icons work well on mobile devices

## Troubleshooting

### Icons not displaying
1. Check that the icon is properly imported
2. Verify the import path is correct
3. Ensure Lucide React is installed
4. Check for TypeScript errors

### Icons too small/large
1. Use standard size classes: `w-4 h-4`
2. For icon-only buttons, use `size="icon"`
3. Adjust spacing with `gap-1` or `gap-2`

### Icon color issues
1. Icons inherit text color by default
2. Use Tailwind color classes if needed
3. Check button variant styling

## Future Enhancements

- Custom icon set for medieval theme
- Animated icons for loading states
- Icon theming based on user preferences
- Accessibility improvements for screen readers

