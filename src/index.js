import Uppy, { debugLogger } from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import GoldenRetriever from "@uppy/golden-retriever";
import Tus from "@uppy/tus";
import AwsS3 from "@uppy/aws-s3";
import AwsS3Multipart from "@uppy/aws-s3-multipart";
import XHRUpload from "@uppy/xhr-upload";
import ImageEditor from "@uppy/image-editor";
import Compressor from "@uppy/compressor";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/image-editor/dist/style.css";

const UPLOADER = "xhr";
const COMPANION_URL = "http://companion.uppy.io";
const companionAllowedHosts = [];
const TUS_ENDPOINT = "https://tusd.tusdemo.net/files/";
const XHR_ENDPOINT = "http://localhost:3000/upload";

const RESTORE = false;

const uppyDashboard = new Uppy({ logger: debugLogger })
  .use(Dashboard, {
    inline: true,
    target: "#app",
    showProgressDetails: true,
    proudlyDisplayPoweredByUppy: true,
    hideCancelButton: true,
  })
  .use(ImageEditor, { target: Dashboard }) //相片編輯
  .use(Compressor, { maxWidth: 4096, maxHeight: 4096, convertSize: 2000000 }); //相片壓縮
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
        return fetch(`http://localhost:3000/download/${file.name}`)
          .then(response => response.blob())
          .then(blob => {
            uppy.addFile({
              source: 'server',
              name: file.name,
              type: 'image/jpeg', // 要根據文件的實際類型設置
              data: blob,
              meta:{

              }
            });
          });
      });

      // 等待所有文件都添加到 Uppy
      Promise.all(filePromises).then(() => {
        uppy.getFiles().forEach(file => {
          uppy.setFileState(file.id, {
            progress: {},
          });
        });
      });
    })
    .catch(error => console.error('Error loading files:', error));
}

uppyDashboard.on("complete",(result) => {
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
