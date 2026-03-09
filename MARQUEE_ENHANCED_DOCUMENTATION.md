# Marquee System - Enhanced with Icon Picker and Toggle Feature

## Overview
The marquee system has been enhanced with:
1. **Icon Picker** - Visual interface to select from 32+ popular emojis
2. **Enable/Disable Toggle** - Temporarily disable items without deleting them
3. **Database Support** - `is_enabled` field to track active/inactive status
4. **Hard Delete** - Permanently remove items from database

## Database Changes

### New Column: `is_enabled`
```sql
ALTER TABLE marquee_items
ADD is_enabled BIT NOT NULL DEFAULT 1;
```

**Migration Files Created:**
- [update_marquee_schema.sql](update_marquee_schema.sql) - SQL script
- [run_schema_migration.js](run_schema_migration.js) - Migration runner

### Field Purpose:
- `is_enabled = 1`: Item is visible in marquee (default)
- `is_enabled = 0`: Item is hidden from marquee but still in database
- Delete: Permanently removes item from database (hard delete)

## Backend API

### Updated Endpoints:

**GET /api/marquee-items** (Public)
- Fetches only items where `is_enabled = 1`
- Response includes `is_enabled` field

**POST /api/marquee-items** (Protected)
- Creates new item with `is_enabled = 1` by default

**PUT /api/marquee-items/:id** (Protected)
- Updates text_content, icon, and is_enabled status

**DELETE /api/marquee-items/:id** (Protected)
- Permanently deletes item from database

**PATCH /api/marquee-items/:id/toggle** (Protected) **[NEW]**
- Toggles `is_enabled` status (0 ↔ 1)
- Returns updated item with new status

### Example Toggle Request:
```javascript
PATCH /api/marquee-items/5/toggle
Authorization: Bearer <token>

// Response:
{
  "success": true,
  "message": "Item disabled",
  "item": {
    "id": 5,
    "text_content": "Update text",
    "icon": "✅",
    "display_order": 2,
    "is_enabled": 0
  }
}
```

## Frontend Components

### New Component: IconPicker
**File:** [src/components/IconPicker.jsx](src/components/IconPicker.jsx)

**Features:**
- 32+ pre-selected emoji icons
- Searchable icon grid
- Click to select or type custom emoji
- Clear and Done buttons
- Visual feedback for selected icon

**Available Icons:**
```
🔄 📊 ✅ 🎯 📝 👁️ 📋 ✏️
📖 ⚙️ 🚀 💡 ⭐ 🎉 📢 🔔
⚠️ ❌ ✔️ 🔐 🔓 📌 📍 🗂️
💼 📁 🎯 🏆 🎪 🎭 🎨 🔧
🛠️ ⚡ 🌟 💎 🔥 💪 👍 ❌
```

### Updated Home Component
**File:** [src/components/Home.jsx](src/components/Home.jsx)

**New State Variables:**
```javascript
const [showIconPickerNew, setShowIconPickerNew] = useState(false);     // Add section
const [showIconPickerEdit, setShowIconPickerEdit] = useState(false);   // Edit section
```

**New Functions:**
```javascript
handleToggleMarqueeItem(id)  // Toggle enable/disable status
```

### Marquee Editor Modal Enhanced

**Add New Update Section:**
- Icon picker button (🔷) - Click to open icon picker
- Text input field - Enter update message
- Add button - Save new item

**Current Updates List:**
For each item, now shows:
- ✓ Toggle button: Click to enable/disable (green = enabled, gray = disabled)
- ✏️ Edit button: Click to edit text and icon
- 🗑️ Delete button: Permanently remove item

## Styling

### New CSS Classes:

**Icon Input:**
```css
.icon-input-wrapper       /* Container for icon picker */
.icon-input-btn           /* Toggle button to open picker */
```

**Toggle Button:**
```css
.marquee-action-btn.toggle-btn
```

**File:** [src/styles/Home.css](src/styles/Home.css)
**File:** [src/styles/IconPicker.css](src/styles/IconPicker.css)

## User Workflow

### Adding a New Update:

1. Click ✏️ edit button on marquee
2. In "Add New Update" section:
   - Click icon button (🔷) to select icon
   - Choose from list or type custom emoji
   - Click "Done" to close picker
   - Enter update text in input field
   - Click "Add" button
3. New item appears in list with toggle enabled (✓)

### Editing Existing Update:

1. Find the item in "Current Updates" list
2. Click ✏️ edit button
3. Edit icon: Click icon picker button, select new icon
4. Edit text: Modify text in input field
5. Click "Save" or "Cancel"
6. Item updates immediately in list

### Disabling Item (Temporary):

1. Find the item in list
2. Click toggle button (✓ = enabled, ○ = disabled)
3. Toggled off items still exist in database
4. Toggle back on to re-enable

### Deleting Item (Permanent):

1. Find the item in list
2. Click 🗑️ delete button
3. Confirm deletion
4. Item permanently removed from database

## Data Persistence

| Action | Database | Marquee Display |
|--------|----------|-----------------|
| Add item | Created with `is_enabled=1` | Visible immediately |
| Toggle Off | `is_enabled` set to 0 | Hidden from marquee |
| Toggle On | `is_enabled` set to 1 | Visible again |
| Delete | Hard deleted | Removed (cannot restore) |

## Technical Details

### Migration Files:
- [add_marquee_permission.sql](add_marquee_permission.sql) - Permission setup
- [database_schema_marquee.sql](database_schema_marquee.sql) - Original schema
- [update_marquee_schema.sql](update_marquee_schema.sql) - Schema update
- [run_marquee_migration.js](run_marquee_migration.js)
- [run_permission_migration.js](run_permission_migration.js)
- [run_schema_migration.js](run_schema_migration.js)

### Permission Required:
- **MARQUEE_EDIT** - Allows users to manage marquee updates
- Default assigned to: Admin role, Editor role

### File Changes:
- ✅ [src/components/Home.jsx](src/components/Home.jsx) - Icon pickers, toggle function
- ✅ [src/components/IconPicker.jsx](src/components/IconPicker.jsx) - NEW
- ✅ [src/styles/Home.css](src/styles/Home.css) - Icon button, toggle styling
- ✅ [src/styles/IconPicker.css](src/styles/IconPicker.css) - NEW
- ✅ [server/controllers/marqueeController.js](server/controllers/marqueeController.js) - Toggle endpoint, hard delete
- ✅ [server/routes/api.js](server/routes/api.js) - PATCH route for toggle

## Testing Checklist

- [ ] Icon picker opens when clicking icon button
- [ ] Can select emoji from icon list
- [ ] Can type custom emoji in search field
- [ ] Toggle button changes appearance when clicked
- [ ] Items disabled (toggled off) don't show in marquee
- [ ] Items can be toggled back on
- [ ] Delete permanently removes items
- [ ] Edit updates are saved correctly
- [ ] All changes reflect immediately after API call
- [ ] Permission check hides edit button for unauthorized users

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (emoji rendering may vary)

## Future Enhancements
- Drag-and-drop reordering
- Scheduled enable/disable
- Item preview in marquee before saving
- Emoji search by category
- Custom color themes for items
