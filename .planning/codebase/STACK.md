# Technology Stack

This document outlines the technologies, runtimes, and dependencies used in the `yt-vdeo-tomp3` project.

## Core Runtimes & Frameworks

| Component | Technology | Version | Description |
| :--- | :--- | :--- | :--- |
| **Backend** | Python | 3.12-slim | High-performance Python runtime |
| **Backend API** | FastAPI | latest | Modern, fast web framework for building APIs |
| **Frontend** | Node.js | latest (Docker) | Javascript runtime for frontend tooling |
| **Frontend UI** | React | 19.2.0 | Core UI library |
| **Frontend Tooling**| Vite | 7.2.4 | Fast build tool and dev server |

## Backend Dependencies

`backend/requirements.txt`

- **fastapi**: Web framework.
- **uvicorn**: ASGI server for running the FastAPI application.
- **yt-dlp**: Command-line program to download videos from YouTube and other sites.
- **python-multipart**: Required for handling form data in FastAPI.
- **ffmpeg-python**: Python bindings for FFmpeg.
- **mutagen**: Audio metadata handling.
- **Pillow**: Image processing (used for thumbnail handling).

## Frontend Dependencies

`frontend/package.json`

- **react**: UI library.
- **react-dom**: DOM entry point for React.
- **wavesurfer.js**: Interactive navigable audio visualization.

### Development Dependencies
- **eslint**: Linting utility.
- **vite**: Dev server and bundler.
- **@vitejs/plugin-react**: Vite plugin for React.

## Infrastructure & Orchestration

- **Docker**: Containerization platform.
- **Docker Compose**: Tool for defining and running multi-container Docker applications.
- **FFmpeg**: System-level dependency installed in the backend container for audio processing.

## Configuration & Environment

- **VITE_API_URL**: Used by the frontend to locate the backend API (default: `http://localhost:8000`).
- **PYTHONUNBUFFERED=1**: Ensures Python logs are flushed to the terminal immediately.
