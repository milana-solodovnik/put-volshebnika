/**
 * Демо-режим для статической сборки (GitHub Pages).
 * Перехватывает все обращения к /api/* и отвечает локально:
 * игроки хранятся в localStorage этого браузера, тексты предсказаний —
 * заготовленные (те же fallback-тексты, что на сервере).
 * Включается переменной окружения VITE_DEMO_MODE=1 на сборке.
 * Реальный код игры при этом не меняется.
 */

type Player = {
  playerId: number;
  name: string;
  password?: string;
  avatar: string;
  compassion: number;
  courage: number;
  wisdom: number;
  ambition: number;
  principle: number;
  completedQuests: number[];
  archetypeEarned: string | null;
  previousArchetypes: string[];
};

const STORE_KEY = "wizard_demo_players";
const NEXT_ID_KEY = "wizard_demo_next_id";

function loadPlayers(): Record<string, Player> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePlayers(players: Record<string, Player>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(players));
}

function findPlayer(players: Record<string, Player>, id: number): Player | undefined {
  return Object.values(players).find((p) => p.playerId === id);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Те же заготовленные предсказания, что в apps/api-server/src/routes/archetype.ts
const fallbackPredictions: Record<string, string> = {
  "Наставник": `Ты прошёл путь, который редко кому удаётся пройти — путь гармонии и равновесия. Силы, что ты обрёл, служат не только тебе, но и тем, кто последует за тобой. Впереди — годы наставничества, и сотни юных волшебников назовут тебя своим учителем. Помни: истинная мудрость не в том, чтобы давать ответы, а в том, чтобы учить искать их самостоятельно. Твоё наследие переживёт века.`,
  "Мрак": `Твой путь озарён холодным светом звёзд, что горят в бездне. Сила, к которой ты стремился, теперь в твоих руках — но помни: тень, что ты призываешь, однажды может закрыть от тебя сам свет. Ты станешь великим, ибо ничто не остановит того, кто не знает жалости. Но в тишине ночей спрашивай себя: ради чего ты пожертвовал теплом человеческих связей?`,
  "Властитель": `Ты рождён вести за собой — не кнутом, но примером. Народы услышат твой голос, и сильные мира сего прислушаются к твоему слову. Твоя власть будет не бременем, но даром, что ты несёшь тем, кто нуждается в защите. Помни: истинный правитель служит своему народу, а не требует служения себе. История запишет твоё имя золотыми буквами.`,
  "Целитель": `Твои руки исцеляют, твоё слово утешает, твоё присутствие приносит покой. Мир полон ран — и ты нашёл своё предназначение в том, чтобы исцелять их. Не все битвы требуют меча: иногда достаточно протянуть руку помощи. Береги себя, ибо тот, кто лечит других, должен не забыть исцелить и собственную душу.`,
  "Борец за порядок": `Ты — щит порядка в мире хаоса, меч справедливости в эпоху беззакония. Твой путь не усыпан цветами: те, кто нарушает закон, не простят тебе принципиальности. Но именно такие, как ты, удерживают мир от падения в бездну. Помни: закон без милосердия — тирания, но милосердие без закона — анархия. Найди баланс.`,
  "Изгой": `Твой путь — путь одиночки. Мир отвернулся от тебя, но в этом твоя сила. Изгнание — не конец, а начало. В тишине и уединении ты обретёшь знания, недоступные другим. И когда придёт время — ты вернёшься. Не для мести. Для искупления.`,
  "Искатель пути": `Твой путь ещё не обрёл форму — и в этом твоя сила. Ты не связан узами предначертанной судьбы: каждый шаг ты выбираешь сам. Мир откроет перед тобой двери, о существовании которых ты и не подозреваешь. Не бойся менять направление: истинный путь находится в движении. Твоё величие — в свободе выбора.`,
};

async function handleApi(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const players = loadPlayers();
  const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];

  // GET /api/healthz
  if (path.endsWith("/api/healthz")) {
    return json({ status: "ok" });
  }

  // POST /api/auth/register
  if (path.endsWith("/api/auth/register") && method === "POST") {
    const { name, password } = body as { name?: string; password?: string };
    if (!name || !password) return json({ message: "Имя и пароль обязательны" }, 400);
    if (Object.values(players).some((p) => p.name === name)) {
      return json({ message: "Наверное вы что-то перепутали, этот студент уже сдал экзамен." }, 409);
    }
    const nextId = parseInt(localStorage.getItem(NEXT_ID_KEY) || "1", 10);
    localStorage.setItem(NEXT_ID_KEY, String(nextId + 1));
    const player: Player = {
      playerId: nextId,
      name,
      password,
      avatar: "cat",
      compassion: 0,
      courage: 0,
      wisdom: 0,
      ambition: 0,
      principle: 0,
      completedQuests: [],
      archetypeEarned: null,
      previousArchetypes: [],
    };
    players[nextId] = player;
    savePlayers(players);
    const { password: _pw, ...publicPlayer } = player;
    return json(publicPlayer);
  }

  // POST /api/auth/login
  if (path.endsWith("/api/auth/login") && method === "POST") {
    const { name, password } = body as { name?: string; password?: string };
    if (!name || !password) return json({ message: "Имя и пароль обязательны" }, 400);
    const player = Object.values(players).find((p) => p.name === name);
    if (!player) return json({ message: "Игрок не найден" }, 404);
    if (player.password !== password) return json({ message: "Неверный пароль" }, 401);
    const { password: _pw, ...publicPlayer } = player;
    return json(publicPlayer);
  }

  // /api/player/:id[...]
  const playerMatch = path.match(/\/api\/player\/(\d+)(\/(stats|avatar|reset))?$/);
  if (playerMatch) {
    const id = parseInt(playerMatch[1], 10);
    const player = findPlayer(players, id);
    if (!player) return json({ message: "Игрок не найден" }, 404);
    const action = playerMatch[3];

    if (!action && method === "GET") {
      const { password: _pw, ...publicPlayer } = player;
      return json(publicPlayer);
    }

    if (action === "stats" && method === "PUT") {
      const {
        compassionDelta = 0,
        courageDelta = 0,
        wisdomDelta = 0,
        ambitionDelta = 0,
        principleDelta = 0,
        questId = 0,
        archetypeEarned,
      } = body as Record<string, number | string | null | undefined>;
      player.compassion += Number(compassionDelta);
      player.courage += Number(courageDelta);
      player.wisdom += Number(wisdomDelta);
      player.ambition += Number(ambitionDelta);
      player.principle += Number(principleDelta);
      if (Number(questId) > 0 && !player.completedQuests.includes(Number(questId))) {
        player.completedQuests.push(Number(questId));
      }
      if (archetypeEarned !== undefined) {
        player.archetypeEarned = (archetypeEarned as string | null) ?? null;
      }
      players[id] = player;
      savePlayers(players);
      const { password: _pw, ...publicPlayer } = player;
      return json(publicPlayer);
    }

    if (action === "avatar" && method === "PUT") {
      player.avatar = (body as { avatar: string }).avatar;
      players[id] = player;
      savePlayers(players);
      const { password: _pw, ...publicPlayer } = player;
      return json(publicPlayer);
    }

    if (action === "reset" && method === "POST") {
      if (player.archetypeEarned && !player.previousArchetypes.includes(player.archetypeEarned)) {
        player.previousArchetypes.push(player.archetypeEarned);
      }
      player.compassion = 0;
      player.courage = 0;
      player.wisdom = 0;
      player.ambition = 0;
      player.principle = 0;
      player.completedQuests = [];
      player.archetypeEarned = null;
      players[id] = player;
      savePlayers(players);
      const { password: _pw, ...publicPlayer } = player;
      return json(publicPlayer);
    }
  }

  // POST /api/archetype-text
  if (path.endsWith("/api/archetype-text") && method === "POST") {
    const { archetype } = body as { archetype?: string };
    if (!archetype) return json({ message: "Архетип обязателен" }, 400);
    const text = fallbackPredictions[archetype] || fallbackPredictions["Искатель пути"];
    return json({ text, source: "demo" });
  }

  return json({ message: `Демо-режим: эндпоинт ${method} ${path} не поддержан` }, 404);
}

export function installDemoApi(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/")) {
      try {
        return await handleApi(url, init || {});
      } catch (err) {
        console.error("[demo-api]", err);
        return json({ message: "Внутренняя ошибка демо-режима" }, 500);
      }
    }
    return originalFetch(input, init);
  };

  const badge = document.createElement("div");
  badge.textContent = "ДЕМО · без сервера · данные хранятся в этом браузере";
  badge.style.cssText =
    "position:fixed;left:10px;bottom:10px;z-index:9999;font:11px/1.4 monospace;" +
    "color:#d8c9a3;background:rgba(20,16,10,.72);border:1px solid #5a4a2f;" +
    "border-radius:6px;padding:4px 8px;pointer-events:none;opacity:.85";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(badge));
  if (document.body) document.body.appendChild(badge);

  console.info("[demo-api] Демо-режим включён: /api/* обрабатываются локально");
}
