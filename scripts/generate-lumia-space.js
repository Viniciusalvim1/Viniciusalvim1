const fs = require("fs");

const username = process.env.GITHUB_USERNAME || "Viniciusalvim1";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error("GITHUB_TOKEN não encontrado.");
}

const query = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            color
          }
        }
      }
    }
  }
}
`;

async function fetchContributions() {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { login: username },
    }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data.user.contributionsCollection.contributionCalendar;
}

function hashDate(date) {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildStarPositions(days) {
  return days
    .filter((day) => day.contributionCount > 0)
    .slice(-160)
    .map((day, index) => {
      const h = hashDate(day.date + index);
      return {
        x: 40 + (h % 860),
        y: 75 + ((h >> 3) % 235),
        size: Math.min(2.6 + day.contributionCount * 0.45, 8),
        opacity: Math.min(0.35 + day.contributionCount * 0.12, 1),
        count: day.contributionCount,
        delay: (index % 12) * 0.28,
      };
    });
}

function buildLasers(stars) {
  return stars.slice(-14);
}

function generateSvg(calendar, mode = "dark") {
  const days = calendar.weeks.flatMap((week) => week.contributionDays);
  const stars = buildStarPositions(days);
  const lasers = buildLasers(stars);
  const total = calendar.totalContributions;

  const theme =
    mode === "light"
      ? {
          bg1: "#EAF8FF",
          bg2: "#D7F3F0",
          bg3: "#C6E8FF",
          panel: "#FFFFFF",
          panelOpacity: "0.65",
          title: "#0A1630",
          subtitle: "#33506B",
          accent: "#0FBF9F",
          accent2: "#1BA9E1",
          stroke: "#7FDACA",
          moon: "#FFFFFF",
          shipCore: "#0A1630",
        }
      : {
          bg1: "#050A14",
          bg2: "#0A1630",
          bg3: "#123B53",
          panel: "#0B1020",
          panelOpacity: "0.58",
          title: "#F8FAFC",
          subtitle: "#94A3B8",
          accent: "#63F2C3",
          accent2: "#7FDBFF",
          stroke: "#63F2C3",
          moon: "#F8FAFC",
          shipCore: "#0A1630",
        };

  const starsSvg = stars
    .map(
      (star, index) => `
      <circle
        cx="${star.x}"
        cy="${star.y}"
        r="${star.size}"
        fill="${star.count > 3 ? theme.accent2 : theme.accent}"
        opacity="${star.opacity}"
        filter="url(#starGlow)"
      >
        <animate
          attributeName="opacity"
          values="${star.opacity};1;${star.opacity}"
          dur="${2.4 + (index % 5)}s"
          begin="${star.delay}s"
          repeatCount="indefinite"
        />
      </circle>
    `
    )
    .join("\n");

  const lasersSvg = lasers
    .map(
      (star, index) => `
      <line
        x1="150"
        y1="215"
        x2="${star.x}"
        y2="${star.y}"
        stroke="${theme.accent}"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0"
        filter="url(#laserGlow)"
      >
        <animate
          attributeName="opacity"
          values="0;1;0"
          dur="1.15s"
          begin="${index * 0.55}s"
          repeatCount="indefinite"
        />
      </line>
    `
    )
    .join("\n");

  return `
<svg width="950" height="420" viewBox="0 0 950 420" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="${theme.bg3}"/>
      <stop offset="45%" stop-color="${theme.bg2}"/>
      <stop offset="100%" stop-color="${theme.bg1}"/>
    </radialGradient>

    <linearGradient id="accentGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.accent}"/>
      <stop offset="100%" stop-color="${theme.accent2}"/>
    </linearGradient>

    <filter id="starGlow">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="${theme.accent}" flood-opacity="0.9"/>
    </filter>

    <filter id="laserGlow">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${theme.accent}" flood-opacity="1"/>
    </filter>
  </defs>

  <style>
    .title {
      font: 700 28px Inter, Arial, sans-serif;
      fill: ${theme.title};
    }

    .subtitle {
      font: 500 15px Inter, Arial, sans-serif;
      fill: ${theme.subtitle};
    }

    .metric {
      font: 700 18px Inter, Arial, sans-serif;
      fill: ${theme.accent};
    }

    .panelText {
      font: 500 14px Inter, Arial, sans-serif;
      fill: ${theme.subtitle};
    }

    .ship {
      animation: floatShip 4s ease-in-out infinite;
      transform-origin: center;
    }

    .orbit {
      stroke-dasharray: 8 10;
      animation: orbitMove 12s linear infinite;
    }

    @keyframes floatShip {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    @keyframes orbitMove {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -220; }
    }
  </style>

  <rect width="950" height="420" rx="32" fill="url(#bgGlow)"/>

  <circle cx="820" cy="85" r="120" fill="${theme.accent}" opacity="0.05"/>
  <circle cx="150" cy="310" r="170" fill="${theme.accent2}" opacity="0.04"/>

  <path d="M35 330 C180 250, 250 380, 400 300 S700 260, 915 330" stroke="${theme.stroke}" stroke-opacity="0.12" stroke-width="2"/>
  <path d="M60 120 C200 70, 300 150, 440 90 S690 70, 880 130" stroke="${theme.accent2}" stroke-opacity="0.08" stroke-width="2"/>

  ${starsSvg}

  <g opacity="0.35">
    <ellipse class="orbit" cx="150" cy="215" rx="78" ry="38" stroke="${theme.accent}" stroke-width="1.5" fill="none"/>
    <ellipse class="orbit" cx="150" cy="215" rx="105" ry="52" stroke="${theme.accent2}" stroke-width="1" fill="none" opacity="0.55"/>
  </g>

  ${lasersSvg}

  <g class="ship">
    <circle cx="150" cy="215" r="42" fill="url(#accentGradient)" opacity="0.18" filter="url(#starGlow)"/>
    <path d="M121 215C131 181 168 168 196 189C174 189 157 204 157 225C157 237 163 248 173 255C148 259 126 244 121 215Z" fill="${theme.moon}"/>
    <path d="M155 189C183 193 202 214 207 240C188 228 167 230 148 246C145 223 145 204 155 189Z" fill="url(#accentGradient)" opacity="0.95"/>
    <circle cx="171" cy="212" r="5" fill="${theme.shipCore}"/>
    <path d="M110 235C92 245 85 259 83 273C97 263 113 257 132 255Z" fill="${theme.accent}" opacity="0.75"/>
  </g>

  <text x="44" y="54" class="title">Lumia Commit Galaxy</text>
  <text x="44" y="82" class="subtitle">A living map of commits, ideas and systems in motion</text>

  <g transform="translate(44 350)">
    <rect width="270" height="46" rx="16" fill="${theme.panel}" opacity="${theme.panelOpacity}" stroke="${theme.accent}" stroke-opacity="0.22"/>
    <text x="18" y="29" class="panelText">Total contributions</text>
    <text x="190" y="30" class="metric">${total}</text>
  </g>

  <g transform="translate(684 350)">
    <rect width="220" height="46" rx="16" fill="${theme.panel}" opacity="${theme.panelOpacity}" stroke="${theme.accent}" stroke-opacity="0.22"/>
    <text x="20" y="29" class="metric">🌙 Lumia style commits</text>
  </g>
</svg>
`;
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

  console.log("Lumia-style contribution SVGs generated successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
