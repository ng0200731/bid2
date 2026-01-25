# E-BrandID Web Interface - User Guide

## Overview

The E-BrandID Web Interface provides a simple, minimal web-based interface for managing artwork downloads and order status. The interface features a split-screen layout with a 20% sidebar for navigation and an 80% main panel for content.

## Starting the Web Server

```bash
npm run server
```

The server will start at: **http://localhost:3000**

## Interface Layout

### Left Sidebar (20%)
- **Download Artwork** - Download artwork files for PO numbers
- **Order Status** - View order status (coming soon)

### Right Panel (80%)
- Dynamic content area that changes based on selected function

## Features

### 1. Download Artwork

**How to use:**
1. Click "Download Artwork" in the left sidebar
2. Enter PO number(s) in the text area (one per line)
   ```
   1303061
   1307938
   ```
3. Click "Start Download"
4. Monitor real-time progress in the progress log
5. View results in the summary table

**Progress Display:**
- Real-time log showing each step of the download process
- Color-coded messages (blue=info, green=success, red=error)
- Auto-scrolling to show latest updates

**Results Table:**
- PO Number
- Status (Success/Failed/Partial)
- Items Processed
- Files Downloaded
- Total Size
- Error Count

### 2. Order Status (Coming Soon)

Placeholder for future order status functionality.

## Design Specifications

- **Background:** White
- **Borders:** 1px solid black on all tables and divs
- **Typography:** Arial, sans-serif
- **Layout:** Fixed 20/80 split-screen design
- **Buttons:** Black borders with hover states
- **Active State:** Black background with white text

## API Endpoints

The web interface communicates with the backend through these endpoints:

- `POST /api/download` - Start artwork download job
- `GET /api/status/:jobId` - Get job status and progress
- `GET /api/downloads` - List all download history
- `GET /api/downloads/:poNumber` - Get files for specific PO

## File Structure

```
d:\project\BID2\
├── public/
│   ├── index.html          # Main HTML interface
│   ├── style.css           # Minimal styling with black borders
│   └── app.js              # Frontend JavaScript
├── server.js               # Express backend server
├── index.js                # Artwork downloader core
├── config.json             # Configuration
└── downloads/              # Downloaded files organized by PO
```

## Usage Examples

### Single PO Download
1. Enter: `1303061`
2. Click "Start Download"
3. Wait for completion

### Multiple PO Download
1. Enter:
   ```
   1303061
   1307938
   1308245
   ```
2. Click "Start Download"
3. Monitor progress for each PO

## Technical Details

- **Frontend:** Vanilla JavaScript (no frameworks)
- **Backend:** Node.js + Express
- **Automation:** Playwright for browser automation
- **Real-time Updates:** Polling every 2 seconds
- **File Organization:** Downloads saved to `./downloads/{PO_NUMBER}/`

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify Express is installed: `npm install`

### Downloads fail
- Check credentials in [config.json](config.json)
- Verify internet connection
- Check browser automation is working

### No progress updates
- Check browser console for errors
- Verify server is running
- Check network tab for API calls

## Future Enhancements

- Order Status functionality
- Download history view
- File preview
- Batch upload from CSV
- Email notifications
- Progress percentage indicators
- Pause/resume downloads

## Support

For issues or questions, refer to:
- [PRD_E-BrandID_Artwork_Downloader.md](PRD_E-BrandID_Artwork_Downloader.md) - Product requirements
- [README.md](README.md) - CLI tool documentation
