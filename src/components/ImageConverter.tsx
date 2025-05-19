"use client";

import { useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import styles from "./imageConverter.module.scss";

interface ConvertedFile {
  path: string;
  name?: string;
}

const ImageConverter = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [format, setFormat] = useState<string>("webp");
  const [convertedFiles, setConvertedFiles] = useState<ConvertedFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!selectedFiles || selectedFiles.length === 0) {
      setErrorMessage("Sélectionne au moins un fichier.");
      return;
    }

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("images", file);
      }
      formData.append("format", format);

      const isFolder = [...selectedFiles].some(
        (file) => file.webkitRelativePath
      );

      const response = await fetch(
        isFolder ? "/api/convert-folder" : "/api/image-converter",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la conversion.");
      }

      const buffer = await response.arrayBuffer();

      let data;
      try {
        const text = new TextDecoder().decode(buffer);
        data = JSON.parse(text);

        if (!Array.isArray(data.files) || data.files.length === 0) {
          throw new Error("Aucun fichier converti reçu.");
        }
        setConvertedFiles(data.files);
      } catch {
        const blob = new Blob([buffer], {
          type: response.headers.get("Content-Type") || "image/*",
        });
        const objectUrl = URL.createObjectURL(blob);
        const filename = `converted-image.${format}`;
        setConvertedFiles([{ path: objectUrl, name: filename }]);
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleConvertUrl = async () => {
    setErrorMessage("");
    if (!imageUrl) {
      setErrorMessage("Entrez une URL d'image.");
      return;
    }

    try {
      const response = await fetch("/api/convert-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, format }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Échec de la conversion depuis l'URL."
        );
      }

      const data = await response.json();
      setConvertedFiles([{ path: data.file }]);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div className={styles.containerConverter}>
      <h2 className={styles.title}>Convertisseur d'images</h2>
      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
      <div className={styles.containerFormDownload}>
        {convertedFiles.length === 0 && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.customFileUpload}>
                📂 Sélectionner des fichiers
                <input type="file" multiple onChange={handleFileChange} />
              </label>
              <label className={styles.customFileUpload}>
                📁 Sélectionner un dossier
                <input
                  type="file"
                  multiple
                  // @ts-ignore: Propriété non standard webkitdirectory
                  webkitdirectory
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className={styles.urlInputGroup}>
              <textarea
                className={styles.urlInput}
                placeholder="Entrer une URL d'image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button
                type="button"
                className={styles.urlInputButton}
                onClick={handleConvertUrl}
              >
                🔄 Convertir depuis une URL
              </button>
            </div>

            <div className={styles.formatSelect}>
              <label className={styles.formatSelectLabel}>
                🎨 Choisir le format :
              </label>
              <select
                className={styles.formatSelectSelect}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="webp">WEBP</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="gif">GIF</option>
              </select>
            </div>

            <button type="submit" className={styles.convertButton}>
              ⚡ Convertir
            </button>
          </form>
        )}

        {convertedFiles.length > 0 && (
          <div className={styles.convertedFiles}>
            <IoCloseSharp
              className={styles.convertedFilesClose}
              onClick={() => window.location.reload()}
            />
            <h3 className={styles.convertedFilesTitle}>
              📜 Fichiers convertis :
            </h3>
            <ul className={styles.convertedFilesList}>
              {convertedFiles.map((file, index) => (
                <li className={styles.convertedFilesItem} key={index}>
                  <button
                    className={styles.downloadButton}
                    onClick={async () => {
                      try {
                        const response = await fetch(file.path);
                        if (!response.ok)
                          throw new Error("Échec du téléchargement");
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download =
                          file.name ||
                          file.path.split("/").pop() ||
                          "converted-file";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Erreur de téléchargement :", error);
                        setErrorMessage("Échec du téléchargement du fichier.");
                      }
                    }}
                  >
                    📥 Télécharger {file.name || file.path.split("/").pop()}
                  </button>
                </li>
              ))}
            </ul>
            <button
              className={styles.zipButton}
              onClick={() => (window.location.href = "/api/download-zip")}
            >
              📦 Télécharger en ZIP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageConverter;
