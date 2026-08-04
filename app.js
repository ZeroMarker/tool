// ── 主题切换 ──
(function() {
    const toggle = document.querySelector('.theme-toggle');
    const icon = toggle.querySelector('span');
    const root = document.documentElement;
    const themeColor = document.querySelector('meta[name="theme-color"]');

    function sync() {
        const isLight = root.dataset.theme === 'light';
        icon.textContent = isLight ? '☀️' : '🌙';
        toggle.setAttribute('aria-label', isLight ? '切换为深色主题' : '切换为浅色主题');
        themeColor.setAttribute('content', isLight ? '#f6f7fb' : '#101521');
    }

    toggle.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        try { localStorage.setItem('theme', root.dataset.theme); } catch {}
        sync();
    });

    sync();
})();

// ── 核心逻辑 ──
(function() {
    'use strict';

    // DOM refs
    const uploadZone = document.getElementById('uploadZone');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const toolPanel = document.getElementById('toolPanel');
    const previewContainer = document.getElementById('previewContainer');
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const rowsInput = document.getElementById('rowsInput');
    const colsInput = document.getElementById('colsInput');
    const lineWidthInput = document.getElementById('lineWidthInput');
    const lineColorInput = document.getElementById('lineColorInput');
    const lineColorText = document.getElementById('lineColorText');
    const rowsDisplay = document.getElementById('rowsDisplay');
    const colsDisplay = document.getElementById('colsDisplay');
    const lineWidthDisplay = document.getElementById('lineWidthDisplay');
    const borderWidthInput = document.getElementById('borderWidthInput');
    const borderWidthDisplay = document.getElementById('borderWidthDisplay');
    const totalPieces = document.getElementById('totalPieces');
    const previewToggle = document.getElementById('previewToggle');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadHint = document.getElementById('downloadHint');
    const previewInfo = document.getElementById('previewInfo');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const formatRadios = document.querySelectorAll('input[name="format"]');

    let sourceImage = null; // HTMLImageElement
    let sourceFile = null;  // original File

    // ── 上传 ──
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) loadImage(file);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) loadImage(fileInput.files[0]);
    });

    function loadImage(file) {
        sourceFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                sourceImage = img;
                uploadZone.classList.add('is-hidden');
                toolPanel.classList.remove('is-hidden');
                fitCanvas();
                drawPreview();
                downloadBtn.disabled = false;
                previewInfo.textContent = `加载完成 · ${img.naturalWidth}×${img.naturalHeight} · 点击下载按钮打包所有分块`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ── Canvas 自适应 ──
    function fitCanvas() {
        const container = previewContainer;
        const maxW = container.clientWidth - 4;
        const maxH = container.clientHeight - 4;
        const imgW = sourceImage.naturalWidth;
        const imgH = sourceImage.naturalHeight;
        const scale = Math.min(maxW / imgW, maxH / imgH, 1);
        canvas.width = Math.round(imgW * scale);
        canvas.height = Math.round(imgH * scale);
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    }

    function getSplitLayout(rows, cols, lineW, borderWidth) {
        const imgW = sourceImage.naturalWidth;
        const imgH = sourceImage.naturalHeight;
        const totalW = imgW - borderWidth * 2;
        const totalH = imgH - borderWidth * 2;
        const cellW = Math.floor((totalW - (lineW * (cols - 1))) / cols);
        const cellH = Math.floor((totalH - (lineW * (rows - 1))) / rows);
        const usedW = cols * cellW + (cols - 1) * lineW;
        const usedH = rows * cellH + (rows - 1) * lineW;

        return {
            imgW,
            imgH,
            totalW,
            totalH,
            cellW,
            cellH,
            usedW,
            usedH,
            isValid: cellW >= 1 && cellH >= 1,
        };
    }

    // ── 绘制预览 ──
    function drawPreview() {
        if (!sourceImage) return;
        const cw = canvas.width;
        const ch = canvas.height;
        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        const lineW = parseInt(lineWidthInput.value);
        const color = lineColorInput.value;
        const showGrid = previewToggle.checked;
        const borderWidth = parseInt(borderWidthInput.value);

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(sourceImage, 0, 0, cw, ch);

        if (showGrid && rows > 0 && cols > 0) {
            const layout = getSplitLayout(rows, cols, lineW, borderWidth);

            if (!layout.isValid) {
                updateStats();
                return;
            }

            const scale = cw / layout.imgW;
            const toCanvas = value => Math.round(value * scale);
            const fillSourceRect = (x, y, width, height) => {
                const left = toCanvas(x);
                const top = toCanvas(y);
                const right = toCanvas(x + width);
                const bottom = toCanvas(y + height);
                ctx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
            };
            ctx.fillStyle = color;

            if (borderWidth > 0) {
                fillSourceRect(0, 0, layout.imgW, borderWidth);
                fillSourceRect(0, layout.imgH - borderWidth, layout.imgW, borderWidth);
                fillSourceRect(0, 0, borderWidth, layout.imgH);
                fillSourceRect(layout.imgW - borderWidth, 0, borderWidth, layout.imgH);
            }

            if (lineW > 0) {
                for (let c = 1; c < cols; c++) {
                    const x = borderWidth + c * layout.cellW + (c - 1) * lineW;
                    fillSourceRect(x, borderWidth, lineW, layout.totalH);
                }

                for (let r = 1; r < rows; r++) {
                    const y = borderWidth + r * layout.cellH + (r - 1) * lineW;
                    fillSourceRect(borderWidth, y, layout.totalW, lineW);
                }
            }

            const unusedRight = layout.totalW - layout.usedW;
            const unusedBottom = layout.totalH - layout.usedH;

            if (unusedRight > 0) {
                fillSourceRect(borderWidth + layout.usedW, borderWidth, unusedRight, layout.totalH);
            }

            if (unusedBottom > 0) {
                fillSourceRect(borderWidth, borderWidth + layout.usedH, layout.totalW, unusedBottom);
            }
        }

        updateStats();
    }

    // ── 更新统计 ──
    function updateStats() {
        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        totalPieces.textContent = `${rows} × ${cols} = ${rows * cols} 块`;
    }

    // ── 参数事件 ──
    rowsInput.addEventListener('input', () => {
        rowsDisplay.textContent = rowsInput.value;
        drawPreview();
    });
    colsInput.addEventListener('input', () => {
        colsDisplay.textContent = colsInput.value;
        drawPreview();
    });
    lineWidthInput.addEventListener('input', () => {
        lineWidthDisplay.textContent = lineWidthInput.value;
        drawPreview();
    });
    borderWidthInput.addEventListener('input', () => {
        borderWidthDisplay.textContent = borderWidthInput.value;
        drawPreview();
    });
    lineColorInput.addEventListener('input', () => {
        lineColorText.textContent = lineColorInput.value;
        drawPreview();
    });
    previewToggle.addEventListener('change', drawPreview);

    // 输出格式切换
    formatRadios.forEach(r => {
        r.addEventListener('change', () => {
            document.querySelectorAll('.radio-chip').forEach(chip => {
                chip.dataset.checked = chip.querySelector('input').checked ? '' : undefined;
            });
        });
    });

    // 窗口尺寸变化重新适配
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (sourceImage) { fitCanvas(); drawPreview(); }
        }, 200);
    });

    // ── 分割并下载 ──
    downloadBtn.addEventListener('click', async () => {
        if (!sourceImage) return;

        const rows = parseInt(rowsInput.value);
        const cols = parseInt(colsInput.value);
        const lineW = parseInt(lineWidthInput.value);
        const borderWidth = parseInt(borderWidthInput.value);
        const format = document.querySelector('input[name="format"]:checked').value;
        const ext = format === 'jpeg' ? 'jpg' : format;

        // 每块尺寸（去掉分割线间隙和边框）
        const layout = getSplitLayout(rows, cols, lineW, borderWidth);

        if (!layout.isValid) {
            previewInfo.textContent = '⚠️ 分割线或边框过粗，请减小参数';
            return;
        }

        if (typeof JSZip === 'undefined') {
            previewInfo.textContent = '❌ JSZip 库加载失败，请刷新页面重试';
            return;
        }

        showLoading('正在分割图片…');

        try {
            const zip = new JSZip();
            const total = rows * cols;
            const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

            // 计算文件名填充位数
            const padLen = String(total).length;

            const offscreen = document.createElement('canvas');
            const offCtx = offscreen.getContext('2d');

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const sx = borderWidth + Math.round(c * (layout.cellW + lineW));
                    const sy = borderWidth + Math.round(r * (layout.cellH + lineW));

                    offscreen.width = layout.cellW;
                    offscreen.height = layout.cellH;
                    offCtx.clearRect(0, 0, layout.cellW, layout.cellH);
                    offCtx.drawImage(sourceImage, sx, sy, layout.cellW, layout.cellH, 0, 0, layout.cellW, layout.cellH);

                    const blob = await new Promise(resolve => {
                        offscreen.toBlob(b => resolve(b), mimeType, 0.92);
                    });

                    const idx = r * cols + c + 1;
                    const name = `split_${String(idx).padStart(padLen, '0')}.${ext}`;
                    zip.file(name, blob);
                }
            }

            showLoading('正在打包 ZIP…');

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const originalName = sourceFile ? sourceFile.name.replace(/\.[^.]+$/, '') : 'image';
            // 原生下载（无需 FileSaver.js）
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${originalName}_split.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 10000);

            hideLoading();
            previewInfo.textContent = `✅ 下载完成！共 ${total} 块图片已打包为 ZIP`;
        } catch (err) {
            hideLoading();
            previewInfo.textContent = '❌ 出错了: ' + err.message;
            console.error(err);
        }
    });

    // ── 加载指示器 ──
    function showLoading(text) {
        loadingText.textContent = text || '正在处理…';
        loadingOverlay.classList.remove('is-hidden');
        downloadBtn.disabled = true;
    }

    function hideLoading() {
        loadingOverlay.classList.add('is-hidden');
        downloadBtn.disabled = false;
    }

    // ── 重新上传 ──
    // 允许点击图片区域重新上传
    previewContainer.addEventListener('dblclick', () => {
        if (confirm('重新选择图片？当前分割参数将保留。')) {
            fileInput.value = '';
            fileInput.click();
        }
    });

    // ── 键盘快捷键 ──
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !downloadBtn.disabled && !toolPanel.classList.contains('is-hidden')) {
            downloadBtn.click();
        }
    });
})();
