import os
import uuid
import re
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

def cleanup_temp_dir():
    """Clears all files in the temp_downloads directory."""
    try:
        if os.path.exists(DOWNLOAD_DIR):
            for filename in os.listdir(DOWNLOAD_DIR):
                file_path = os.path.join(DOWNLOAD_DIR, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        import shutil
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f'Failed to delete {file_path}. Reason: {e}')
            print("Successfully cleared temp_downloads directory.")
    except Exception as e:
        print(f"Error during temp directory cleanup: {e}")

@app.on_event("startup")
async def startup_event():
    # Clear temp files on startup to handle any stalled files from previous runs
    cleanup_temp_dir()

# FFmpeg is expected to be installed in the system PATH (configured in Dockerfile)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp storage for downloaded files
DOWNLOAD_DIR = "temp_downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Mount static files to allow WaveSurfer to load the audio
app.mount("/audio", StaticFiles(directory=DOWNLOAD_DIR), name="audio")

class ConvertRequest(BaseModel):
    url: str

class TrimRequest(BaseModel):
    filename: str
    start_time: float
    end_time: float

def cleanup_file(path: str):
    """Deletes the file and any intermediate files if they exist."""
    try:
        # Delete the specific file
        if os.path.exists(path):
            os.remove(path)
            print(f"Deleted temp file: {path}")
        
        # Also check for any common intermediate extension with same base name
        base_path = os.path.splitext(path)[0]
        for ext in ['.webm', '.m4a', '.mp4', '.temp']:
            alt_path = base_path + ext
            if os.path.exists(alt_path):
                os.remove(alt_path)
                print(f"Deleted intermediate file: {alt_path}")

    except Exception as e:
        print(f"Error deleting file {path}: {e}")

@app.post("/clear-cache")
async def manual_clear_cache():
    cleanup_temp_dir()
    return {"message": "Cache cleared successfully"}

@app.post("/info")
async def get_video_info(request: ConvertRequest):
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "description": info.get('description', '')[:300] + ('...' if len(info.get('description', '')) > 300 else ''),
                "duration": info.get('duration'),
                "uploader": info.get('uploader')
            }
    except Exception as e:
        print(f"Error in info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert")
async def convert_video(request: ConvertRequest):
    try:
        file_id = str(uuid.uuid4())
        output_template = os.path.join(DOWNLOAD_DIR, f"{file_id}.%(ext)s")

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'writethumbnail': True, # Keep thumbnail for embedding
            'parse_metadata': [
                r'description:(?P<artist>.+?)\s+-\s+(?P<title>.+)', # Pattern: "Artist - Title"
                r'description:Artist:\s*(?P<artist>.+)',
                r'description:Title:\s*(?P<title>.+)',
                'webpage_url:%(meta_comment)s',
            ],
            'postprocessors': [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                },
                {
                    'key': 'FFmpegMetadata',
                    'add_metadata': True,
                },
                {
                    'key': 'EmbedThumbnail',
                }
            ],
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=True)
            filename = f"{file_id}.mp3"
            filepath = os.path.join(DOWNLOAD_DIR, filename)
            
            if not os.path.exists(filepath):
                 raise HTTPException(status_code=500, detail="Conversion failed, output file not found.")
            
            response_data = {
                "id": file_id,
                "filename": filename,
                "title": info.get('title', 'Audio'),
                "audio_url": f"http://localhost:8000/audio/{filename}",
                "download_url": f"/download/{filename}",
                "duration": info.get('duration')
            }
            print(f"DEBUG: Response data: {response_data}")
            return response_data

    except Exception as e:
        print(f"Error in convert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trim")
async def trim_audio(request: TrimRequest, background_tasks: BackgroundTasks):
    input_path = os.path.join(DOWNLOAD_DIR, request.filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Original file not found")

    output_filename = f"trimmed_{request.filename}"
    output_path = os.path.join(DOWNLOAD_DIR, output_filename)

    # Use ffmpeg to trim
    # -y to overwrite if exists
    # -i input
    # -ss start
    # -to end (or -t duration)
    # -c copy to avoid re-encoding if possible, or -acodec libmp3lame
    import subprocess
    try:
        command = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-ss", str(request.start_time),
            "-to", str(request.end_time),
            "-acodec", "libmp3lame", # Re-encode to ensure compatibility
            "-q:a", "2",
            output_path
        ]
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"FFmpeg trim failed: {e}")

    # Schedule cleanup for BOTH original and trimmed file? 
    # Usually we want the trimmed one sent, so we schedule cleanup for it after response.
    # The original can be cleaned up now or later.
    # For simplicity, we'll keep the original for a bit (or clean it now if we don't need it)
    
    return {
        "filename": output_filename,
        "download_url": f"/download/{output_filename}"
    }

@app.get("/download/{filename}")
async def download_file(filename: str, background_tasks: BackgroundTasks, download_name: str = None):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Schedule cleanup after response is sent
    background_tasks.add_task(cleanup_file, file_path)
    
    
    # Use provided download_name or fallback to the storage filename
    final_filename = download_name if download_name else filename
    
    # Sanitize filename (remove invalid chars for Windows/Linux)
    final_filename = re.sub(r'[<>:"/\\|?*]', '', final_filename)
    final_filename = final_filename.strip()
    
    # Ensure .mp3 extension
    if not final_filename.endswith(".mp3"):
        final_filename += ".mp3"
        
    return FileResponse(file_path, media_type="audio/mpeg", filename=final_filename)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
