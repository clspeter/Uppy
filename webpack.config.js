const path = require('path');

module.exports = {
    entry: './src/index.js', // 您的 UppyUploader 模組的路徑
    output: {
        path: path.resolve(__dirname, 'dist'), // 打包輸出的目錄
        filename: 'uppyUploader.bundle.js' // 打包輸出的檔名
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ]
    }
};