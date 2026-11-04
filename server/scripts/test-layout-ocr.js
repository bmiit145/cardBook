const fs = require('fs');
const imageService = require('../src/services/imageService');
const { getWorker } = require('../src/services/ocrService');

function parseTsvLayout(tsv, pageWidth = 1000, pageHeight = 600) {
  if (!tsv) return { lines: [], blocks: [], words: [], pageWidth, pageHeight };

  const lines = [];
  const lineMap = new Map();
  const rows = tsv.split('\n');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;
    const cols = row.split('\t');
    if (cols.length < 11) continue;

    const level = parseInt(cols[0], 10);
    const blockNum = parseInt(cols[2], 10);
    const parNum = parseInt(cols[3], 10);
    const lineNum = parseInt(cols[4], 10);
    const wordNum = parseInt(cols[5], 10);
    const left = parseInt(cols[6], 10);
    const top = parseInt(cols[7], 10);
    const width = parseInt(cols[8], 10);
    const height = parseInt(cols[9], 10);
    const conf = parseFloat(cols[10]);
    const text = cols[11] || '';

    if (level === 1) {
      if (width > 0) pageWidth = width;
      if (height > 0) pageHeight = height;
    } else if (level === 5 && text.trim()) {
      const lineKey = `${blockNum}_${parNum}_${lineNum}`;
      if (!lineMap.has(lineKey)) {
        lineMap.set(lineKey, {
          lineKey,
          blockNum,
          parNum,
          lineNum,
          words: [],
          left: left,
          top: top,
          right: left + width,
          bottom: top + height,
          confidences: [],
        });
      }

      const l = lineMap.get(lineKey);
      l.words.push({ text: text.trim(), left, top, width, height, conf });
      l.confidences.push(conf);
      l.left = Math.min(l.left, left);
      l.top = Math.min(l.top, top);
      l.right = Math.max(l.right, left + width);
      l.bottom = Math.max(l.bottom, top + height);
    }
  }

  const sortedLines = Array.from(lineMap.values())
    .map((l) => {
      const width = l.right - l.left;
      const height = l.bottom - l.top;
      const text = l.words.map((w) => w.text).join(' ');
      const avgConf = l.confidences.length
        ? Math.round(l.confidences.reduce((a, b) => a + b, 0) / l.confidences.length)
        : 0;
      return {
        text,
        left: l.left,
        top: l.top,
        width,
        height,
        bottom: l.bottom,
        right: l.right,
        xRatio: l.left / pageWidth,
        yRatio: l.top / pageHeight,
        widthRatio: width / pageWidth,
        heightRatio: height / pageHeight,
        confidence: avgConf,
        words: l.words,
        blockNum: l.blockNum,
      };
    })
    .sort((a, b) => {
      // Sort in natural reading order: top-to-bottom, then left-to-right
      if (Math.abs(a.top - b.top) > 15) {
        return a.top - b.top;
      }
      return a.left - b.left;
    });

  // Calculate median font height across lines
  const heights = sortedLines.map((l) => l.height).sort((a, b) => a - b);
  const medianHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 20;

  sortedLines.forEach((l) => {
    l.fontSizeRatio = l.height / (medianHeight || 1);
  });

  return { lines: sortedLines, pageWidth, pageHeight, medianHeight };
}

async function test() {
  const worker = await getWorker();
  const rawImageBuffer = fs.readFileSync('examples/IMG_20261102_153255716.jpg');
  const { ocrBuffer } = await imageService.preprocessForOcr(rawImageBuffer, 270);
  const res = await worker.recognize(ocrBuffer, {}, { text: true, tsv: true });
  const layout = parseTsvLayout(res.data.tsv);

  console.log(`Parsed ${layout.lines.length} lines. Median height: ${layout.medianHeight}px`);
  layout.lines.forEach((l, i) => {
    console.log(
      `Line ${i}: [y=${l.yRatio.toFixed(2)}, x=${l.xRatio.toFixed(2)}, sizeRatio=${l.fontSizeRatio.toFixed(2)}] "${l.text}"`
    );
  });
}

test().catch(console.error);
