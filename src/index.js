'use strict';
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
    this.api = {
      upload: `${this.endpoint}/upload`,
      filelist: `${this.endpoint}/filelist`,
      delete: `${this.endpoint}/delete`,
      download: `${this.endpoint}/download`,
    }

    this.uppy = new Uppy()
      .use(Dashboard, {
        inline: true,
        modal: true,
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
        endpoint: this.api.upload,
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

  //下載已上傳的檔案
  loadUploadedFiles() {
    fetch(this.api.filelist) //這部分需修改為用案件id取得清單
      .then(response => response.json())
      .then(fileObjects => {
        const filePromises = fileObjects.map(file => {
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

          return fetch(`${this.api.download}/${file.FileName}`)
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
  //上傳檔案前的檢查
  handleBeforeUpload(files) {
    const length = Object.keys(files).length;
    if (length > 5) {
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

  //圖片預覽Modal
  createModal(imgEndpoint, fileName) {
    const encodedFileName = encodeURIComponent(fileName);
    const fullSizeImage = new Image();
    fullSizeImage.src = `${imgEndpoint}/${encodedFileName}`;
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
  //pdf預覽Modal
  createPdfModal(pdfEndpoint, fileName) {
    const encodedFileName = encodeURIComponent(fileName);
  
    const iframe = document.createElement('iframe');
    iframe.src = `${pdfEndpoint}/${encodedFileName}`;
    iframe.style.width = '90%';
    iframe.style.height = '90%';
  
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
  
    modal.appendChild(iframe);
  
    modal.addEventListener('click', function () {
      modal.remove();
    });
  
    document.body.appendChild(modal);
  }

  setupEventListeners() {
    //刪除檔案動作
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
        //pdf檔案預覽 listener
        const dashboardItem = event.target.closest('.uppy-Dashboard-Item');
        if (dashboardItem) {
          const fileNameElement = dashboardItem.querySelector('.uppy-Dashboard-Item-fileName .uppy-Dashboard-Item-name');
          if (fileNameElement && fileNameElement.title.endsWith('.pdf')) {
            // pdf檔案預覽 listener
            try {
              const response = await fetch(`${this.api.download}/${fileNameElement.title}`, { method: 'HEAD' });
              if (response.ok) {
                this.createPdfModal(this.api.download, fileNameElement.title);
              } else {
                console.log('pdf加載失敗，找不到檔案。');
              }
            } catch (error) {
              console.error('無法檢查pdf：', error);
            }
          }
        }
        //圖片預覽 listener
        if (event.target.classList.contains('uppy-Dashboard-Item-previewImg')) {
          try {
            const response = await fetch(`${this.api.download}/${event.target.alt}`, { method: 'HEAD' });
            if (response.ok) {
              this.createModal(this.api.download,event.target.alt);
            } else {
              console.log('圖片加載失敗，找不到圖片。');
            }
          } catch (error) {
            console.error('無法檢查圖片：', error);
          }
        }
      });
    });
  }
}