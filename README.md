# ZeroMarker Tools

纯浏览器端的小工具集合，无构建步骤，打开即用。

## 工具列表

| 工具 | 路径 | 说明 |
| --- | --- | --- |
| 图片分割 | `/` | 按行列分割图片，支持分割线/边框/输出格式，ZIP 打包下载 |
| 待办清单 | `/todo/` | 本地待办事项，数据保存在浏览器 localStorage |

## 目录结构

```
tool/
├── index.html      # 图片分割页面
├── app.js          # 图片分割逻辑 + 主题切换
├── index.css       # 所有工具共享的页面外壳样式（主题、布局、导航）
├── splitter.css    # 图片分割页面专属样式
└── todo/           # 待办清单应用
    ├── index.html
    ├── todo.js     # 待办逻辑（localStorage 持久化）
    └── todo.css
```

## 使用

访问 [zeromarker.github.io/tool/](https://zeromarker.github.io/tool/) 或直接打开对应 `index.html`。

- 图片分割依赖 [JSZip](https://stuk.github.io/jszip/)（CDN 加载）。
- 待办清单数据存储在浏览器 `localStorage`，清空浏览器数据会丢失，请勿存放重要信息。

## 技术

项目为无构建步骤的静态页面，共享同一套 CSS 变量与页面外壳。图片仅在浏览器本地处理，不上传服务器。
