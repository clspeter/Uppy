const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/uppyUploader.js', // 您的 UppyUploader 模組的路徑
    output: {
        path: path.resolve(__dirname, 'dist'), // 打包輸出的目錄
        filename: 'uppyUploader.bundle.js', // 打包輸出的檔名
        library: 'UppyUploader', // 設置輸出的模組名稱
        libraryTarget: 'umd', // 設置輸出格式為 CommonJS
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env']
                  }
                }
              },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ]
    }
};