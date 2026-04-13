# System Architecture

This document describes the high-level architecture and design patterns of the `yt-vdeo-tomp3` application.

## Overview
The application follows a **Decoupled Client-Server Architecture** orchestrated using **Docker Compose**. It consists of a React-based frontend and a FastAPI-based backend, communicating over a RESTful API.

## Frontend Architecture
- **Framework**: React 19 (Vite).
- **Core Design**: Single-page application (SPA).
- **Key Components**:
    - **Converter**: The main functional component handling state for YouTube URL input, download progress, audio visualization (`WaveSurfer.js`), and trimming controls.
- **State Management**: Primarily local component state using React Hooks (`useState`, `useEffect`, `useRef`).
- **Media Handling**: Uses `wavesurfer.js` to render audio waveforms from the backend-supplied blob/static URL.

## Backend Architecture
- **Framework**: FastAPI (Asynchronous Python).
- **Design Pattern**: Functional API.
- **Key Layers**:
    - **API Layer**: Handles CORS, request validation (Pydantic), and route orchestration.
    - **Service Layer (yt-dlp)**: Orchestrates the extraction of audio and metadata from external URLs.
    - **Processing Layer (FFmpeg)**: Handles audio transcoding and trimming via subprocess calls.
- **Concurrency**: Leverages FastAPI's `BackgroundTasks` for non-blocking cleanup of temporary files.

## Infrastructure Architecture
- **Dockerization**:
    - **Backend Service**: Custom Debian-slim based container with Python 3.12 and FFmpeg.
    - **Frontend Service**: Custom Node.js based container for serving the Vite dev server.
- **Networking**: Frontend reaches the backend via the `VITE_API_URL` environment variable. In Docker, they share a network bridge.
- **Persistence**: No persistent database. File storage is transient, located in the `temp_downloads/` directory.

## Data Flow & Lifecycle
1.  **Ingestion**: Client sends URL -> Backend initiates `yt-dlp`.
2.  **Transformation**: Video stream -> Audio stream -> MP3 file (192kbps).
3.  **Visualization**: Backend serves MP3 -> Frontend renders waveform.
4.  **Modification**: Client sends trim markers -> Backend executes FFmpeg -> Returns new file.
5.  **Exfiltration**: Client downloads file -> Backend triggers background deletion.
6.  **Cleanup**: Transient files deleted on startup and post-download.
