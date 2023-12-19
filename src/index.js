import Uppy, { debugLogger } from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import GoldenRetriever from "@uppy/golden-retriever";
import Tus from "@uppy/tus";
import AwsS3 from "@uppy/aws-s3";
import AwsS3Multipart from "@uppy/aws-s3-multipart";
import XHRUpload from "@uppy/xhr-upload";
import ImageEditor from "@uppy/image-editor";
import Compressor from "@uppy/compressor";
import ThumbnailGenerator from "@uppy/thumbnail-generator";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

const UPLOADER = "xhr";
const COMPANION_URL = "http://companion.uppy.io";
const companionAllowedHosts = [];
const TUS_ENDPOINT = "https://tusd.tusdemo.net/files/";
const XHR_ENDPOINT = "http://localhost:3000/upload";

const RESTORE = false;

const uppyDashboard = new Uppy({
  logger: debugLogger, 
  onBeforeUpload: (files) => {
    //檢查檔案數量
    const length = Object.keys(files).length;
    console.log(length)
    if (length > 4 ) {
      uppyDashboard.info(`最多只能上傳4個檔案`, 'error', 2000);
      return false;
    }
    //檢查總檔案大小
    let totalSize = 0;
    Object.keys(files).forEach(file => {
      totalSize += files[file].size;
    });
    console.log(totalSize)
    if (totalSize > 50000000) {
      uppyDashboard.info(`總檔案大小不能超過50MB`, 'error', 2000);
      return false;
    }
  }

})
  .use(Dashboard, {
    inline: true,
    target: "#app",
    showProgressDetails: true,
    proudlyDisplayPoweredByUppy: true,
    hideCancelButton: true,
    doneButtonHandler: null,
    showRemoveButtonAfterComplete: true,
  })
  .use(ImageEditor, { target: Dashboard }) //相片編輯
  .use(Compressor, { quality: 0.8, convertSize: 5000000 }) //相片壓縮
  .use(ThumbnailGenerator, { thumbnailHeight: 1000 });
//載入相片

switch (UPLOADER) {
  case "tus":
    uppyDashboard.use(Tus, { endpoint: TUS_ENDPOINT, limit: 6 });
    break;
  case "s3":
    uppyDashboard.use(AwsS3, { companionUrl: COMPANION_URL, limit: 6 });
    break;
  case "s3-multipart":
    uppyDashboard.use(AwsS3Multipart, {
      companionUrl: COMPANION_URL,
      limit: 6,
    });
    break;
  case "xhr":
    uppyDashboard.use(XHRUpload, {
      endpoint: XHR_ENDPOINT,
      formData: true,
      fieldName: "photo",
    });
    break;
  default:
}

if (RESTORE) {
  uppyDashboard.use(GoldenRetriever, { serviceWorker: true });
}

loadUploadedFiles(uppyDashboard);

window.uppy = uppyDashboard;

function loadUploadedFiles(uppy) {
  fetch('http://localhost:3000/files')
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

        return fetch(`http://localhost:3000/download/${file.FileName}`)
          .then(response => response.blob())
          .then(blob => {
            uppy.addFile({
              source: 'server',
              name: file.FileName,
              type, // 要根據文件的實際類型設置
              data: blob,
              meta: {
              }
            });
          });
      });

      // 等待所有文件都添加到 Uppy
      Promise.all(filePromises).then(() => {
        uppy.getFiles().forEach(file => {
          uppy.setFileState(file.id, {
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

uppyDashboard.on("complete", (result) => {
  if (result.failed.length === 0) {
    console.log("Upload successful");
  } else {
    console.warn("Upload failed");
  }
  console.log("successful files:", result.successful);
  console.log("failed files:", result.failed);
  //restart uppy
});

uppyDashboard.on("file-removed", (file) => {
  fetch(`http://localhost:3000/delete/${file.name}`, { method: "DELETE" })
    .then((response) => response.text())
    .then((responseText) => {
      console.log(responseText);
    })
    .catch((error) => {
      console.error(error);
    });
});

uppyDashboard.on('file-editor:complete', (updatedFile) => {
  //meta新增isEdited屬性
  uppyDashboard.setFileMeta(updatedFile.id, {
    upload: true,
  });
});

//上傳前檢查upload屬性，若為真則上傳否則不上傳
uppyDashboard.on('before-upload', (file) => {
  if (file.meta.upload) {
    console.log('上傳檔案：', file.name)
    return true;
  } else {
    console.log('不上傳檔案：', file.name)
    return false;
  }
}
);




document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', async function (event) {
    if (event.target.classList.contains('uppy-Dashboard-Item-previewImg')) {
      try {
        const response = await fetch(`http://localhost:3000/download/${event.target.alt}`, { method: 'HEAD' });
        if (response.ok) {
          createModal(`http://localhost:3000/download/${event.target.alt}`);
        } else {
          console.log('圖片加載失敗，不顯示模態窗口。');
        }
      } catch (error) {
        console.error('無法檢查圖片：', error);
      }
    }
  });
});

function createModal(imageSrc) {
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
  modal.style.zIndex = '1000';
  modal.style.cursor = 'pointer';

  modal.appendChild(fullSizeImage);

  modal.addEventListener('click', function () {
    modal.remove();
  });

  document.body.appendChild(modal);
}