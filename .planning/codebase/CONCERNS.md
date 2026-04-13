# Technical Concerns & Debt

This document identifies known technical debt, potential security considerations, and areas for improvement within the `yt-vdeo-tomp3` project.

## Security Considerations

### 1. Broad CORS Policy
- **Issue**: `CORSMiddleware` is configured with `allow_origins=["*"]`.
- **Impact**: While convenient for local development, this allows any website to make requests to the backend API if exposed to the public internet.
- **Recommendation**: Restrict origins to the specific frontend URL in production.

### 2. Unsanitized Input to yt-dlp/FFmpeg
- **Issue**: YouTube URLs are passed directly to `yt-dlp`. While `yt-dlp` handles many edge cases, untrusted input to system-level subprocesses is a potential attack vector.
- **Recommendation**: Implement stricter URL validation patterns before passing URLs to the service layer.

## Technical Debt

### 1. Monolithic Route Handler
- **Issue**: `backend/main.py` contains all API routing, utility functions, and business logic for `yt-dlp` and `FFmpeg` in a single file (>200 lines).
- **Impact**: Decreased readability and difficult unit testing.
- **Recommendation**: Refactor business logic into separate service modules (e.g., `services/download_service.py`, `services/audio_processing.py`).

### 2. Brittle Metadata Extraction
- **Issue**: Metadata parsing relies on regex patterns like `r'description:(?P<artist>.+?)\s+-\s+(?P<title>.+)'`.
- **Impact**: Many YouTube videos have inconsistent descriptions, which will lead to "n/a" or incorrect metadata tagging in the final MP3.
- **Recommendation**: Leverage more robust metadata sources provided by `yt-dlp`'s `info_dict` (e.g., `uploader`, `track`, `artist` fields natively provided by some platforms).

### 3. Missing Storage Limits
- **Issue**: The `temp_downloads` directory grows with every successful conversion.
- **Impact**: High usage volumes or failed cleanup tasks could lead to disk exhaustion on the host or container.
- **Recommendation**: Implement a maximum storage quota or an automated cron-like task to purge files older than X hours.

## Areas for Improvement

### 1. State Resilience
- **Issue**: Frontend state is lost on page refresh. If a long conversion is running, refreshing the browser loses the reference to the active `file_id`.
- **Recommendation**: Persist active job IDs in `localStorage` and implement a "Check Status" endpoint on the backend.

### 2. Feedback Mechanism
- **Issue**: The UI shows a generic spinner during download and conversion. Some YouTube videos take significant time to process.
- **Recommendation**: Implement a WebSocket or SSE (Server-Sent Events) connection to stream real-time progress percentages from `yt-dlp` to the UI.

### 3. Format Options
- **Issue**: Currently hardcoded to 192kbps MP3.
- **Recommendation**: Allow the user to select high-quality (320kbps) or different formats (WAV, FLAC, M4A).
