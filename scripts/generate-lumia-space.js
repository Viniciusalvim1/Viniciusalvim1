const fs = require('fs');

const username = process.env.GITHUB_USERNAME || 'Viniciusalvim1';
const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error('GITHUB_TOKEN nao encontrado.');
}

const query = [
  'query($login: String!) {',
  '  user(login: $login) {',
  '    contributionsCollection {',
  '      contributionCalendar {',
  '        totalContributions',
  '        weeks {',
  '          contributionDays {',
  '            date',
  '            contributionCount',
  '          }',
  '        }',
  '      }',
  '    }',
  '  }',
  '}',
].join('\n');

async function fetchContributions() {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: { login: username },
    }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data.user.contributionsCollection.contributionCalendar;
}

function level(count) {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function monthName(dateString) {
  const date = new Date(dateString + 'T00:00:00Z');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[date.getUTCMonth()];
}

function stars(width, height) {
  const out = [];

  for (let i = 0; i < 70; i++) {
    const x = 24 + ((i * 139) % (width - 48));
    const y = 24 + ((i * 89) % (height - 48));
    const r = i % 8 === 0 ? 1.7 : i % 3 === 0 ? 1.2 : 0.8;
    const a = (0.12 + ((i * 17) % 50) / 100).toFixed(2);
    const d = 3 + (i % 5);

    out.push(
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ffffff" opacity="' + a + '">' +
        '<animate attributeName="opacity" values="' + a + ';0.85;' + a + '" dur="' + d + 's" repeatCount="indefinite"/>' +
      '</circle>'
    );
  }

  return out.join('\n');
}

function makeSvg(calendar, mode) {
  const weeks = calendar.weeks;
  const total = calendar.totalContributions;

  const width = 1500;
  const height = 720;

  const gridX = 145;
  const gridY = 310;
  const cell = 21;
  const gap = 8;
  const step = cell + gap;

  const gridW = weeks.length * step;
  const gridH = 7 * step;

  const dark = mode !== 'light';

  const colors = dark
    ? ['#132233', '#113742', '#16605D', '#24A99B', '#63F2C3']
    : ['#D7E8EF', '#B9E9E0', '#7ADFD2', '#35CDBA', '#0FBF9F'];

  const page = dark ? '#050A14' : '#EAF8FF';
  const bg1 = dark ? '#081827' : '#D9F2F4';
  const bg2 = dark ? '#0C2A40' : '#BFE7F0';
  const text = dark ? '#F8FAFC' : '#0A1630';
  const muted = dark ? '#8EA1B7' : '#426178';
  const accent = dark ? '#63F2C3' : '#0FBF9F';
  const accent2 = dark ? '#7FDBFF' : '#1BA9E1';
  const panel = dark ? '#10263A' : '#FFFFFF';
  const border = dark ? '#23455F' : '#8ED8E0';

  const months = [];
  let last = '';

  for (let w = 0; w < weeks.length; w++) {
    const m = monthName(weeks[w].contributionDays[0].date);

    if (m !== last) {
      months.push(
        '<text x="' + (gridX + w * step) + '" y="' + (gridY - 24) + '" class="month">' + m + '</text>'
      );
      last = m;
    }
  }

  const dayLabels = [
    '<text x="70" y="' + (gridY + 1 * step + 16) + '" class="day">Seg</text>',
    '<text x="70" y="' + (gridY + 3 * step + 16) + '" class="day">Qua</text>',
    '<text x="70" y="' + (gridY + 5 * step + 16) + '" class="day">Sex</text>',
  ].join('\n');

  const cells = [];

  for (let w = 0; w < weeks.length; w++) {
    for (let d = 0; d < weeks[w].contributionDays.length; d++) {
      const day = weeks[w].contributionDays[d];
      const lv = level(day.contributionCount);
      const x = gridX + w * step;
      const y = gridY + d * step;
      const glow = lv >= 3 ? ' filter="url(#cellGlow)"' : '';
      const opacity = lv === 0 ? '0.38' : '0.86';

      let animate = '';

      if (lv > 0) {
        animate =
          '<animate attributeName="opacity" values="0.62;1;0.62" dur="' +
          (3 + lv * 0.3) +
          's" begin="' +
          (((w + d) % 12) * 0.15) +
          's" repeatCount="indefinite"/>';
      }

      cells.push(
        '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="6" fill="' + colors[lv] + '" opacity="' + opacity + '" stroke="#ffffff" stroke-opacity="0.04"' + glow + '>' +
          '<title>' + day.date + ': ' + day.contributionCount + ' commits</title>' +
          animate +
        '</rect>'
      );
    }
  }

  const legend = [];

  for (let i = 0; i < colors.length; i++) {
    legend.push(
      '<rect x="' + (1110 + i * 34) + '" y="631" width="24" height="24" rx="6" fill="' + colors[i] + '" opacity="' + (i === 0 ? '0.45' : '0.95') + '"/>'
    );
  }

  return [
    '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">',
    '<defs>',
    '<linearGradient id="card" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="' + bg1 + '"/>',
    '<stop offset="55%" stop-color="' + bg2 + '"/>',
    '<stop offset="100%" stop-color="' + bg1 + '"/>',
    '</linearGradient>',

    '<radialGradient id="nebulaA">',
    '<stop offset="0%" stop-color="' + accent + '" stop-opacity="0.20"/>',
    '<stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>',
    '</radialGradient>',

    '<radialGradient id="nebulaB">',
    '<stop offset="0%" stop-color="' + accent2 + '" stop-opacity="0.16"/>',
    '<stop offset="100%" stop-color="' + accent2 + '" stop-opacity="0"/>',
    '</radialGradient>',

    '<linearGradient id="scan" x1="0" y1="0" x2="1" y2="0">',
    '<stop offset="0%" stop-color="' + accent + '" stop-opacity="0"/>',
    '<stop offset="50%" stop-color="' + accent + '" stop-opacity="0.44"/>',
    '<stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>',
    '</linearGradient>',

    '<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="' + accent + '" stop-opacity="0.42"/>',
    '<stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>',
    '</linearGradient>',

    '<filter id="cellGlow">',
    '<feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="' + accent + '" flood-opacity="0.7"/>',
    '</filter>',

    '<filter id="softGlow">',
    '<feDropShadow dx="0" dy="0" stdDeviation="13" flood-color="' + accent + '" flood-opacity="0.55"/>',
    '</filter>',

    '<clipPath id="cardClip">',
    '<rect x="18" y="22" width="1464" height="670" rx="46"/>',
    '</clipPath>',

    '<clipPath id="gridClip">',
    '<rect x="' + (gridX - 12) + '" y="' + (gridY - 62) + '" width="' + (gridW + 32) + '" height="' + (gridH + 95) + '" rx="24"/>',
    '</clipPath>',
    '</defs>',

    '<style>',
    '.total{font:900 48px Arial,sans-serif;fill:' + text + ';letter-spacing:-1px}',
    '.subtitle{font:700 28px Arial,sans-serif;fill:' + muted + '}',
    '.badge{font:800 22px Arial,sans-serif;fill:' + accent + ';letter-spacing:2px}',
    '.btn{font:800 27px Arial,sans-serif;fill:' + text + '}',
    '.month{font:700 21px Arial,sans-serif;fill:' + muted + '}',
    '.day{font:700 22px Arial,sans-serif;fill:' + muted + '}',
    '.footer{font:700 24px Arial,sans-serif;fill:' + muted + '}',
    '.scanner{animation:scanMove 7.5s linear infinite}',
    '.ufo{animation:ufoMove 8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}',
    '.float{animation:float 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}',
    '.beam{animation:beamPulse 3s ease-in-out infinite}',
    '.shooting{animation:shoot 7.4s ease-in-out infinite}',
    '@keyframes scanMove{from{transform:translateX(-360px);opacity:0}10%{opacity:1}90%{opacity:1}to{transform:translateX(' + (gridW + 360) + 'px);opacity:0}}',
    '@keyframes ufoMove{0%{transform:translateX(0)}45%{transform:translateX(' + Math.min(gridW - 170, 1120) + 'px)}50%{transform:translateX(' + Math.min(gridW - 170, 1120) + 'px)}95%{transform:translateX(0)}100%{transform:translateX(0)}}',
    '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}',
    '@keyframes beamPulse{0%,100%{opacity:.25}50%{opacity:.55}}',
    '@keyframes shoot{0%{transform:translate(-120px,-20px);opacity:0}8%{opacity:1}55%{opacity:.9}65%{transform:translate(240px,88px);opacity:0}100%{opacity:0}}',
    '</style>',

    '<rect width="1500" height="720" fill="' + page + '"/>',

    '<g clip-path="url(#cardClip)">',
    '<rect x="18" y="22" width="1464" height="670" rx="46" fill="url(#card)"/>',
    '<circle cx="1160" cy="145" r="260" fill="url(#nebulaA)"/>',
    '<circle cx="210" cy="470" r="310" fill="url(#nebulaB)"/>',

    stars(width, height),

    '<g transform="translate(78 86)">',
    '<rect width="106" height="106" rx="28" fill="' + panel + '" opacity="0.58" stroke="#fff" stroke-opacity="0.12"/>',
    '<circle cx="53" cy="53" r="28" fill="' + accent + '" opacity="0.18" filter="url(#softGlow)"/>',
    '<path d="M64 28C55 31 48 40 48 51C48 62 55 71 64 74C61 76 57 77 53 77C40 77 29 66 29 53C29 40 40 29 53 29C57 29 61 30 64 28Z" fill="' + accent + '" filter="url(#softGlow)"/>',
    '</g>',

    '<text x="214" y="124" class="total">' + total + '</text>',
    '<text x="315" y="122" class="subtitle">contribuicoes no ano</text>',

    '<g transform="translate(214 146)">',
    '<rect width="500" height="42" rx="10" fill="' + accent + '" opacity="0.12" stroke="' + accent + '" stroke-opacity="0.45"/>',
    '<path d="M29 10L16 25H28L23 36L39 18H27L29 10Z" fill="' + accent + '" filter="url(#softGlow)"/>',
    '<text x="55" y="29" class="badge">SCANNER LUMIA ATIVO...</text>',
    '</g>',

    '<g transform="translate(1190 120)">',
    '<rect width="250" height="72" rx="22" fill="' + panel + '" opacity="0.64" stroke="#fff" stroke-opacity="0.13"/>',
    '<path d="M50 24C43 25 37 30 34 38L29 43L27 51L35 48L40 43C48 40 53 34 54 27C55 24 53 23 50 24Z" stroke="' + text + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M36 45L26 55" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/>',
    '<text x="78" y="46" class="btn">Lumia UFO</text>',
    '</g>',

    months.join('\n'),
    dayLabels,

    '<g clip-path="url(#gridClip)">',
    cells.join('\n'),

    '<rect class="scanner" x="' + (gridX - 210) + '" y="' + (gridY - 30) + '" width="220" height="' + (gridH + 60) + '" fill="url(#scan)" opacity="0.9"/>',

    '<g class="ufo" transform="translate(' + (gridX + 40) + ' ' + (gridY - 48) + ')">',
    '<g class="float">',
    '<ellipse cx="50" cy="21" rx="46" ry="15" fill="' + accent + '" opacity="0.28" filter="url(#softGlow)"/>',
    '<path d="M20 22Q50 -8 80 22" fill="' + accent + '" opacity="0.9"/>',
    '<ellipse cx="50" cy="24" rx="54" ry="13" fill="' + bg1 + '" stroke="' + accent + '" stroke-width="4" filter="url(#softGlow)"/>',
    '<circle cx="28" cy="24" r="3.5" fill="' + text + '"/>',
    '<circle cx="50" cy="27" r="3.5" fill="' + text + '"/>',
    '<circle cx="72" cy="24" r="3.5" fill="' + text + '"/>',
    '<polygon class="beam" points="29,35 71,35 122,250 -22,250" fill="url(#beam)"/>',
    '</g>',
    '</g>',
    '</g>',

    '<line x1="72" y1="590" x2="1410" y2="590" stroke="#fff" stroke-opacity="0.06"/>',
    '<text x="78" y="646" class="footer">Os dados flutuam na rede da Lumia.</text>',

    '<text x="1040" y="650" class="footer">Menos</text>',
    legend.join('\n'),
    '<text x="1305" y="650" class="footer">Mais</text>',

    '<g class="shooting" transform="translate(1210 495)">',
    '<line x1="0" y1="0" x2="150" y2="55" stroke="#fff" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round" filter="url(#softGlow)"/>',
    '<circle cx="156" cy="57" r="5" fill="#fff" filter="url(#softGlow)"/>',
    '</g>',

    '</g>',

    '<rect x="18" y="22" width="1464" height="670" rx="46" fill="none" stroke="' + border + '" stroke-width="2"/>',
    '</svg>',
  ].join('\n');
}

async function main() {
  const calendar = await fetchContributions();

  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  fs.writeFileSync('dist/github-contribution-grid-snake-dark.svg', makeSvg(calendar, 'dark').trim(), 'utf8');
  fs.writeFileSync('dist/github-contribution-grid-snake.svg', makeSvg(calendar, 'light').trim(), 'utf8');

  console.log('Lumia Commit Grid generated successfully.');
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
