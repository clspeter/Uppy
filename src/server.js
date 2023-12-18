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
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage })

const uploadDirectory = path.join(__dirname, 'uploads');


app.use('/download', express.static(uploadDirectory));

app.get('/files', (req, res) => {
    fs.readdir(uploadDirectory, (err, files) => {
        if (err) {
            res.status(500).send('無法讀取檔案');
        } else {
            const fileDetails = files.map(file => {
                return {
                    name: file,
                    url: `http://localhost:3000/download/${file}`
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

