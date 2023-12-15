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

const UPLOADER = "tus";
const COMPANION_URL = "http://companion.uppy.io";
const companionAllowedHosts = [];
const TUS_ENDPOINT = "https://tusd.tusdemo.net/files/";
const XHR_ENDPOINT = "";

const RESTORE = false;

const uppyDashboard = new Uppy({ logger: debugLogger })
  .use(Dashboard, {
    inline: true,
    target: "#app",
    showProgressDetails: true,
    proudlyDisplayPoweredByUppy: true,
  })
  .use(ImageEditor, { target: Dashboard }) //相片編輯
  .use(Compressor, { maxWidth: 4096, maxHeight: 4096, convertSize: 2000000 }); //相片壓縮

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
      limit: 6,
      bundle: true,
    });
    break;
  default:
}

if (RESTORE) {
  uppyDashboard.use(GoldenRetriever, { serviceWorker: true });
}

window.uppy = uppyDashboard;

uppyDashboard.on("complete", (result) => {
  if (result.failed.length === 0) {
    console.log("Upload successful");
  } else {
    console.warn("Upload failed");
  }
  console.log("successful files:", result.successful);
  console.log("failed files:", result.failed);
});
