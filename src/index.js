import Uppy, { debugLogger } from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import GoldenRetriever from "@uppy/golden-retriever";
import XHRUpload from "@uppy/xhr-upload";
import ImageEditor from "@uppy/image-editor";
import Compressor from "@uppy/compressor";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

class UppyUploader {
  constructor(endpoint, target, useImageEditor = false, useRestore = false) {
    this.endpoint = endpoint;
    this.uppy = new Uppy({
      logger: debugLogger,
      onBeforeUpload: files => this.handleBeforeUpload(files)
    })
      .use(Dashboard, {
        inline: true,
        target: target,
        showProgressDetails: true,
        proudlyDisplayPoweredByUppy: true,
        hideCancelButton: true,
        doneButtonHandler: null,
        showRemoveButtonAfterComplete: true,//允許刪除上傳成功的照片
      });

    this.uppy
      .use(Compressor, { quality: 0.8, convertSize: 5000000 })
      .use(XHRUpload, {
        endpoint: `${this.endpoint}/upload`,
        formData: true,
        fieldName: "attachment",
      });

    if (useRestore) {
      this.uppy.use(GoldenRetriever, { serviceWorker: true });
    }

    if (useImageEditor) {
      this.uppy.use(ImageEditor, { target: Dashboard });
    }

    this.loadUploadedFiles();
    this.setupEventListeners();
  }

  loadUploadedFiles() {
    fetch(`${this.endpoint}/files`)
      .then(response => response.json())
      .then(fileObjects => {
        const filePromises = fileObjects.map(file => {
          console.log(file)
          let type
          switch (file.ExtensionName) {
            case '.jpg': type = 'image/jpeg'; break;
            case '.jpeg': type = 'image/jpeg'; break;
            case '.png': type = 'image/png'; break;
            case '.gif': type = 'image/gif'; break;
            case '.pdf': type = 'application/pdf'; break;
            default:
              return;
          }

          return fetch(`${this.endpoint}/download/${file.FileName}`)
            .then(response => response.blob())
            .then(blob => {
              this.uppy.addFile({
                source: 'server',
                name: file.FileName,
                type,
                data: blob,
                meta: {
                }
              });
            });
        });

        // 等待所有文件都添加到 Uppy 後，把文件設定成以上傳完成的狀態
        Promise.all(filePromises).then(() => {
          this.uppy.getFiles().forEach(file => {
            this.uppy.setFileState(file.id, {
              progress: {
                uploadComplete: true,
                uploadStarted: true,
              },
            });
          });
        });
      })
      .catch(error => console.error('Error loading files:', error));
  }

  handleBeforeUpload(files) {
    const length = Object.keys(files).length;
    if (length > 4) {
      this.uppy.info(`最多只能上傳5個檔案`, 'error', 2000);
      return false;
    }

    let totalSize = 0;
    Object.keys(files).forEach(file => {
      totalSize += files[file].size;
    });

    if (totalSize > 20000000) {
      this.uppy.info(`總檔案大小不能超過20MB`, 'error', 2000);
      return false;
    }
  }

  //點擊圖片顯示預覽，僅限已上傳的檔案

  createModal(imageSrc) {
    const fullSizeImage = new Image();
    fullSizeImage.src = imageSrc;
    fullSizeImage.style.maxWidth = '100%';
    fullSizeImage.style.maxHeight = '100%';

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1010';
    modal.style.cursor = 'pointer';

    modal.appendChild(fullSizeImage);

    modal.addEventListener('click', function () {
      modal.remove();
    });

    document.body.appendChild(modal);
  }

  setupEventListeners() {
    this.uppy.on("file-removed", file => {
      fetch(`${this.endpoint}/delete/${file.name}`, { method: "DELETE" })
        .then(response => response.text())
        .then(responseText => {
          console.log(responseText);
        })
        .catch(error => {
          console.error(error);
        });
    });
    
    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('click', async (event) => {
        if (event.target.classList.contains('uppy-Dashboard-Item-previewImg')) {
          try {
            const response = await fetch(`${this.endpoint}/download/${event.target.alt}`, { method: 'HEAD' });
            if (response.ok) {
              this.createModal(`${this.endpoint}/download/${event.target.alt}`);
            } else {
              console.log('圖片加載失敗，不顯示模態窗口。');
            }
          } catch (error) {
            console.error('無法檢查圖片：', error);
          }
        }
      });
    });
  }
}

const uppyUploader = new UppyUploader("http://localhost:3000", "#app", true);