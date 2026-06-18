const fs = require("fs");

const username = process.env.GITHUB_USERNAME || "Viniciusalvim1";
const token = process.env.GITHUB_TOKEN;

if (!token) {
throw new Error("GITHUB_TOKEN nao encontrado.");
}

const query = [
"query($login: String!) {",
"  user(login: $login) {",
"    contributionsCollection {",
"      contributionCalendar {",
"        totalContributions",
"        weeks {",
"          contributionDays {",
"            date",
"            contributionCount",
"          }",
"        }",
"      }",
"    }",
"  }",
"}",
].join("\n");

async function fetchContributions() {
const response = await fetch("https://api.github.com/graphql", {
method: "POST",
headers: {
Authorization: "Bearer " + token,
"Content-Type": "application/json",
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

function getLevel(count) {
if (count === 0) return 0;
if (count <= 1) return 1;
if (count <= 3) return 2;
if (count <= 6) return 3;
return 4;
}

function getMonthLabel(dateString) {
const date = new Date(dateString + "T00:00:00Z");
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
return months[date.getUTCMonth()];
}

function buildStars(count, width, height) {
const stars = [];

for (let i = 0; i < count; i++) {
const x = 30 + ((i * 137) % (width - 60));
const y = 30 + ((i * 83) % (height - 60));
const r = i % 7 === 0 ? 1.7 : i % 3 === 0 ? 1.2 : 0.8;
const opacity = 0.12 + ((i * 17) % 55) / 100;
const opacityText = opacity.toFixed(2);
const duration = 3 + (i % 6);
const delay = (i % 10) / 5;

```
stars.push(
  '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#F8FAFC" opacity="' + opacityText + '">' +
  '<animate attributeName="opacity" values="' + opacityText + ';0.9;' + opacityText + '" dur="' + duration + 's" begin="' + delay + 's" repeatCount="indefinite"/>' +
  '</circle>'
);
```

}

return stars.join("\n");
}

function generateSvg(calendar, mode) {
const weeks = calendar.weeks;
const total = calendar.totalContributions;

const width = 1500;
const height = 760;

const cardX = 18;
const cardY = 22;
const cardW = 1464;
const cardH = 700;
const radius = 48;

const gridX = 150;
const gridY = 315;
const cell = 22;
const gap = 8;
const pitch = cell + gap;

const gridW = weeks.length * pitch;
const gridH = 7 * pitch;

const theme = mode === "light"
? {
pageBg: "#EAF8FF",
cardBg: "#D9F2F4",
cardBg2: "#BFE7F0",
stroke: "#8ED8E0",
text: "#0A1630",
muted: "#426178",
levels: ["#D2E5EA", "#B9E9E0", "#7ADFD2", "#35CDBA", "#63F2C3"],
accent: "#0FBF9F",
accent2: "#1BA9E1",
panel: "#FFFFFF",
shadow: "#0FBF9F",
}
: {
pageBg: "#050A14",
cardBg: "#0A1828",
cardBg2: "#0C263A",
stroke: "#23455F",
text: "#F8FAFC",
muted: "#8EA1B7",
levels: ["#142131", "#113742", "#16605D", "#24A99B", "#63F2C3"],
accent: "#63F2C3",
accent2: "#7FDBFF",
panel: "#10263A",
shadow: "#63F2C3",
};

const monthPositions = [];
let lastMonth = "";

weeks.forEach(function (week, weekIndex) {
const firstDay = week.contributionDays[0];
const month = getMonthLabel(firstDay.date);

```
if (month !== lastMonth) {
  monthPositions.push({
    month: month,
    x: gridX + weekIndex * pitch,
  });

  lastMonth = month;
}
```

});

const monthsSvg = monthPositions
.map(function (item) {
return '<text x="' + item.x + '" y="' + (gridY - 26) + '" class="month">' + item.month + '</text>';
})
.join("\n");

const dayLabels = [
{ label: "Seg", row: 1 },
{ label: "Qua", row: 3 },
{ label: "Sex", row: 5 },
]
.map(function (item) {
return '<text x="' + (gridX - 78) + '" y="' + (gridY + item.row * pitch + 16) + '" class="day">' + item.label + '</text>';
})
.join("\n");

const cellsSvg = weeks
.map(function (week, weekIndex) {
return week.contributionDays
.map(function (day, dayIndex) {
const x = gridX + weekIndex * pitch;
const y = gridY + dayIndex * pitch;
const level = getLevel(day.contributionCount);
const color = theme.levels[level];
const delay = ((weekIndex + dayIndex) % 14) * 0.16;
const opacity = level === 0 ? 0.36 : 0.82;
const glow = level >= 3 ? ' filter="url(#cellGlow)"' : "";
const plural = day.contributionCount === 1 ? "" : "s";

```
      let pulse = "";

      if (level > 0) {
        pulse =
          '<animate attributeName="opacity" values="0.62;1;0.62" dur="' +
          (3.2 + level * 0.25) +
          's" begin="' +
          delay +
          's" repeatCount="indefinite"/>';
      }

      return [
        '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="6" fill="' + color + '" opacity="' + opacity + '" stroke="#FFFFFF" stroke-opacity="0.035"' + glow + '>',
        '<title>' + day.date + ': ' + day.contributionCount + ' contribution' + plural + '</title>',
        pulse,
        '</rect>',
      ].join("\n");
    })
    .join("\n");
})
.join("\n");
```

const legendX = cardX + cardW - 410;
const legendY = cardY + cardH - 64;

const legendSvg = theme.levels
.map(function (color, i) {
const legendGlow = i === 4 ? ' filter="url(#cellGlow)"' : "";
const legendOpacity = i === 0 ? 0.45 : 0.95;

```
  return (
    '<rect x="' +
    (legendX + 86 + i * 36) +
    '" y="' +
    (legendY - 19) +
    '" width="25" height="25" rx="6" fill="' +
    color +
    '" opacity="' +
    legendOpacity +
    '"' +
    legendGlow +
    '/>'
  );
})
.join("\n");
```

const starsSvg = buildStars(82, width, height);
const ufoDistance = Math.min(gridW - 170, 1120);

const svg = [
'<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" fill="none" xmlns="http://www.w3.org/2000/svg">',
'<defs>',

```
'<linearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">',
'<stop offset="0%" stop-color="' + theme.cardBg + '"/>',
'<stop offset="58%" stop-color="' + theme.cardBg2 + '"/>',
'<stop offset="100%" stop-color="' + theme.cardBg + '"/>',
'</linearGradient>',

'<radialGradient id="nebulaA" cx="50%" cy="50%" r="50%">',
'<stop offset="0%" stop-color="' + theme.accent + '" stop-opacity="0.20"/>',
'<stop offset="52%" stop-color="' + theme.accent + '" stop-opacity="0.055"/>',
'<stop offset="100%" stop-color="' + theme.accent + '" stop-opacity="0"/>',
'</radialGradient>',

'<radialGradient id="nebulaB" cx="50%" cy="50%" r="50%">',
'<stop offset="0%" stop-color="' + theme.accent2 + '" stop-opacity="0.16"/>',
'<stop offset="60%" stop-color="' + theme.accent2 + '" stop-opacity="0.05"/>',
'<stop offset="100%" stop-color="' + theme.accent2 + '" stop-opacity="0"/>',
'</radialGradient>',

'<linearGradient id="scannerGradient" x1="0" y1="0" x2="1" y2="0">',
'<stop offset="0%" stop-color="' + theme.accent + '" stop-opacity="0"/>',
'<stop offset="42%" stop-color="' + theme.accent + '" stop-opacity="0"/>',
'<stop offset="50%" stop-color="' + theme.accent + '" stop-opacity="0.42"/>',
'<stop offset="58%" stop-color="' + theme.accent + '" stop-opacity="0"/>',
'<stop offset="100%" stop-color="' + theme.accent + '" stop-opacity="0"/>',
'</linearGradient>',

'<linearGradient id="beamGradient" x1="0" y1="0" x2="0" y2="1">',
'<stop offset="0%" stop-color="' + theme.accent + '" stop-opacity="0.48"/>',
'<stop offset="50%" stop-color="' + theme.accent + '" stop-opacity="0.18"/>',
'<stop offset="100%" stop-color="' + theme.accent + '" stop-opacity="0"/>',
'</linearGradient>',

'<filter id="cellGlow">',
'<feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="' + theme.shadow + '" flood-opacity="0.75"/>',
'</filter>',

'<filter id="softGlow">',
'<feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="' + theme.shadow + '" flood-opacity="0.45"/>',
'</filter>',

'<filter id="strongGlow">',
'<feDropShadow dx="0" dy="0" stdDeviation="18" flood-color="' + theme.shadow + '" flood-opacity="0.8"/>',
'</filter>',

'<clipPath id="cardClip">',
'<rect x="' + cardX + '" y="' + cardY + '" width="' + cardW + '" height="' + cardH + '" rx="' + radius + '"/>',
'</clipPath>',

'<clipPath id="gridClip">',
'<rect x="' + (gridX - 10) + '" y="' + (gridY - 18) + '" width="' + (gridW + 20) + '" height="' + (gridH + 40) + '" rx="24"/>',
'</clipPath>',

'</defs>',

'<style>',
'.subtitle { font: 700 28px Inter, Arial, sans-serif; fill: ' + theme.muted + '; }',
'.badgeText { font: 800 22px Inter, Arial, sans-serif; fill: ' + theme.accent + '; letter-spacing: 2px; }',
'.buttonText { font: 800 27px Inter, Arial, sans-serif; fill: ' + theme.text + '; }',
'.month { font: 700 21px Inter, Arial, sans-serif; fill: ' + theme.muted + '; }',
'.day { font: 700 22px Inter, Arial, sans-serif; fill: ' + theme.muted + '; }',
'.footer { font: 700 24px Inter, Arial, sans-serif; fill: ' + theme.muted + '; }',
'.totalNumber { font: 900 48px Inter, Arial, sans-serif; fill: ' + theme.text + '; letter-spacing: -1px; }',
'.ufo { animation: ufoMove 8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }',
'.ufoFloat { animation: float 3.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }',
'.scanner { animation: scan 7.5s linear infinite; }',
'.beamPulse { animation: beamPulse 3s ease-in-out infinite; transform-origin: top center; }',
'.shooting { animation: shooting 7.4s ease-in-out infinite; transform-origin: center; }',
'@keyframes scan { from { transform: translateX(-360px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } to { transform: translateX(' + (gridW + 360) + 'px); opacity: 0; } }',
'@keyframes ufoMove { 0% { transform: translateX(0px); } 45% { transform: translateX(' + ufoDistance + 'px); } 50% { transform: translateX(' + ufoDistance + 'px); } 95% { transform: translateX(0px); } 100% { transform: translateX(0px); } }',
'@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-9px); } }',
'@keyframes beamPulse { 0%, 100% { opacity: 0.28; } 50% { opacity: 0.56; } }',
'@keyframes shooting { 0% { transform: translate(-120px, -20px); opacity: 0; } 8% { opacity: 1; } 48% { opacity: 0.95; } 60% { opacity: 0; transform: translate(230px, 80px); } 100% { opacity: 0; transform: translate(230px, 80px); } }',
'</style>',

'<rect width="' + width + '" height="' + height + '" fill="' + theme.pageBg + '"/>',

'<g clip-path="url(#cardClip)">',
'<rect x="' + cardX + '" y="' + cardY + '" width="' + cardW + '" height="' + cardH + '" rx="' + radius + '" fill="url(#cardGradient)"/>',

'<circle cx="1170" cy="145" r="250" fill="url(#nebulaA)"/>',
'<circle cx="210" cy="465" r="310" fill="url(#nebulaB)"/>',

starsSvg,

'<path d="M84 560 C250 505, 390 590, 555 525 C760 445, 1005 495, 1360 545" stroke="' + theme.accent + '" stroke-opacity="0.075" stroke-width="3"/>',
'<path d="M92 220 C260 165, 460 235, 650 180 C815 132, 1010 155, 1375 248" stroke="' + theme.accent2 + '" stroke-opacity="0.085" stroke-width="3"/>',

'<g transform="translate(78 86)">',
'<rect x="0" y="0" width="106" height="106" rx="28" fill="' + theme.panel + '" opacity="0.58" stroke="#FFFFFF" stroke-opacity="0.12"/>',
'<circle cx="53" cy="53" r="28" fill="' + theme.accent + '" opacity="0.18" filter="url(#softGlow)"/>',
'<path d="M64 28C55 31 48 40 48 51C48 62 55 71 64 74C61 76 57 77 53 77C40 77 29 66 29 53C29 40 40 29 53 29C57 29 61 30 64 28Z" fill="' + theme.accent + '" filter="url(#softGlow)"/>',
'</g>',

'<text x="214" y="124" class="totalNumber">' + total + '</text>',
'<text x="315" y="122" class="subtitle">contribuicoes no ano</text>',

'<g transform="translate(214 146)">',
'<rect x="0" y="0" width="500" height="42" rx="10" fill="' + theme.accent + '" opacity="0.12" stroke="' + theme.accent + '" stroke-opacity="0.45"/>',
'<path d="M29 10L16 25H28L23 36L39 18H27L29 10Z" fill="' + theme.accent + '" filter="url(#softGlow)"/>',
'<text x="55" y="29" class="badgeText">SCANNER LUMIA ATIVO...</text>',
'</g>',

'<g transform="translate(' + (cardX + cardW - 310) + ' 120)">',
'<rect x="0" y="0" width="250" height="72" rx="22" fill="' + theme.panel + '" opacity="0.64" stroke="#FFFFFF" stroke-opacity="0.13"/>',
'<path d="M50 24C43 25 37 30 34 38L29 43L27 51L35 48L40 43C48 40 53 34 54 27C55 24 53 23 50 24Z" stroke="' + theme.text + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
'<path d="M36 45L26 55" stroke="' + theme.accent + '" stroke-width="4" stroke-linecap="round"/>',
'<text x="78" y="46" class="buttonText">Lumia UFO</text>',
'</g>',

monthsSvg,
dayLabels,

'<g clip-path="url(#gridClip)">',
cellsSvg,

'<rect class="scanner" x="' + (gridX - 210) + '" y="' + (gridY - 30) + '" width="220" height="' + (gridH + 60) + '" fill="url(#scannerGradient)" opacity="0.9"/>',

'<g class="ufo" transform="translate(' + (gridX + 40) + ' ' + (gridY - 48) + ')">',
'<g class="ufoFloat">',
'<ellipse cx="50" cy="21" rx="46" ry="15" fill="' + theme.accent + '" opacity="0.28" filter="url(#strongGlow)"/>',
'<path d="M20 22Q50 -8 80 22" fill="' + theme.accent + '" opacity="0.90"/>',
'<ellipse cx="50" cy="24" rx="54" ry="13" fill="' + theme.cardBg + '" stroke="' + theme.accent + '" stroke-width="4" filter="url(#softGlow)"/>',
'<circle cx="28" cy="24" r="3.5" fill="' + theme.text + '"><animate attributeName="opacity" values="0.45;1;0.45" dur="1.3s" repeatCount="indefinite"/></circle>',
'<circle cx="50" cy="27" r="3.5" fill="' + theme.text + '"><animate attributeName="opacity" values="1;0.45;1" dur="1.5s" repeatCount="indefinite"/></circle>',
'<circle cx="72" cy="24" r="3.5" fill="' + theme.text + '"><animate attributeName="opacity" values="0.45;1;0.45" dur="1.2s" repeatCount="indefinite"/></circle>',
'<polygon class="beamPulse" points="29,35 71,35 122,250 -22,250" fill="url(#beamGradient)" opacity="0.35"/>',
'</g>',
'</g>',
'</g>',

'<line x1="72" y1="' + (cardY + cardH - 120) + '" x2="' + (cardX + cardW - 72) + '" y2="' + (cardY + cardH - 120) + '" stroke="#FFFFFF" stroke-opacity="0.06"/>',

'<text x="78" y="' + (cardY + cardH - 64) + '" class="footer">Os dados flutuam na rede da Lumia.</text>',

'<text x="' + legendX + '" y="' + legendY + '" class="footer">Menos</text>',
legendSvg,
'<text x="' + (legendX + 285) + '" y="' + legendY + '" class="footer">Mais</text>',

'<g class="shooting" transform="translate(1210 495)">',
'<line x1="0" y1="0" x2="150" y2="55" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round" filter="url(#softGlow)"/>',
'<circle cx="156" cy="57" r="5" fill="#FFFFFF" filter="url(#strongGlow)"/>',
'</g>',

'</g>',

'<rect x="' + cardX + '" y="' + cardY + '" width="' + cardW + '" height="' + cardH + '" rx="' + radius + '" fill="none" stroke="' + theme.stroke + '" stroke-width="2"/>',
'</svg>',
```

].join("\n");

return svg;
}

async function main() {
const calendar = await fetchContributions();

if (!fs.existsSync("dist")) {
fs.mkdirSync("dist");
}

const darkSvg = generateSvg(calendar, "dark");
const lightSvg = generateSvg(calendar, "light");

fs.writeFileSync("dist/github-contribution-grid-snake-dark.svg", darkSvg.trim(), "utf8");
fs.writeFileSync("dist/github-contribution-grid-snake.svg", lightSvg.trim(), "utf8");

console.log("Lumia Commit Grid generated successfully.");
}

main().catch(function (error) {
console.error(error);
process.exit(1);
});
