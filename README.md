# E-BrandID Artwork Downloader

Automated tool for downloading artwork files from the e-brandid system for multiple Purchase Orders (POs).

## Features

- ✅ **Web Interface**: Simple split-screen interface (20% sidebar, 80% main panel)
- ✅ **Automated Login**: Securely logs into the e-brandid system
- ✅ **Batch Processing**: Process multiple PO numbers in one run
- ✅ **Organized Downloads**: Files organized by PO number in separate folders
- ✅ **Progress Tracking**: Real-time console and web UI progress updates
- ✅ **Error Handling**: Continues processing even if individual items fail
- ✅ **Detailed Reports**: Generates JSON report with download statistics

## Quick Start

### Web Interface (Recommended)

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Start the web server:
```bash
npm run server
```

4. Open your browser to: **http://localhost:3000**

### Command Line Interface

```bash
# Single PO
node index.js 1303061

# Multiple POs
node index.js 1303061 1307938

# From file
node index.js --file po-list.txt
```

## Documentation

- [WEB_INTERFACE_GUIDE.md](WEB_INTERFACE_GUIDE.md) - Web interface user guide
- [PRD_E-BrandID_Artwork_Downloader.md](PRD_E-BrandID_Artwork_Downloader.md) - Product requirements document
- [README.md](README.md) - This file

## Project Structure

```
.
├── public/                 # Web interface files
│   ├── index.html         # Main HTML interface
│   ├── style.css          # Minimal styling with black borders
│   └── app.js             # Frontend JavaScript
├── server.js              # Express backend server
├── index.js               # Artwork downloader core
├── config.json            # Configuration
├── package.json           # Dependencies
└── downloads/             # Downloaded files (created at runtime)
```

## Configuration

Edit [config.json](config.json) to customize:
- Login credentials
- Download directory
- Timeout settings
- Headless mode

## License

ISC
