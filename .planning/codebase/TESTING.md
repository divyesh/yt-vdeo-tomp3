# Testing Strategy

This document describes the current testing state and recommended verification procedures for the `yt-vdeo-tomp3` project.

## Current State
At present, the codebase does not contain automated test suites (e.g., Pytest for backend or Vitest/Jest for frontend). Verification is handled primarily through manual execution and UI-driven testing.

## Manual Verification Procedures

### 1. Conversion Flow
1.  Navigate to the frontend UI (`http://localhost:5173`).
2.  Paste a valid YouTube URL (e.g., `https://www.youtube.com/watch?v=...`).
3.  Click **Convert Video**.
4.  **Verification**: 
    -   Conversion spinner appears.
    -   Waveform renders once processing is complete.
    -   Metadata (title, duration) correctly displays.

### 2. Audio Playback
1.  After conversion, click the **Play** button.
2.  **Verification**:
    -   Audio plays back clearly.
    -   Progress bar moves in sync with audio.

### 3. Trimming Logic
1.  Drag the handles of the region selector in the waveform to select a sub-segment.
2.  Click **✂ Cut & Download Selection**.
3.  **Verification**:
    -   Trimming process completes.
    -   A new "Download Final MP3" button appears.
    -   Downloaded file duration matches the selected region.

### 4. Cleanup & Resource Management
1.  Observe the `backend/temp_downloads` directory during processing.
2.  Initiate a download.
3.  **Verification**:
    -   Temporary files are created during download.
    -   Files are removed after the download is served.

## Recommended Automated Improvements
To improve reliability, the following test types should be prioritized for implementation:

-   **Backend Integration Tests**: Use `fastapi.testclient` to mock `yt-dlp` and verify that `/convert` and `/trim` endpoints return expected JSON structures.
-   **Service Logic Tests**: Unit tests for filename sanitization and FFmpeg command generation logic.
-   **Frontend Component Tests**: Use React Testing Library to verify that the `Converter` component correctly displays error messages and transition states.
-   **E2E Tests**: Use Playwright or Cypress to automate the full "Paste URL -> Download File" flow in a headless browser.
