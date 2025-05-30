import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import Head from 'next/head';
import styles from '@/components/videotogif.module.scss';

export default function VideoToGif() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(1); // Speed multiplier (1x is normal)
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
      });
      ffmpegRef.current = ffmpeg;
    };
    loadFFmpeg();
  }, []);

  // Handle video file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setGifUrl(null);
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(file);
      }
    } else {
      alert('Please upload a valid video file.');
    }
  };

  // Convert video to GIF
  const convertToGif = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    setIsConverting(true);
    setProgress(0);

    const ffmpeg = ffmpegRef.current;
    const inputName = 'input.mp4';
    const outputName = 'output.gif';

    try {
      // Write video file to FFmpeg's virtual filesystem
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // FFmpeg command to convert video to GIF with speed adjustment
      await ffmpeg.exec([
        '-i',
        inputName,
        '-vf',
        `setpts=PTS/${speed},fps=10,scale=320:-1`,
        '-loop',
        '0',
        outputName,
      ]);

      // Update progress (simplified)
      setProgress(50);

      // Read the output GIF
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      setProgress(100);
    } catch (error) {
      console.error('Conversion error:', error);
      alert('An error occurred during conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  // Download the generated GIF
  const handleDownload = () => {
    if (gifUrl) {
      const link = document.createElement('a');
      link.href = gifUrl;
      link.download = 'converted.gif';
      link.click();
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Video to GIF Converter</title>
        <meta name="description" content="Convert videos to GIFs with customizable speed using Next.js" />
      </Head>

      <div className={styles.card}>
        <div className={styles.title}>Video to GIF Converter</div>

        <div className={styles.formGroup}>
          <label>Upload Video</label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
        </div>

        {videoFile && (
          <>
            <div className={styles.formGroup}>
              <label>Preview</label>
              <video ref={videoRef} controls className={styles.videoPreview} />
            </div>

            <div className={styles.formGroup}>
              <label>GIF Speed</label>
              <input
                type="range"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                min="0.5"
                max="2"
                step="0.1"
                className={styles.slider}
              />
              <div className={styles.sliderValue}>{speed.toFixed(2)}x</div>
            </div>

            <button
              className={styles.convertButton}
              onClick={convertToGif}
              disabled={isConverting}
            >
              {isConverting ? 'Converting...' : 'Convert to GIF'}
            </button>

            {isConverting && (
              <div className={styles.formGroup}>
                <label>Progress</label>
                <div className={styles.sliderValue}>{progress}%</div>
              </div>
            )}
          </>
        )}

        {gifUrl && (
          <div className={styles.formGroup}>
            <label>Generated GIF</label>
            <img src={gifUrl} alt="Generated GIF" className={styles.gifPreview} />
            <button className={styles.downloadButton} onClick={handleDownload}>
              Download GIF
            </button>
          </div>
        )}

        <div className={styles.link}>
          <a href="/qr-code-generator" className={styles.linkText}>
            Go to QR Code Generator
          </a>
        </div>
        <div className={styles.link}>
          <a href="/image-converter" className={styles.linkText}>
            Go to Image Converter
          </a>
        </div>
      </div>
    </div>
  );
}