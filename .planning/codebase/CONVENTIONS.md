# Coding Conventions

This document outlines the established coding patterns, styles, and best practices observed in the `yt-vdeo-tomp3` codebase.

## General Principles
- **Container-First**: The development environment is optimized for Docker, with system dependencies like FFmpeg managed at the OS level within the container.
- **Transient Storage**: Filesystem operations are treated as temporary, with automated cleanup loops.

## Backend Conventions (FastAPI/Python)

### API Structure
- **Asynchronous Routes**: All route handlers are defined as `async def` to leverage FastAPI's concurrency.
- **Request Models**: Pydantic `BaseModel` is used for all POST request bodies (e.g., `ConvertRequest`, `TrimRequest`).
- **Standard Responses**: endpoints return structured JSON or `FileResponse` for binary data.

### Error Handling
- Uses `fastapi.HTTPException` with appropriate status codes (404 for missing files, 500 for processing failures).
- Error details are returned in the `detail` field of the response.

### Logic Isolation
- Core audio processing is handled via the `yt_dlp` library and system `ffmpeg` commands called via `subprocess`.

## Frontend Conventions (React/JavaScript)

### Component Design
- **Functional Components**: All components are implemented as functional components using standard React Hooks.
- **Hooks Usage**: 
    - `useState` for UI states (loading, results).
    - `useRef` for DOM references (Waveform container) and persistent objects (`wavesurferRef`, `abortControllerRef`).
    - `useEffect` for lifecycle events (initializing WaveSurfer on result arrival).
- **Cleanup**: `useEffect` return functions are strictly used to `destroy()` WaveSurfer instances and prevent memory leaks.

### API Interaction
- Uses the native `fetch` API.
- **Cancellation**: `AbortController` is used to cancel pending network requests if the user cancels or restarts a conversion.

### Styling
- **Vanilla CSS**: Global styles in `index.css`.
- **Aesthetic**: Modern "Glassmorphism" theme featuring:
    - Translucent backgrounds (`rgba`).
    - Subtle borders and glass-like blur effects.
    - Vibrant gradients for primary buttons.
    - Micro-animations (e.g., spinner during conversion).

## Media Interaction
- **Waveform Rendering**: Uses `wavesurfer.js` to provide visual feedback.
- **Non-destructive Trimming**: The UI provides a visual region selector, but the actual trimming is performed server-side to ensure high-quality output.
