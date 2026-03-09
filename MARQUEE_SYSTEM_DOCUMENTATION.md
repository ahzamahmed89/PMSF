# Marquee System - Database Implementation

## Overview
The marquee system on the Home page has been upgraded to store updates in a database table instead of localStorage. Users with admin rights or USER_MANAGEMENT permission can now add, edit, and delete multiple marquee items.

## Database Schema

### Table: `marquee_items`
```sql
CREATE TABLE marquee_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    text_content NVARCHAR(500) NOT NULL,
    icon NVARCHAR(10) NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIME DEFAULT GETDATE(),
    updated_by NVARCHAR(100) NULL
);
```

## Backend API Endpoints

### GET `/api/marquee-items`
- **Description**: Retrieve all active marquee items
- **Authentication**: Not required (public)
- **Response**: Array of marquee items ordered by display_order

### POST `/api/marquee-items`
- **Description**: Add a new marquee item
- **Authentication**: Required (JWT token)
- **Body**: 
  ```json
  {
    "text_content": "Your update text",
    "icon": "🔄" // Optional emoji
  }
  ```

### PUT `/api/marquee-items/:id`
- **Description**: Update an existing marquee item
- **Authentication**: Required (JWT token)
- **Body**:
  ```json
  {
    "text_content": "Updated text",
    "icon": "✅",
    "is_active": true
  }
  ```

### DELETE `/api/marquee-items/:id`
- **Description**: Soft delete a marquee item (sets is_active to 0)
- **Authentication**: Required (JWT token)

### POST `/api/marquee-items/reorder`
- **Description**: Reorder multiple marquee items
- **Authentication**: Required (JWT token)
- **Body**:
  ```json
  {
    "items": [
      {"id": 1, "display_order": 1},
      {"id": 2, "display_order": 2}
    ]
  }
  ```

## Frontend Features

### Marquee Display
- Shows all active marquee items in a scrolling banner
- Items are separated by " • " 
- Each item displays its optional icon followed by text content
- Located near the bottom of the home page above the menu
- Pauses scrolling on hover

### Marquee Editor (Admin Only)
- Accessible by clicking the ✏️ button (visible only to admins or users with USER_MANAGEMENT permission)
- **Add New Update**: Enter icon (optional) and text, then click Add
- **Edit Existing**: Click ✏️ on any item to edit, then Save or Cancel
- **Delete Item**: Click 🗑️ to remove an item (with confirmation)
- **View All Items**: Shows count and list of all current updates

## Files Modified

### Backend
1. **server/controllers/marqueeController.js** (NEW)
   - `getMarqueeItems()` - Fetch active items
   - `addMarqueeItem()` - Add new item
   - `updateMarqueeItem()` - Update item
   - `deleteMarqueeItem()` - Soft delete item
   - `reorderMarqueeItems()` - Reorder items

2. **server/routes/api.js**
   - Added marquee routes with authentication middleware

3. **database_schema_marquee.sql** (NEW)
   - SQL migration script to create table and insert defaults

4. **run_marquee_migration.js** (NEW)
   - Migration runner script

### Frontend
1. **src/components/Home.jsx**
   - Changed state from single `marqueeText` to `marqueeItems` array
   - Added `fetchMarqueeItems()` to load from database
   - Complete marquee editor with add/edit/delete functionality
   - Integrated authentication checks for edit button visibility

2. **src/styles/Home.css**
   - Comprehensive styling for marquee editor modal
   - Styled add section, items list, edit/delete buttons
   - Responsive input fields and action buttons

## Permission Check
The marquee editor is accessible to users who have the **MARQUEE_EDIT** permission assigned to their role.

### Assigning Marquee Edit Rights
1. Log in to the Admin Panel as an administrator
2. Go to the **Roles** tab
3. Select or create a role (e.g., "Editor", "Manager", etc.)
4. Assign the **MARQUEE_EDIT** permission to that role
5. Add users to that role

### Default Setup
- **Admin** role has MARQUEE_EDIT permission by default
- **Editor** role is created automatically with MARQUEE_EDIT permission
- Other roles need to be manually granted this permission via Admin Panel

## Usage Instructions

### For Administrators
1. Log in with admin credentials
2. On the Home page, locate the marquee banner near the bottom
3. Click the ✏️ (edit) button to open the marquee editor
4. **To add**: Enter icon and text in the "Add New Update" section, click Add
5. **To edit**: Click ✏️ on an item, modify the text/icon, click Save
6. **To delete**: Click 🗑️ on an item, confirm deletion
7. Click Close when finished

### For Users
- View scrolling updates at the bottom of the home page
- Hover over marquee to pause scrolling for easier reading
- Cannot edit unless granted appropriate permissions

## Default Marquee Items
The system comes with 4 default items:
1. 🔄 Quiz system enhanced with per-question time allocation
2. 📊 New visit data visualization features added
3. ✅ Performance improvements implemented
4. 🎯 Product Knowledge quiz system optimized

## Technical Notes
- Items are soft-deleted (is_active set to 0) to maintain audit trail
- Display order is automatically assigned when adding new items
- All database operations track created_by and updated_by for auditing
- Frontend fetches fresh data after each modification
- Scrolling animation is implemented in pure CSS for performance

## Future Enhancements (Optional)
- Drag-and-drop reordering
- Expiration dates for time-sensitive updates
- Rich text formatting support
- Update categories or tags
- Admin dashboard for marquee analytics
