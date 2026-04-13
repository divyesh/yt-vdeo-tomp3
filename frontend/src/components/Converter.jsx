import { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

const Converter = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [trimLoading, setTrimLoading] = useState(false);
    const [trimmedResult, setTrimmedResult] = useState(null);

    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const regionsRef = useRef(null);
    const [currentRegion, setCurrentRegion] = useState(null);
    const abortControllerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setMetadata(null);
        setTrimmedResult(null);

        if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
            wavesurferRef.current = null;
        }

        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            // First fetch metadata
            const infoResponse = await fetch('http://localhost:8000/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
                signal: abortControllerRef.current.signal
            });

            if (!infoResponse.ok) {
                const errorData = await infoResponse.json();
                throw new Error(errorData.detail || 'Failed to fetch video info');
            }

            const infoData = await infoResponse.json();
            setMetadata(infoData);

            // Then start conversion
            const response = await fetch('http://localhost:8000/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Conversion failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Conversion request cancelled');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!result || !waveformRef.current) return;

        const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#4f46e5',
            progressColor: '#818cf8',
            cursorColor: '#ffffff',
            barWidth: 2,
            barRadius: 3,
            responsive: true,
            height: 100,
        });

        const regions = ws.registerPlugin(RegionsPlugin.create());
        regionsRef.current = regions;

        ws.load(result.audio_url);

        ws.on('ready', () => {
            wavesurferRef.current = ws;
            // Create initial region for the whole duration
            regions.addRegion({
                start: 0,
                end: Math.min(result.duration, 30), // Default to first 30s or total
                color: 'rgba(79, 70, 229, 0.2)',
                drag: true,
                resize: true,
            });
        });

        regions.on('region-updated', (region) => {
            setCurrentRegion(region);
        });

        regions.on('region-created', (region) => {
            // Remove old regions if any
            regions.getRegions().forEach(r => {
                if (r !== region) r.remove();
            });
            setCurrentRegion(region);
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));

        return () => ws.destroy();
    }, [result]);

    const handleTrim = async () => {
        if (!currentRegion || !result) return;

        setTrimLoading(true);
        setError(null);

        // Initialize AbortController
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('http://localhost:8000/trim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: result.filename,
                    start_time: currentRegion.start,
                    end_time: currentRegion.end,
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Trimming failed');
            }

            const data = await response.json();
            setTrimmedResult(data);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Trim request cancelled');
            } else {
                setError(err.message);
            }
        } finally {
            setTrimLoading(false);
        }
    };

    const togglePlay = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }
    };

    const handleSelectAll = () => {
        if (regionsRef.current && wavesurferRef.current) {
            regionsRef.current.getRegions().forEach(r => r.remove());
            regionsRef.current.addRegion({
                start: 0,
                end: wavesurferRef.current.getDuration(),
                color: 'rgba(79, 70, 229, 0.2)',
                drag: true,
                resize: true,
            });
        }
    };

    const handleDownload = () => {
        const downloadData = trimmedResult || result;
        if (downloadData && downloadData.download_url) {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`;
            const downloadUrl = `${baseUrl}${downloadData.download_url}?download_name=${encodeURIComponent(result.title)}`;

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${result.title}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadFull = () => {
        console.log("Full download requested", result);
        if (result && result.download_url) {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : `http://${window.location.hostname}:8000`;
            const downloadUrl = `${baseUrl}${result.download_url}?download_name=${encodeURIComponent(result.title)}`;
            console.log("Redirecting to:", downloadUrl);

            // Use anchor tag for better reliability
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${result.title}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            console.error("Download URL missing in result", result);
            alert("Download link not available. Please try converting again.");
        }
    };

    const handleAbort = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setMetadata(null);
        setTrimLoading(false);
    };

    const handleCancel = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
            wavesurferRef.current = null;
        }
        setResult(null);
        setMetadata(null);
        setTrimmedResult(null);
        setCurrentRegion(null);
        setUrl('');
        setError(null);
    };

    const handleClearCache = async () => {
        try {
            const response = await fetch('http://localhost:8000/clear-cache', {
                method: 'POST',
            });
            if (response.ok) {
                alert('Server cache cleared successfully!');
                setResult(null);
            }
        } catch (err) {
            console.error('Failed to clear cache:', err);
        }
    };

    return (
        <div className="glass-card">
            <h1>YT to MP3</h1>
            <p className="subtitle">Convert and download high-quality audio</p>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <input
                        type="url"
                        placeholder="Paste YouTube Link here..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                    />
                </div>

                {loading ? (
                    <div className="btn-styled disabled" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="spinner"></span>
                                Processing...
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAbort(); }}
                                className="secondary-button"
                                style={{
                                    width: 'auto',
                                    padding: '0.2rem 0.6rem',
                                    fontSize: '0.7rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    margin: 0
                                }}
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button type="submit">
                        Convert Video
                    </button>
                )}
            </form>

            {error && (
                <div className="status-message error">
                    ⚠ {error}
                </div>
            )}

            {metadata && (
                <div className="metadata-container">
                    <div className="video-preview-card">
                        <img src={metadata.thumbnail} alt={metadata.title} className="preview-thumb" />
                        <div className="preview-content">
                            <h3>{metadata.title}</h3>
                            <p className="uploader">By {metadata.uploader}</p>
                            <div className="duration-badge">
                                {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}
                            </div>
                            <p className="preview-description">{metadata.description}</p>
                        </div>
                        {!result && (
                            <div className="conversion-status">
                                <span className="spinner"></span>
                                Converting to High-Quality MP3...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {result && (
                <div className="editor-container" style={{ marginTop: '2rem' }}>
                    <div className="status-message success" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Visual Editor</h3>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="secondary-button"
                            style={{
                                padding: '0.3rem 0.8rem',
                                fontSize: '0.8rem',
                                width: 'auto',
                                background: 'rgba(255,255,255,0.05)',
                                borderColor: 'rgba(255,255,255,0.1)'
                            }}
                        >
                            ✕ Cancel
                        </button>
                    </div>

                    <div ref={waveformRef} style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px' }}></div>

                    <div className="controls" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
                        <button onClick={togglePlay} className="secondary-button" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button onClick={handleSelectAll} className="secondary-button" style={{ width: 'auto', padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.05)' }}>
                            Reset / Select All
                        </button>
                    </div>

                    {currentRegion && (
                        <div style={{ fontSize: '0.8rem', marginBottom: '1rem', opacity: 0.7 }}>
                            Selected: {currentRegion.start.toFixed(2)}s - {currentRegion.end.toFixed(2)}s
                            ({(currentRegion.end - currentRegion.start).toFixed(2)}s)
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
                        {trimLoading ? (
                            <div className="btn-styled disabled" style={{ position: 'relative', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                                    <span>Processing Cut...</span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleAbort(); }}
                                        className="secondary-button"
                                        style={{
                                            width: 'auto',
                                            padding: '0.2rem 0.6rem',
                                            fontSize: '0.7rem',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderColor: 'rgba(255,255,255,0.2)',
                                            margin: 0
                                        }}
                                    >
                                        ✕ Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleTrim}
                                disabled={!currentRegion}
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                                    fontWeight: 'bold',
                                    position: 'relative'
                                }}
                            >
                                ✂ Cut & Download Selection
                            </button>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>OR</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        </div>

                        <button
                            onClick={handleDownloadFull}
                            className="secondary-button"
                            style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                                color: '#10b981'
                            }}
                        >
                            ⬇ Download Full Audio (No Cut)
                        </button>
                    </div>

                    {trimmedResult && (
                        <div style={{ marginTop: '1rem' }}>
                            <button
                                onClick={handleDownload}
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', width: '100%' }}
                            >
                                ✅ Download Final MP3
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                    onClick={handleClearCache}
                    className="secondary-button"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', opacity: 0.7 }}
                >
                    🗑 Clear Server Cache
                </button>
            </div>
        </div>
    );
};

export default Converter;
