const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const datasetPath = path.resolve(__dirname, '../data/dataset_50_cards/cards.json');
const imagesDir = path.resolve(__dirname, '../data/dataset_50_cards/images');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const cards = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

// Palette presets
const PALETTES = [
  { bg: '#ffffff', text: '#1e293b', accent: '#2563eb', border: '#e2e8f0', tagBg: '#eff6ff', tagText: '#1d4ed8' },
  { bg: '#fafaf9', text: '#1c1917', accent: '#b45309', border: '#e7e5e4', tagBg: '#fef3c7', tagText: '#92400e' },
  { bg: '#f8fafc', text: '#0f172a', accent: '#0d9488', border: '#cbd5e1', tagBg: '#f0fdfa', tagText: '#0f766e' },
  { bg: '#fdf4ff', text: '#3b0764', accent: '#9333ea', border: '#f5d0fe', tagBg: '#fae8ff', tagText: '#86198f' },
  { bg: '#ffffff', text: '#111827', accent: '#dc2626', border: '#fecaca', tagBg: '#fef2f2', tagText: '#b91c1c' },
];

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function renderCard(card, index) {
  const p = PALETTES[index % PALETTES.length];
  const width = 1050;
  const height = 600;

  const gt = card.groundTruth;
  const title = escapeXml(card.title);
  const fullName = escapeXml(gt.fullName);
  const company = escapeXml(gt.company);
  const designation = escapeXml(gt.designation || '');
  const phone = escapeXml(gt.phone || '');
  const altPhone = escapeXml(gt.alternatePhone || '');
  const email = escapeXml(gt.email || '');
  const website = escapeXml(gt.website || '');
  const address = escapeXml(gt.address || '');
  const cityState = escapeXml([gt.city, gt.state, gt.country].filter(Boolean).join(', '));
  const notes = escapeXml(gt.notes || '');

  const phonesCombined = [phone, altPhone].filter(Boolean).join('  |  ');
  const onlineCombined = [email, website].filter(Boolean).join('  •  ');

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Card Background -->
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="20" fill="${p.bg}" stroke="${p.border}" stroke-width="3" filter="url(#shadow)" />

  <!-- Top Accent Banner -->
  <rect x="20" y="20" width="${width - 40}" height="10" rx="4" fill="${p.accent}" />

  <!-- Category & ID Pill -->
  <rect x="50" y="45" width="130" height="32" rx="16" fill="${p.tagBg}" />
  <text x="115" y="66" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="${p.tagText}" text-anchor="middle">CARD #${String(card.id).padStart(2, '0')} • ${card.category}</text>

  <!-- Person Name -->
  <text x="50" y="130" font-family="'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif" font-size="34" font-weight="bold" fill="${p.text}">${fullName}</text>

  <!-- Designation -->
  ${designation ? `<text x="50" y="165" font-family="'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif" font-size="19" font-weight="600" fill="${p.accent}">${designation}</text>` : ''}

  <!-- Divider Line -->
  <line x1="50" y1="190" x2="${width - 50}" y2="190" stroke="${p.border}" stroke-width="2" />

  <!-- Company Name (prominent bold) -->
  <text x="50" y="250" font-family="'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif" font-size="38" font-weight="900" fill="${p.accent}">${company}</text>

  ${notes ? `<text x="50" y="295" font-family="'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif" font-size="18" fill="#475569" font-style="italic">${notes.replace(/\n/g, ' • ')}</text>` : ''}

  <!-- Contact Info Section -->
  <g transform="translate(50, 360)">
    <!-- Phones -->
    ${phonesCombined ? `
      <g transform="translate(0, 0)">
        <circle cx="16" cy="16" r="16" fill="${p.tagBg}" />
        <text x="16" y="22" font-family="sans-serif" font-size="16" text-anchor="middle" fill="${p.tagText}">📞</text>
        <text x="45" y="22" font-family="'Segoe UI', sans-serif" font-size="20" font-weight="bold" fill="${p.text}">${phonesCombined}</text>
      </g>
    ` : ''}

    <!-- Emails & Web -->
    ${onlineCombined ? `
      <g transform="translate(0, 50)">
        <circle cx="16" cy="16" r="16" fill="${p.tagBg}" />
        <text x="16" y="22" font-family="sans-serif" font-size="16" text-anchor="middle" fill="${p.tagText}">✉️</text>
        <text x="45" y="22" font-family="'Segoe UI', sans-serif" font-size="19" fill="${p.text}">${onlineCombined}</text>
      </g>
    ` : ''}

    <!-- Street Address -->
    ${address ? `
      <g transform="translate(0, 100)">
        <circle cx="16" cy="16" r="16" fill="${p.tagBg}" />
        <text x="16" y="22" font-family="sans-serif" font-size="16" text-anchor="middle" fill="${p.tagText}">📍</text>
        <text x="45" y="22" font-family="'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif" font-size="18" fill="#334155">${address}</text>
      </g>
    ` : ''}

    <!-- City & State -->
    ${cityState ? `
      <g transform="translate(45, 135)">
        <text x="0" y="16" font-family="'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif" font-size="17" font-weight="600" fill="#64748b">${cityState}</text>
      </g>
    ` : ''}
  </g>
</svg>
`;

  const fileName = `card_${String(card.id).padStart(2, '0')}.png`;
  const filePath = path.join(imagesDir, fileName);

  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile(filePath);

  return fileName;
}

async function run() {
  console.log(`Starting generation of 50 realistic business card images...`);
  for (let i = 0; i < cards.length; i++) {
    const fileName = await renderCard(cards[i], i);
    if ((i + 1) % 10 === 0 || i === cards.length - 1) {
      console.log(`✓ Generated ${i + 1}/${cards.length} cards (${fileName})`);
    }
  }
  console.log(`\n🎉 Successfully rendered all 50 high-resolution business card images in:`);
  console.log(imagesDir);
}

run().catch(console.error);

