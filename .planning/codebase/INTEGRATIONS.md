# External Integrations

This document documents the external services and internal communication paths used by the `yt-vdeo-tomp3` project.

## External Services

### YouTube (via yt-dlp)
- **Role**: Primary data source for video and audio content.
- **Implementation**: The backend uses the `yt-dlp` library to extract metadata and download audio streams.
- **Capabilities**:
    - Metadata extraction (title, duration, thumbnail).
    - Audio extraction and conversion to MP3.
    - Metadata embedding (Artist, Title from description patterns).
    - Thumbnail embedding into the final MP3 file.

## Internal Integrations

### Frontend ↔ Backend (REST API)
- **Protocol**: HTTP/1.1
- **Format**: JSON
- **Default Base URL**: `http://localhost:8000`
- **Endpoints**:
    - `POST /convert`: Initiates a YouTube download and conversion.
    - `POST /trim`: Trims an existing audio file using start/end markers.
    - `GET /download/{filename}`: Downloads the processed MP3 file.
    - `POST /clear-cache`: Manually triggers a cleanup of the `temp_downloads` directory.

### Backend ↔ System Tools (FFmpeg)
- **Role**: Audio processing and transcoding.
- **Implementation**: Backend executes `ffmpeg` via sub-processes (`subprocess.run`) for trimming and via `yt-dlp` post-processors for conversion.
- **Dependency**: Must be available in the system PATH (installed via `apt-get` in `backend/Dockerfile`).

### Backend ↔ Local Filesystem
- **Storage**: `temp_downloads/` directory.
- **Usage**:
    - Staging for downloaded `.mp3` and intermediate (`.webm`, `.m4a`) files.
    - Static file serving for `WaveSurfer.js` visualization via FastAPI `StaticFiles`.
- **Retention**: Transient storage. Files are cleaned up on startup, via manual request, or automatically after a download request is fulfilled (via `BackgroundTasks`).

## Data Flow

1.  **Frontend** sends YouTube URL to **Backend**.
2.  **Backend** uses `yt-dlp` to fetch stream and download to local storage.
3.  **Backend** converts audio to MP3 using **FFmpeg**.
4.  **Backend** returns metadata and a temporary audio URL to **Frontend**.
5.  **Frontend** loads audio into `WaveSurfer.js` for visualization.
6.  **User** optionally trims the audio.
7.  **Backend** performs trim and returns a new download link.
8.  **User** downloads the file; **Backend** deletes it after serving.
