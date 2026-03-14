# PO Scanner Android App

Android application for scanning QR codes on Purchase Orders (POs) and tracking their progress through different departments.

## Features

- **QR Code Scanning**: Uses device camera to scan QR codes on PO documents
- **Department Tracking**: Records which department has processed each PO
- **Notes**: Optional field for additional information
- **Real-time Sync**: Saves data directly to backend database via API

## Requirements

- Android device or emulator with:
  - Minimum SDK: API 24 (Android 7.0)
  - Camera support
  - Internet connectivity

## Setup Instructions

### 1. Configure API Endpoint

Before building the app, update the server IP address in:

**File**: `app/src/main/java/com/ebrandid/poscanner/utils/Constants.kt`

```kotlin
const val BASE_URL = "http://YOUR_SERVER_IP:8767/"
```

Replace `YOUR_SERVER_IP` with:
- Your computer's local IP address (e.g., `192.168.1.100`)
- Or use `10.0.2.2` if testing with Android emulator (points to host machine)

### 2. Ensure Backend is Running

Make sure your Express.js server is running:

```bash
cd d:\project\BID2
node server.js
```

Server should be accessible at `http://YOUR_IP:8767`

### 3. Build the App

#### Option A: Using Android Studio
1. Open Android Studio
2. Select "Open an Existing Project"
3. Navigate to `d:\project\BID2\android`
4. Wait for Gradle sync to complete
5. Click "Run" or press Shift+F10

#### Option B: Using Command Line
```bash
cd d:\project\BID2\android
gradlew assembleDebug
```

The APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on Device

#### Via Android Studio:
- Connect device via USB with USB debugging enabled
- Click "Run" button

#### Via ADB:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Usage

1. **Launch App**: Opens camera scanner
2. **Scan QR Code**: Point camera at PO QR code
3. **Select Department**: Choose from dropdown:
   - CS Team
   - PMC
   - Material
   - Production
   - Cut and Fold
   - QC
   - Shipment
   - Account
4. **Add Notes** (optional): Enter any additional information
5. **Save**: Records the scan in database
6. **Scan Again**: Returns to scanner for next PO

## Testing

### Generate Test QR Codes

Use any QR code generator with PO numbers from your database:
- https://www.qr-code-generator.com/
- Or use: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=1300371`

### Verify Data Saved

Check database:
```bash
sqlite3 ebrandid.db "SELECT * FROM progress_tracking ORDER BY scanned_at DESC LIMIT 5;"
```

Or via web interface:
```
http://localhost:8767/po/1300371
```

## Troubleshooting

### Camera Not Working
- Grant camera permission when prompted
- Check device has working camera
- Restart app if camera freezes

### Network Errors
- Verify server is running on port 8767
- Check device is on same network as server
- Ping server IP from device browser
- Disable firewall temporarily for testing

### QR Code Not Detected
- Ensure good lighting
- Hold camera steady
- QR code should be clear and in focus
- Try different distances from QR code

### API Errors
- Check server logs for errors
- Verify API endpoint in Constants.kt
- Test API with curl:
  ```bash
  curl -X POST http://YOUR_IP:8767/api/progress/scan \
    -H "Content-Type: application/json" \
    -d '{"poNumber":"1300371","department":"PMC","notes":"test"}'
  ```

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/ebrandid/poscanner/
│   │   │   ├── MainActivity.kt          # Form screen
│   │   │   ├── ScannerActivity.kt       # QR scanner
│   │   │   ├── api/
│   │   │   │   ├── ApiService.kt        # Retrofit interface
│   │   │   │   └── ApiClient.kt         # HTTP client
│   │   │   ├── models/
│   │   │   │   └── ScanRequest.kt       # Data models
│   │   │   └── utils/
│   │   │       └── Constants.kt         # Configuration
│   │   ├── res/
│   │   │   ├── layout/                  # UI layouts
│   │   │   └── values/                  # Strings, colors, themes
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
└── build.gradle.kts
```

## Dependencies

- **CameraX**: Camera access and preview
- **ML Kit**: QR code detection
- **Retrofit**: HTTP API calls
- **Gson**: JSON parsing
- **Material Components**: UI design

## API Integration

**Endpoint**: `POST /api/progress/scan`

**Request Body**:
```json
{
  "poNumber": "1300371",
  "department": "PMC",
  "notes": "Optional notes"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Scan recorded successfully"
}
```

## License

Internal use only - eBrandID
