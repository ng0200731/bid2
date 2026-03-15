# Department Sequence Update

## Changes Made

### 1. Full 8-Department Sequence
Updated from 3 departments to 8 departments:

**Sequence: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**

1. CS Team
2. PMC
3. Material
4. Production
5. Cut and Fold
6. QC
7. Shipment
8. Account

### 2. Present Department Display
- Shows current/last department after scanning QR code
- Displays "Present Department: [Department Name]"
- Shows "None (Start with CS Team)" if no previous scans
- Blue text color (#2196F3)

### 3. Strict Sequential Validation
- **No jumping**: Must go 1→2→3→4→5→6→7→8 in order
- **No going back**: Cannot repeat or go to previous department
- **Example**: If at "Cut and Fold" (5), next must be "QC" (6)
- **First scan**: Must start with "CS Team" (1)

### 4. Error Messages
Backend returns clear error messages:
- "Cannot go back or repeat department"
- "Cannot skip departments. Must follow sequence 1→2→3→4→5→6→7→8"
- "First scan must be CS Team (Department 1)"
- Shows next expected department

## Files Modified

### Backend
- `server.js`: Updated validation logic with 8-department sequence
- Department status mapping updated

### Android
- `Constants.kt`: Updated DEPARTMENTS array with 8 departments
- `MainActivity.kt`: Added fetchPresentDepartment() function
- `activity_main.xml`: Added tvPresentDepartment TextView

## Testing Scenarios

1. **New PO (no history)**
   - Scan QR → Shows "Present Department: None (Start with CS Team)"
   - Try to save "PMC" → Error: "First scan must be CS Team"
   - Save "CS Team" → Success

2. **PO at Cut and Fold (5)**
   - Scan QR → Shows "Present Department: Cut and Fold"
   - Try to save "Shipment" (7) → Error: "Cannot skip departments"
   - Try to save "Production" (4) → Error: "Cannot go back"
   - Save "QC" (6) → Success

3. **Complete sequence**
   - CS Team → PMC → Material → Production → Cut and Fold → QC → Shipment → Account
   - Each step must follow in order

## UI Flow

1. User scans QR code
2. App shows:
   - PO Number: 1309583
   - Present Department: [Current Department or None]
   - Department dropdown (all 8 departments)
   - Notes field
   - Save button
3. User selects next department and saves
4. Backend validates sequence
5. Shows error if invalid, success if valid
