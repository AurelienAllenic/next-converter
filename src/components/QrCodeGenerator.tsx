import { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Head from 'next/head';
import styles from '@/components/qrcodegenerator.module.scss';

export default function QrCodeGenerator() {
  const [url, setUrl] = useState('https://example.com');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageSize, setImageSize] = useState(0.2); // Réduit pour meilleure lisibilité
  const [imageBorderRadius, setImageBorderRadius] = useState(0);

  const qrRef = useRef<HTMLCanvasElement>(null);
  const hiddenQrRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageFile(reader.result as string);
        setImageUrl(''); // Réinitialiser l'URL de l'image si un fichier est chargé
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
    }
  };

  const renderCustomQrCode = () => {
    const canvas = qrRef.current;
    const hiddenCanvas = hiddenQrRef.current;
    if (canvas && hiddenCanvas) {
      const context = canvas.getContext('2d');
      if (context) {
        // Étape 1 : Dessiner le QR Code de base (sans image)
        context.clearRect(0, 0, size, size);
        context.drawImage(hiddenCanvas, 0, 0, size, size);

        // Étape 2 : Si une image est présente, la dessiner avec un border-radius
        if (imageFile || imageUrl) {
          const imageWidth = size * imageSize;
          const imageHeight = size * imageSize;
          const centerX = size / 2 - imageWidth / 2;
          const centerY = size / 2 - imageHeight / 2;

          // Créer un chemin arrondi pour le clip
          context.save();
          context.beginPath();
          context.moveTo(centerX + imageBorderRadius, centerY);
          context.arcTo(
            centerX + imageWidth,
            centerY,
            centerX + imageWidth,
            centerY + imageBorderRadius,
            imageBorderRadius
          );
          context.arcTo(
            centerX + imageWidth,
            centerY + imageHeight,
            centerX + imageWidth - imageBorderRadius,
            centerY + imageHeight,
            imageBorderRadius
          );
          context.arcTo(
            centerX,
            centerY + imageHeight,
            centerX,
            centerY + imageHeight - imageBorderRadius,
            imageBorderRadius
          );
          context.arcTo(
            centerX,
            centerY,
            centerX + imageBorderRadius,
            centerY,
            imageBorderRadius
          );
          context.closePath();
          context.clip();

          // Dessiner l'image
          const img = new Image();
          img.src = imageFile || imageUrl || '';
          img.crossOrigin = 'Anonymous';
          if (img.complete) {
            context.drawImage(img, centerX, centerY, imageWidth, imageHeight);
            context.restore();
          } else {
            img.onload = () => {
              context.drawImage(img, centerX, centerY, imageWidth, imageHeight);
              context.restore();
            };
            img.onerror = () => {
              console.error('Erreur lors du chargement de l’image');
              context.restore();
            };
          }
        }
      }
    }
  };

  const handleDownload = () => {
    renderCustomQrCode();
    setTimeout(() => {
      const canvas = qrRef.current;
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'qrcode.png';
        link.click();
      }
    }, 200);
  };

  useEffect(() => {
    renderCustomQrCode();
  }, [url, size, fgColor, bgColor, imageFile, imageUrl, imageSize, imageBorderRadius]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Générateur de QR Code</title>
        <meta name="description" content="Générateur de QR Code personnalisable avec Next.js" />
      </Head>

      <div className={styles.card}>
        <div className={styles.title}>Générateur de QR Code</div>

        <div className={styles.formGroup}>
          <label>URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Taille du QR Code</label>
          <input
            type="range"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            min="100"
            max="1000"
            step="1"
          />
          <div className={styles.sliderValue}>{size} px</div>
        </div>

        <div className={styles.formGroup}>
          <label>Couleur du QR Code</label>
          <input
            type="color"
            value={fgColor}
            onChange={(e) => setFgColor(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Couleur de fond</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Image locale (optionnel)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label>URL de l'image (optionnel)</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.png"
            disabled={!!imageFile}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Taille de l'image</label>
          <input
            type="range"
            value={imageSize}
            onChange={(e) => setImageSize(Number(e.target.value))}
            min="0"
            max="0.3"
            step="0.01"
          />
          <div className={styles.sliderValue}>{(imageSize * 100).toFixed(0)}%</div>
        </div>

        {(imageFile || imageUrl) && (
          <div className={styles.formGroup}>
            <label>Border Radius de l'image</label>
            <input
              type="range"
              value={imageBorderRadius}
              onChange={(e) => setImageBorderRadius(Number(e.target.value))}
              min="0"
              max="50"
              step="1"
            />
            <div className={styles.sliderValue}>{imageBorderRadius} px</div>
          </div>
        )}

        <div className={styles.qrContainer}>
          <div style={{ display: 'none' }}>
            <QRCodeCanvas
              ref={hiddenQrRef}
              id="hiddenQrCode"
              value={url}
              size={size}
              fgColor={fgColor}
              bgColor={bgColor}
              level="H"
              imageSettings={undefined}
            />
          </div>
          <canvas
            ref={qrRef}
            id="qrCode"
            width={size}
            height={size}
            className={styles.qrCanvas}
          />
        </div>

        <button className={styles.downloadButton} onClick={handleDownload}>
          Télécharger le QR Code
        </button>
        <div className={styles.link}>
          <a href="/video-to-gif" className={styles.linkText}>
            Go to Video to GIF
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