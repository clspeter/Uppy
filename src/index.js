import Uppy, { debugLogger } from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import GoldenRetriever from "@uppy/golden-retriever";
import XHRUpload from "@uppy/xhr-upload";
import ImageEditor from "@uppy/image-editor";
import Compressor from "@uppy/compressor";
import ThumbnailGenerator from "@uppy/thumbnail-generator";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

const XHR_ENDPOINT = "http://localhost:3000/upload";

const RESTORE = false; //還原功能

const uppyDashboard = new Uppy({
  logger: debugLogger, 
  //上傳的檢查
  onBeforeUpload: (files) => {
    //檢查檔案數量
    const length = Object.keys(files).length;
    console.log(length)
    if (length > 4 ) {
      uppyDashboard.info(`最多只能上傳5個檔案`, 'error', 2000);
      return false;
    }
    //檢查總檔案大小
    let totalSize = 0;
    Object.keys(files).forEach(file => {
      totalSize += files[file].size;
    });
    console.log(totalSize)
    if (totalSize > 20000000) {
      uppyDashboard.info(`總檔案大小不能超過20MB`, 'error', 2000);
      return false;
    }
  }
})
//設定
  .use(Dashboard, {
    inline: true,
    target: "#app",
    showProgressDetails: true,
    proudlyDisplayPoweredByUppy: true,
    hideCancelButton: true,
    doneButtonHandler: null,
    showRemoveButtonAfterComplete: true,//允許刪除上傳成功的照片
  })
  .use(ImageEditor, { target: Dashboard }) //相片編輯
  .use(Compressor, { quality: 0.8, convertSize: 5000000 }) //相片壓縮
  .use(ThumbnailGenerator, { thumbnailHeight: 1000 }) //較大的縮圖，似乎沒有用
  .use(XHRUpload, { //設定上傳方式
      endpoint: XHR_ENDPOINT,
      formData: true,
      fieldName: "photo",
    });

if (RESTORE) {
  uppyDashboard.use(GoldenRetriever, { serviceWorker: true });
}

loadUploadedFiles(uppyDashboard);

window.uppy = uppyDashboard;

//取得已上傳的檔案
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
              type, 
              data: blob,
              meta: {
              }
            });
          });
      });

      // 等待所有文件都添加到 Uppy 後，把文件設定成以上傳完成的狀態
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

//刪除檔案
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

//點擊圖片顯示預覽，僅限已上傳的檔案
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