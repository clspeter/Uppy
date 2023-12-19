const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },
    filename: function (req, file, cb) {
      const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, filename);
    }
});

const upload = multer({ storage: storage })

const uploadDirectory = path.join(__dirname, 'uploads');


app.use('/download', express.static(uploadDirectory));


const { v4: uuidv4 } = require('uuid');

app.get('/files', (req, res) => {
    fs.readdir(uploadDirectory, (err, files) => {
        if (err) {
            res.status(500).send('無法讀取檔案');
        } else {
            const fileDetails = files.map(file => {
                const filePath = path.join(uploadDirectory, file);
                const stats = fs.statSync(filePath);
                const fileSizeInBytes = stats.size;
                const extensionName = path.extname(file);

                return {
                    Id: uuidv4(), // 使用 uuid 生成唯一 ID
                    AttachmentId: uuidv4(), // 同上
                    FileName: file,
                    ExtensionName: extensionName,
                    Path: filePath,
                    Description: '', // 描述信息，如果有的話
                    Size: fileSizeInBytes,
                    Seq: null // 如果有序列號的話
                };
            });
            res.json(fileDetails);
        }
    });
});
app.post('/upload', upload.single('photo'), (req, res) => {
    //儲存檔案
    console.log(req.file);
  res.status(200).send('檔案已上傳');
});

app.delete('/delete/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    // 实现删除文件的逻辑，例如使用 fs.unlink
    fs.unlink(path.join(uploadDirectory, fileName), (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error deleting file');
      } else {
        res.status(200).send('File deleted');
      }
    });
  });
  
app.listen(3000, () => console.log('伺服器運行在 http://localhost:3000'));

