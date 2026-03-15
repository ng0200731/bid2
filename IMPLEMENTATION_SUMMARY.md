# PO Scanner Enhancement Implementation

## Features Implemented

### 1. Last Status Display
- **Backend**: Added `/api/progress/:poNumber/last` endpoint
- **Database**: Added `getLastScanForPO()` function
- **Android**: Displays last scanned department when opening scan screen
- Shows "Initial scan" message if no previous history

### 2. Department Sequence Validation (1→2→8)
- **Backend**: Enforces strict sequence: Cutting → Sewing → Packing
- **Validation Rules**:
  - Cannot go back to previous department
  - Cannot skip departments
  - Must start with Cutting for first scan
- **Error Messages**: Clear feedback showing what went wrong and what's expected

### 3. Initial State Handling
- Detects when PO has no scan history
- Shows "Initial scan (No previous history)" status
- Enforces Cutting as first department

### 4. APK Version Check
- **Backend**: Added `/api/version/check` endpoint
- **Android**: Automatically checks version on app startup
- Shows toast notification if newer version available
- Current version: 1.0 (configurable in backend)

## Files Modified

### Backend (Node.js)
- `server.js`: Added 2 new endpoints, updated scan endpoint with validation
- `database.js`: Added `getLastScanForPO()` function

### Android (Kotlin)
- `ApiService.kt`: Added 2 new API methods
- `ScanRequest.kt`: Added response models (LastScanResponse, VersionCheckResponse)
- `MainActivity.kt`: Added last status display, version check, error handling
- `activity_main.xml`: Added TextView for last status display
- `Constants.kt`: Updated departments to Cutting, Sewing, Packing

## API Endpoints

### GET /api/progress/:poNumber/last
Returns the last scan for a PO
```json
{
  "lastScan": {
    "department": "Cutting",
    "scanned_at": "2026-03-14T10:30:00Z"
  },
  "hasHistory": true
}
```

### POST /api/progress/scan
Records a scan with validation
- Returns 400 error if sequence violated
- Error response includes helpful messages

### GET /api/version/check?version=1.0
Checks if app version is current
```json
{
  "currentVersion": "1.0",
  "latestVersion": "1.0",
  "updateRequired": false,
  "updateAvailable": false
}
```

## Testing Checklist

- [ ] Scan PO with no history → Should show "Initial scan" and only allow Cutting
- [ ] Try to scan Sewing first → Should show error
- [ ] Scan Cutting → Should succeed
- [ ] Try to scan Cutting again → Should show "cannot go back" error
- [ ] Try to scan Packing after Cutting → Should show "cannot skip" error
- [ ] Scan Sewing after Cutting → Should succeed
- [ ] Scan Packing after Sewing → Should succeed
- [ ] Version check shows on app startup
- [ ] Last status displays correctly before each scan

## Configuration

To update the latest version, modify in `server.js`:
```javascript
const latestVersion = '1.0'; // Change this value
```
