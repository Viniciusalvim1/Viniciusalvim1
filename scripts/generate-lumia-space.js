const fs = require('fs');
const username = process.env.GITHUB_USERNAME || 'Viniciusalvim1';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN nao encontrado.');

const query = [
  'query($login: String!) {',
  '  user(login: $login) {',
  '    contributionsCollection {',
  '      contributionCalendar {',
  '        totalContributions',
  '        weeks { contributionDays { date contributionCount } }',
  '      }',
  '    }',
  '  }',
  '}',
].join('\n');

async function fetchContributions() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query, variables: { login: username } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data.user.contributionsCollection.contributionCalendar;
}

function level(n) {
  if (n === 0) return 0;
  if (n <= 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

function monthName(dateString) {
  const d = new Date(dateString + 'T00:00:00Z');
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getUTCMonth()];
}

function stars(w, h) {
  const out = [];
  for (let i = 0; i < 60; i++) {
    const x = 24 + ((i * 139) % (w - 48));
    const y = 24 + ((i * 89) % (h - 48));
    const r = i % 8 === 0 ? 1.6 : 0.9;
    const a = (0.15 + ((i * 17) % 45) / 100).toFixed(2);
    out.push('<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity="' + a + '"/>');
  }
  return out.join('\n');
}

function makeSvg(calendar, mode) {
  const weeks = calendar.weeks;
  const total = calendar.totalContributions;
  const W = 1500, H = 720;
  const gridX = 145, gridY = 310, cell = 18, gap = 5, step = cell + gap;
  const gridW = weeks.length * step;
  const dark = mode !== 'light';
  const colors = dark ? ['#132233','#113742','#16605D','#24A99B','#63F2C3'] : ['#D7E8EF','#B9E9E0','#7ADFD2','#35CDBA','#0FBF9F'];
  const page = dark ? '#050A14' : '#EAF8FF';
  const bg1 = dark ? '#081827' : '#D9F2F4';
  const bg2 = dark ? '#0C2A40' : '#BFE7F0';
  const text = dark ? '#F8FAFC' : '#0A1630';
  const muted = dark ? '#8EA1B7' : '#426178';
  const accent = dark ? '#63F2C3' : '#0FBF9F';
  const accent2 = dark ? '#7FDBFF' : '#1BA9E1';
  const panel = dark ? '#10263A' : '#FFFFFF';
  const border = dark ? '#23455F' : '#8ED8E0';
  const ufoDistance = Math.min(gridW - 150, 1030);

  const months = [];
  let lastMonth = '';
  for (let w = 0; w < weeks.length; w++) {
    for (let d = 0; d < weeks[w].contributionDays.length; d++) {
      const dateString = weeks[w].contributionDays[d].date;
      const date = new Date(dateString + 'T00:00:00Z');
      const dayOfMonth = date.getUTCDate();
      const month = monthName(dateString);
      if (dayOfMonth <= 7 && month !== lastMonth) {
        months.push('<text x="' + (gridX + w * step) + '" y="' + (gridY - 24) + '" class="month">' + month + '</text>');
        lastMonth = month;
        break;
      }
    }
  }

  const cells = [];
  for (let w = 0; w < weeks.length; w++) {
    for (let d = 0; d < weeks[w].contributionDays.length; d++) {
      const day = weeks[w].contributionDays[d];
      const lv = level(day.contributionCount);
      const x = gridX + w * step;
      const y = gridY + d * step;
      const glow = lv >= 3 ? ' filter="url(#cellGlow)"' : '';
      const op = lv === 0 ? '0.38' : '0.86';
      cells.push('<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="6" fill="' + colors[lv] + '" opacity="' + op + '" stroke="#fff" stroke-opacity="0.04"' + glow + '/>');
    }
  }

  const legend = [];
  for (let i = 0; i < colors.length; i++) {
    legend.push('<rect x="' + (1110 + i * 34) + '" y="631" width="24" height="24" rx="6" fill="' + colors[i] + '" opacity="' + (i === 0 ? '0.45' : '0.95') + '"/>');
  }

  return [
    '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">',
    '<defs>',
    '<linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + bg1 + '"/><stop offset="55%" stop-color="' + bg2 + '"/><stop offset="100%" stop-color="' + bg1 + '"/></linearGradient>',
    '<radialGradient id="nebulaA"><stop offset="0%" stop-color="' + accent + '" stop-opacity="0.20"/><stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="nebulaB"><stop offset="0%" stop-color="' + accent2 + '" stop-opacity="0.16"/><stop offset="100%" stop-color="' + accent2 + '" stop-opacity="0"/></radialGradient>',
    '<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + accent + '" stop-opacity="0.42"/><stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/></linearGradient>',
    '<filter id="cellGlow"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="' + accent + '" flood-opacity="0.7"/></filter>',
    '<filter id="softGlow"><feDropShadow dx="0" dy="0" stdDeviation="13" flood-color="' + accent + '" flood-opacity="0.55"/></filter>',
    '<clipPath id="cardClip"><rect x="18" y="22" width="1464" height="670" rx="46"/></clipPath>',
    '<clipPath id="gridClip"><rect x="' + (gridX - 12) + '" y="' + (gridY - 90) + '" width="' + (gridW + 70) + '" height="360" rx="24"/></clipPath>',
    '</defs>',
    '<style>',
    '.total{font:900 48px Arial,sans-serif;fill:' + text + ';letter-spacing:-1px}.subtitle{font:700 28px Arial,sans-serif;fill:' + muted + '}.badge{font:800 22px Arial,sans-serif;fill:' + accent + ';letter-spacing:2px}.btn{font:800 27px Arial,sans-serif;fill:' + text + '}.month{font:700 21px Arial,sans-serif;fill:' + muted + '}.day{font:700 22px Arial,sans-serif;fill:' + muted + '}.footer{font:700 24px Arial,sans-serif;fill:' + muted + '}',
    '.ufoMove{animation:ufoMove 8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.float{animation:float 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}.beam{animation:beamPulse 3s ease-in-out infinite}.shooting{animation:shoot 7.4s ease-in-out infinite}',
    '@keyframes ufoMove{0%{transform:translateX(0)}45%{transform:translateX(' + ufoDistance + 'px)}50%{transform:translateX(' + ufoDistance + 'px)}95%{transform:translateX(0)}100%{transform:translateX(0)}}',
    '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes beamPulse{0%,100%{opacity:.25}50%{opacity:.55}}@keyframes shoot{0%{transform:translate(-120px,-20px);opacity:0}8%{opacity:1}55%{opacity:.9}65%{transform:translate(240px,88px);opacity:0}100%{opacity:0}}',
    '</style>',
    '<rect width="1500" height="720" fill="' + page + '"/>',
    '<g clip-path="url(#cardClip)">',
    '<rect x="18" y="22" width="1464" height="670" rx="46" fill="url(#card)"/>',
    '<circle cx="1160" cy="145" r="260" fill="url(#nebulaA)"/><circle cx="210" cy="470" r="310" fill="url(#nebulaB)"/>',
    stars(W, H),
    '<g transform="translate(78 86)"><rect width="106" height="106" rx="28" fill="' + panel + '" opacity="0.58" stroke="#fff" stroke-opacity="0.12"/><circle cx="53" cy="53" r="28" fill="' + accent + '" opacity="0.18" filter="url(#softGlow)"/><path d="M64 28C55 31 48 40 48 51C48 62 55 71 64 74C61 76 57 77 53 77C40 77 29 66 29 53C29 40 40 29 53 29C57 29 61 30 64 28Z" fill="' + accent + '" filter="url(#softGlow)"/></g>',
    '<text x="214" y="124" class="total">' + total + '</text><text x="315" y="122" class="subtitle">contribuicoes no ano</text>',
    '<g transform="translate(214 146)"><rect width="500" height="42" rx="10" fill="' + accent + '" opacity="0.12" stroke="' + accent + '" stroke-opacity="0.45"/><path d="M29 10L16 25H28L23 36L39 18H27L29 10Z" fill="' + accent + '" filter="url(#softGlow)"/><text x="55" y="29" class="badge">NAVE LUMIA ATIVA...</text></g>',
    '<g transform="translate(1190 120)"><rect width="250" height="72" rx="22" fill="' + panel + '" opacity="0.64" stroke="#fff" stroke-opacity="0.13"/><path d="M50 24C43 25 37 30 34 38L29 43L27 51L35 48L40 43C48 40 53 34 54 27C55 24 53 23 50 24Z" stroke="' + text + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 45L26 55" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/><text x="78" y="46" class="btn">Lumia UFO</text></g>',
    months.join('\n'),
    '<text x="70" y="' + (gridY + step + 16) + '" class="day">Seg</text><text x="70" y="' + (gridY + 3 * step + 16) + '" class="day">Qua</text><text x="70" y="' + (gridY + 5 * step + 16) + '" class="day">Sex</text>',
    '<g clip-path="url(#gridClip)">',
    cells.join('\n'),
    '<g transform="translate(' + (gridX + 40) + ' ' + (gridY - 58) + ')"><g class="ufoMove"><g class="float">',
    '<ellipse cx="58" cy="35" rx="70" ry="20" fill="' + accent + '" opacity="0.12" filter="url(#softGlow)"/>',
    '<path d="M26 31C34 13 46 5 58 5C70 5 82 13 90 31Z" fill="' + accent2 + '" opacity="0.32"/>',
    '<path d="M34 30C40 18 48 12 58 12C68 12 76 18 82 30Z" fill="' + bg2 + '" opacity="0.88" stroke="' + accent + '" stroke-width="2"/>',
    '<ellipse cx="58" cy="35" rx="72" ry="17" fill="' + bg1 + '" stroke="' + accent + '" stroke-width="4" filter="url(#softGlow)"/>',
    '<ellipse cx="58" cy="35" rx="52" ry="9" fill="' + panel + '" opacity="0.72"/><ellipse cx="58" cy="38" rx="34" ry="5" fill="' + accent + '" opacity="0.18"/>',
    '<circle cx="24" cy="35" r="4" fill="' + accent + '" filter="url(#softGlow)"/><circle cx="42" cy="39" r="3.5" fill="' + text + '"/><circle cx="58" cy="41" r="4.5" fill="' + accent + '" filter="url(#softGlow)"/><circle cx="74" cy="39" r="3.5" fill="' + text + '"/><circle cx="92" cy="35" r="4" fill="' + accent + '" filter="url(#softGlow)"/>',
    '<path d="M10 35C23 48 93 48 106 35" stroke="' + accent + '" stroke-width="2" stroke-opacity="0.5" fill="none"/><polygon class="beam" points="36,48 80,48 135,272 -19,272" fill="url(#beam)" opacity="0.42"/>',
    '</g></g></g>',
    '</g>',
    '<line x1="72" y1="590" x2="1410" y2="590" stroke="#fff" stroke-opacity="0.06"/><text x="78" y="646" class="footer">Os dados flutuam na rede da Lumia.</text>',
    '<text x="1040" y="650" class="footer">Menos</text>', legend.join('\n'), '<text x="1305" y="650" class="footer">Mais</text>',
    '<g class="shooting" transform="translate(1210 495)"><line x1="0" y1="0" x2="150" y2="55" stroke="#fff" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round" filter="url(#softGlow)"/><circle cx="156" cy="57" r="5" fill="#fff" filter="url(#softGlow)"/></g>',
    '</g>',
    '<rect x="18" y="22" width="1464" height="670" rx="46" fill="none" stroke="' + border + '" stroke-width="2"/>',
    '</svg>',
  ].join('\n');
}

async function main() {
  const calendar = await fetchContributions();
  if (!fs.existsSync('dist')) fs.mkdirSync('dist');
  fs.writeFileSync('dist/github-contribution-grid-snake-dark.svg', makeSvg(calendar, 'dark').trim(), 'utf8');
  fs.writeFileSync('dist/github-contribution-grid-snake.svg', makeSvg(calendar, 'light').trim(), 'utf8');
  console.log('Lumia Commit Grid generated successfully.');
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
