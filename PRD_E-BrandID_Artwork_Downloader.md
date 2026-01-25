# Product Requirements Document (PRD)
## E-BrandID Artwork Downloader

**Version:** 1.0
**Date:** 2026-01-25
**Status:** Draft

---

## 1. Executive Summary

### 1.1 Project Overview
Automate the process of downloading artwork files from the e-brandid system for multiple Purchase Orders (POs). The system will handle authentication, navigation to PO detail pages, and batch downloading of artwork files.

### 1.2 Objectives
- Provide a simple web interface for easy access to system functions
- Automate login and navigation to PO detail pages
- Enable batch processing of multiple PO numbers
- Systematically download all artwork files from each PO
- Organize downloaded files in a structured folder system
- Reduce manual effort and human error in artwork retrieval

---

## 2. User Stories

### 2.1 Primary User Stories
1. **As a user**, I want to provide a list of PO numbers so that I can download artwork for multiple orders in one batch
2. **As a user**, I want the system to automatically log in so that I don't have to manually authenticate each time
3. **As a user**, I want artwork files organized by PO number so that I can easily find files for specific orders
4. **As a user**, I want to see download progress so that I know the system is working and how much time remains
5. **As a user**, I want a summary report of what was downloaded so that I can verify completeness

---

## 3. System Architecture

### 3.1 High-Level Flow
```
Input: List of PO Numbers
    ↓
Phase 1: Authentication & Navigation
    ↓
Phase 2: Artwork Download
    ↓
Output: Downloaded Files + Report
```

---

## 4. Functional Requirements

### 4.1 Phase 1: Authentication & Navigation

#### 4.1.1 Login Process
- **Requirement ID:** FR-1.1
- **Description:** System must authenticate to e-brandid portal
- **Details:**
  - URL: `https://app.e-brandid.com/login/login.aspx`
  - Username: `sales10@fuchanghk.com`
  - Password: `fc31051856`
  - Must handle session management
  - Must detect login failures

#### 4.1.2 PO Navigation
- **Requirement ID:** FR-1.2
- **Description:** System must navigate to PO detail pages
- **Details:**
  - URL Pattern: `https://app.e-brandid.com/Bidnet/bidnet3/factoryPODetail.aspx?po_id={PO_NUMBER}`
  - Examples:
    - PO 1303061 → `?po_id=1303061`
    - PO 1307938 → `?po_id=1307938`
  - Must validate PO page loads successfully
  - Must handle invalid PO numbers gracefully

### 4.2 Phase 2: Artwork Download

#### 4.2.1 Hyperlink Detection
- **Requirement ID:** FR-2.1
- **Description:** System must identify all artwork download links on PO detail page
- **Details:**
  - Scan page for artwork hyperlinks
  - Identify file types (PDF, JPG, PNG, AI, etc.)
  - Extract file metadata if available

#### 4.2.2 File Download
- **Requirement ID:** FR-2.2
- **Description:** System must download each artwork file sequentially
- **Details:**
  - Click each hyperlink programmatically
  - Handle download dialogs/redirects
  - Verify file download completion
  - Retry failed downloads (up to 3 attempts)

#### 4.2.3 File Organization
- **Requirement ID:** FR-2.3
- **Description:** Downloaded files must be organized systematically
- **Details:**
  - Folder structure: `./downloads/{PO_NUMBER}/`
  - Preserve original filenames
  - Handle duplicate filenames (append counter)
  - Example:
    ```
    downloads/
    ├── 1303061/
    │   ├── artwork_001.pdf
    │   ├── artwork_002.jpg
    │   └── design_spec.ai
    └── 1307938/
        ├── label_front.pdf
        └── label_back.pdf
    ```

### 4.3 Batch Processing

#### 4.3.1 Input Methods
- **Requirement ID:** FR-3.1
- **Description:** System must accept multiple PO numbers
- **Options:**
  - CSV file with PO numbers
  - Text file (one PO per line)
  - Command-line arguments
  - Interactive prompt

#### 4.3.2 Processing Queue
- **Requirement ID:** FR-3.2
- **Description:** System must process POs sequentially
- **Details:**
  - Process one PO at a time
  - Continue on error (don't stop entire batch)
  - Log each PO's status

### 4.4 Reporting

#### 4.4.1 Download Report
- **Requirement ID:** FR-4.1
- **Description:** System must generate a summary report
- **Details:**
  - Report format: CSV or JSON
  - Include:
    - PO Number
    - Number of files downloaded
    - File names and sizes
    - Download timestamp
    - Success/failure status
    - Error messages (if any)

#### 4.4.2 Progress Logging
- **Requirement ID:** FR-4.2
- **Description:** System must provide real-time progress updates
- **Details:**
  - Console output showing current PO
  - Files downloaded count
  - Estimated time remaining (optional)

---

## 5. Technical Requirements

### 5.1 Technology Stack
- **Language:** Python 3.8+ or Node.js 16+
- **Web Automation:** Selenium or Playwright
- **HTTP Client:** requests (Python) or axios (Node.js)
- **File System:** Native OS file operations

### 5.2 Dependencies
- Web browser driver (Chrome/Firefox)
- Session management library
- File download handler
- CSV/JSON parser

### 5.3 Configuration
- **Config File:** `config.json` or `.env`
- **Contents:**
  ```json
  {
    "login_url": "https://app.e-brandid.com/login/login.aspx",
    "username": "sales10@fuchanghk.com",
    "password": "fc31051856",
    "download_directory": "./downloads",
    "max_retries": 3,
    "timeout_seconds": 30
  }
  ```

### 5.4 Error Handling
- **Login Failures:** Retry up to 3 times, then abort
- **Invalid PO:** Log error, skip to next PO
- **Download Failures:** Retry 3 times, log if still failing
- **Network Errors:** Implement exponential backoff

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Process at least 10 POs per hour
- Download files without corrupting data
- Handle files up to 100MB each

### 6.2 Reliability
- 95% success rate for valid POs
- Graceful degradation on errors
- Resume capability for interrupted batches

### 6.3 Security
- Store credentials securely (environment variables or encrypted config)
- Clear session after completion
- No credentials in logs

### 6.4 Usability
- Simple command-line interface
- Clear error messages
- Progress indicators

---

## 7. Implementation Phases

### Phase 1: Authentication & Navigation (MVP)
**Deliverables:**
- Login automation
- Navigate to single PO page
- Verify page loads correctly
- Basic error handling

**Acceptance Criteria:**
- Successfully logs in with provided credentials
- Navigates to PO detail page using po_id parameter
- Confirms page content loads (not 404 or error page)

### Phase 2: Artwork Download
**Deliverables:**
- Identify all artwork hyperlinks on page
- Download each file sequentially
- Save files to organized folder structure
- Generate download report

**Acceptance Criteria:**
- All artwork files downloaded successfully
- Files saved in correct folder structure
- Report shows accurate download status
- No file corruption

### Phase 3: Batch Processing
**Deliverables:**
- Accept list of PO numbers
- Process multiple POs in sequence
- Comprehensive error handling
- Final summary report

**Acceptance Criteria:**
- Processes 10+ POs without manual intervention
- Continues processing after individual PO failures
- Generates complete batch report

---

## 8. Data Specifications

### 8.1 Input Data
**PO Number List (CSV):**
```csv
po_number
1303061
1307938
1308245
```

**PO Number List (TXT):**
```
1303061
1307938
1308245
```

### 8.2 Output Data
**Download Report (CSV):**
```csv
po_number,status,files_downloaded,total_size_mb,timestamp,errors
1303061,success,3,15.2,2026-01-25 10:30:00,
1307938,success,2,8.5,2026-01-25 10:35:00,
1308245,failed,0,0,2026-01-25 10:40:00,"PO not found"
```

---

## 9. Testing Requirements

### 9.1 Unit Tests
- Login function
- URL construction
- File download function
- File organization logic

### 9.2 Integration Tests
- End-to-end single PO download
- Batch processing with 5 POs
- Error recovery scenarios

### 9.3 Test Cases
1. **Valid PO with multiple artworks** → All files downloaded
2. **Invalid PO number** → Error logged, continues to next
3. **Network interruption** → Retry mechanism works
4. **Duplicate filenames** → Files renamed appropriately
5. **Large file (50MB+)** → Downloads without timeout

---

## 10. Web Interface Requirements

### 10.1 UI Design Specifications
- **Layout:** Split-screen design with 20% left sidebar and 80% right panel
- **Style:** Minimal white background with black borders (1px solid black) on all tables and divs
- **Navigation:** Left sidebar contains function buttons
- **Content Area:** Right panel displays selected function interface

### 10.2 Left Sidebar (20%)
**Function Buttons:**
- Download Artwork
- Order Status
- (Additional functions to be added)

**Button Styling:**
- Full width buttons
- Black border
- Clear hover states
- Active state indication

### 10.3 Right Panel (80%)

**Download Artwork View:**
- Input field for PO number(s) - textarea for multiple POs
- Submit button to trigger download
- Real-time progress display area
- Results/status table with black borders
- Download summary

**Order Status View:**
- PO search/filter interface
- Status display table
- (To be implemented in future phase)

### 10.4 Web Interface Technical Stack
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** Node.js with Express
- **API:** RESTful endpoints connecting to artwork downloader
- **Real-time Updates:** Server-Sent Events (SSE) for progress tracking

### 10.5 API Endpoints
- `POST /api/download` - Trigger artwork download for PO(s)
- `GET /api/status/:jobId` - Get download job status
- `GET /api/downloads` - List all download history
- `GET /api/downloads/:poNumber` - Get files for specific PO

---

## 11. Future Enhancements

### 11.1 Potential Features
- Parallel downloads (multiple POs simultaneously)
- Email notifications on completion
- Cloud storage integration (S3, Google Drive)
- Incremental downloads (skip already downloaded files)
- Artwork preview before download
- Filter by file type (only PDFs, only images, etc.)

### 11.2 Scalability Considerations
- Database for tracking download history
- API integration instead of web scraping
- Distributed processing for large batches

---

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Website structure changes | High | Medium | Use robust selectors, implement monitoring |
| Session timeout during batch | Medium | Medium | Implement session refresh logic |
| Large files cause timeout | Medium | Low | Increase timeout, implement chunked download |
| Credentials compromised | High | Low | Use secure credential storage, rotate regularly |
| Rate limiting by server | Medium | Medium | Implement delays between requests |

---

## 12. Success Metrics

- **Automation Rate:** 90%+ of downloads require no manual intervention
- **Time Savings:** 80% reduction in manual download time
- **Error Rate:** <5% failed downloads for valid POs
- **User Satisfaction:** Positive feedback from users

---

## 13. Appendix

### 13.1 Example URLs
- Login: `https://app.e-brandid.com/login/login.aspx`
- PO Detail: `https://app.e-brandid.com/Bidnet/bidnet3/factoryPODetail.aspx?po_id=1303061`

### 13.2 Credentials (Development)
- Username: `sales10@fuchanghk.com`
- Password: `fc31051856`

### 13.3 Glossary
- **PO:** Purchase Order
- **Artwork:** Design files (PDF, images, vector graphics) for products
- **Batch Processing:** Processing multiple items sequentially without manual intervention

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-25 | Claude Opus 4.5 | Initial draft |

