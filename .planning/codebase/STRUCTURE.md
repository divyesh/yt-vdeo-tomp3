# Directory Structure

This document provides a map of the `yt-vdeo-tomp3` codebase and the purpose of its key directories and files.

## Project Root

| Path | Purpose |
| :--- | :--- |
| `backend/` | Source code for the FastAPI backend service |
| `frontend/` | Source code for the React frontend service |
| `docker-compose.yml` | Multi-container orchestration config |
| `.planning/` | GSD lifecycle and codebase documentation |
| `.agent/` | Agent-side skills and instruction sets |

## Backend Structure

`backend/`

- `main.py`: Entry point for the FastAPI application. Contains all routes and core logic.
- `requirements.txt`: Python dependency manifest.
- `Dockerfile`: Production/Dev container definition (Python 3.12-slim + FFmpeg).
- `temp_downloads/`: (**Transient**) Directory for storing audio files during processing.
- `venv/`: Local Python virtual environment (git-ignored).

## Frontend Structure

`frontend/`

- `src/`: Application source code.
    - `main.jsx`: Application entry point.
    - `App.jsx`: Root component wrapper.
    - `components/`: Core UI components.
        - `Converter.jsx`: Main application logic, UI, and audio visualization.
    - `assets/`: Static assets (images, fonts).
- `public/`: Public static assets served by Vite.
- `package.json`: Node.js dependency manifest and scripts.
- `vite.config.js`: Vite configuration for React plugin.
- `Dockerfile`: Container definition for development (Node.js + Vite).
- `index.html`: Base HTML template.

## Key Configuration Files

- **Backend**: `main.py` handles configuration (CORS, static mounts).
- **Frontend**: `vite.config.js` and `.env` (passed via Docker: `VITE_API_URL`).
- **Orchestration**: `docker-compose.yml` links the services and defines port mappings (8000 for API, 5173 for UI).

## Ignored & Excluded Paths

- `frontend/node_modules/`
- `backend/venv/`
- `backend/__pycache__/`
- `**/temp_downloads/*` (except .gitkeep if present)
