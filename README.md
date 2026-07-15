# Image Splitter

纯浏览器图片分割工具，支持自定义行列、分割线、边框和输出格式，并可将全部分块打包为 ZIP 下载。

## 功能

- 支持 PNG、JPEG 和 WebP 图片
- 自定义 1–20 行、1–20 列
- 自定义分割线粗细与颜色
- PNG、JPEG、WebP 输出
- ZIP 批量下载
- 图片仅在浏览器本地处理，不上传服务器

## 使用

访问 [zeromarker.github.io/tool](https://zeromarker.github.io/tool/)，或直接打开 `index.html`。

## 技术

项目为无构建步骤的静态页面，ZIP 打包使用 [JSZip](https://stuk.github.io/jszip/)。
