// ===================== ADDA01 — app.js =====================
// Vanilla JS, no build step. All data lives in localStorage on this device.

const STORE_CATS = "adda01_categories";
const STORE_TX = "adda01_transactions";
const STORE_SETTINGS = "adda01_settings";

const PASTELS = [
  { fill: "#F3E6C0", border: "#D9B65C" },
  { fill: "#F6C6DA", border: "#E886AC" },
  { fill: "#F6D2A8", border: "#DE9C4B" },
  { fill: "#D6D6DC", border: "#A6A6AE" },
  { fill: "#C9E4F3", border: "#5CA8D9" },
  { fill: "#D9F0D0", border: "#7CC26A" },
  { fill: "#E3D6F5", border: "#A97BDE" },
  { fill: "#F5C9C9", border: "#DE6B6B" },
];

const EMOJI_OPTIONS = ["💡","🛍️","🍔","🎮","🚗","🏠","💊","📚","☕","🐾","🎬","🧾","🎁","📱","🍺","💰","✈️","🏋️","🎵","👕","🐶","📶","🧴","🎓"];

const KEYWORD_MAP = {
  servicios: ["luz","agua","internet","factura","electricidad","celular","telefono","teléfono"],
  alimentacion: ["almuerzo","comida","restaurante","desayuno","cena","super","mercado","pizza","burger","hamburguesa","café","cafe"],
  compras: ["ropa","zapatos","compra","tienda","amazon"],
  entretenimiento: ["cine","netflix","spotify","juego","concierto","salida","bar","cerveza"],
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function defaultCategories() {
  return [
    { id: "servicios", emoji: "💡", name: "Servicios", fill: PASTELS[0].fill, border: PASTELS[0].border, budget: 80 },
    { id: "compras", emoji: "🛍️", name: "Compras", fill: PASTELS[1].fill, border: PASTELS[1].border, budget: 100 },
    { id: "alimentacion", emoji: "🍔", name: "Alimentación", fill: PASTELS[2].fill, border: PASTELS[2].border, budget: 180 },
    { id: "entretenimiento", emoji: "🎮", name: "Entretenimiento", fill: PASTELS[3].fill, border: PASTELS[3].border, budget: 50 },
  ];
}

let categories = loadCategories();
let transactions = loadTransactions();
let settings = loadSettings();

function loadCategories() {
  try {
    const raw = localStorage.getItem(STORE_CATS);
    if (!raw) { const d = defaultCategories(); localStorage.setItem(STORE_CATS, JSON.stringify(d)); return d; }
    return JSON.parse(raw);
  } catch (e) { return defaultCategories(); }
}
function saveCategories() { localStorage.setItem(STORE_CATS, JSON.stringify(categories)); }

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORE_TX);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveTransactions() { localStorage.setItem(STORE_TX, JSON.stringify(transactions)); }

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_SETTINGS);
    return raw ? JSON.parse(raw) : { name: "Mateo", theme: "auto" };
  } catch (e) { return { name: "Mateo", theme: "auto" }; }
}
function saveSettings() { localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings)); }

// ===================== formatting =====================
function fmtMoney(n, decimals = 0) {
  const val = Number(n) || 0;
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtDateShort(d) {
  return d.toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}
const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// ===================== date helpers =====================
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isInMonth(date, year, month) { return date.getFullYear() === year && date.getMonth() === month; }

function txDate(tx) { return new Date(tx.date); }

function monthTotal(year, month) {
  return transactions
    .filter((t) => isInMonth(txDate(t), year, month) && (t.type || "expense") === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
}

function categorySpentThisMonth() {
  const now = new Date();
  const map = {};
  transactions.forEach((t) => {
    if ((t.type || "expense") !== "expense") return;
    const d = txDate(t);
    if (isInMonth(d, now.getFullYear(), now.getMonth())) {
      map[t.categoryId] = (map[t.categoryId] || 0) + Number(t.amount);
    }
  });
  return map;
}

// ===================== quick-entry parser =====================
function parseQuickEntry(text) {
  const amountMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : null;
  const lowered = text.toLowerCase();

  let categoryId = null;
  for (const cat of categories) {
    if (lowered.includes(cat.name.toLowerCase())) { categoryId = cat.id; break; }
  }
  if (!categoryId) {
    for (const [id, words] of Object.entries(KEYWORD_MAP)) {
      if (categories.some((c) => c.id === id) && words.some((w) => lowered.includes(w))) {
        categoryId = id;
        break;
      }
    }
  }
  return { amount, categoryId };
}

// ===================== insights =====================
function buildInsights() {
  const spentMap = categorySpentThisMonth();
  const now = new Date();
  const items = [];

  categories.forEach((c) => {
    const spent = spentMap[c.id] || 0;
    if (c.budget > 0 && spent > 0) {
      const pct = Math.round((spent / c.budget) * 100);
      const gap = Math.abs(spent - c.budget);
      items.push({
        type: "category",
        ratio: spent / c.budget,
        over: spent > c.budget,
        html: spent > c.budget
          ? `⚠️ Superaste el presupuesto de <b>${c.name}</b> por <b>${fmtMoney(gap)}</b> (${pct}%)`
          : `✅ Vas bien en <b>${c.name}</b>: <b>${fmtMoney(gap)}</b> disponibles (${pct}%)`,
      });
    }
  });

  items.sort((a, b) => b.ratio - a.ratio);

  const dayOfMonth = now.getDate();
  if (dayOfMonth >= 5) {
    const totalSpentNow = Object.values(spentMap).reduce((s, v) => s + v, 0);
    const projected = Math.round((totalSpentNow / dayOfMonth) * daysInMonth(now));
    const totalBudget = categories.reduce((s, c) => s + Number(c.budget), 0);
    if (totalBudget > 0) {
      items.push({
        type: "projection",
        ratio: 0,
        over: projected > totalBudget,
        html: projected > totalBudget
          ? `📈 A este ritmo, cerrarás el mes con <b>${fmtMoney(projected)}</b> gastados en total.`
          : `📈 A este ritmo, cerrarás el mes gastando <b>${fmtMoney(projected)}</b>, dentro de tu presupuesto.`,
      });
    }
  }

  return items;
}

// ===================== rendering: HOME =====================
function renderHome() {
  const now = new Date();
  const spentMap = categorySpentThisMonth();
  const totalBudget = categories.reduce((s, c) => s + Number(c.budget), 0);
  const totalSpent = Object.values(spentMap).reduce((s, v) => s + v, 0);
  const remaining = totalBudget - totalSpent;
  const monthIncome = transactions
    .filter((t) => t.type === "income" && isInMonth(txDate(t), now.getFullYear(), now.getMonth()))
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = monthIncome - totalSpent;

  const insightEl = document.getElementById("home-insight");
  if (remaining < 0) {
    insightEl.textContent = `${fmtMoney(Math.abs(remaining))} sobre presupuesto este mes`;
    insightEl.className = "insight bad";
  } else {
    insightEl.textContent = "";
    insightEl.className = "insight";
  }

  document.getElementById("home-hero-amount").textContent = fmtMoney(Math.abs(balance));
  document.getElementById("home-hero-sub").textContent = "Ingresos \u2212 gastos este mes";
  const heroBadge = document.getElementById("home-hero-badge");
  heroBadge.textContent = balance >= 0 ? "+" : "\u2212";
  heroBadge.className = "hero-badge " + (balance >= 0 ? "green" : "red");

  document.getElementById("pill-spent").textContent = fmtMoney(totalSpent);
  document.getElementById("pill-budget").textContent = fmtMoney(monthIncome);

  // featured insight (most urgent category, not the projection)
  const featuredWrap = document.getElementById("home-featured-insight");
  const categoryInsights = buildInsights().filter((i) => i.type === "category");
  const best = categoryInsights.sort((a, b) => b.ratio - a.ratio)[0];
  if (best) {
    featuredWrap.classList.remove("hidden");
    featuredWrap.innerHTML = `<div class="insight-card-icon">${best.over ? "⚠️" : "✅"}</div><div class="insight-card-text">${best.html.replace(/^(⚠️|✅)\s*/, "")}</div><div class="insight-card-chevron">›</div>`;
    featuredWrap.onclick = () => switchTab("analisis");
  } else {
    featuredWrap.classList.add("hidden");
  }

  // budget bars
  const barsWrap = document.getElementById("home-bars");
  barsWrap.innerHTML = "";
  const maxSpent = Math.max(1, ...categories.map((c) => spentMap[c.id] || 0));
  categories.forEach((c) => {
    const spent = spentMap[c.id] || 0;
    const h = Math.max(60, Math.round((spent / maxSpent) * 150) || 60);
    const fillPct = c.budget > 0 ? Math.min(100, Math.round((spent / c.budget) * 100)) : 0;
    const pctLabel = c.budget > 0 ? `${Math.round((spent / c.budget) * 100)}%` : "sin tope";
    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <div class="track" style="height:${h}px; border-color:${c.border}80;">
        <div class="fill-el" style="height:${fillPct}%; background:${c.fill};"></div>
      </div>
      <div class="medallion" style="background:${c.fill};">${c.emoji}</div>
      <div class="bar-amount">${fmtMoney(spent)}</div>
      <div class="bar-pct">${pctLabel}</div>
    `;
    col.onclick = () => openCatSheet(c.id);
    barsWrap.appendChild(col);
  });

  // recent transactions
  renderHomeTransactions();
}

function renderHomeTransactions(filter = "") {
  const wrap = document.getElementById("home-transactions");
  const empty = document.getElementById("home-empty");
  const sorted = transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered = filter
    ? sorted.filter((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        const hay = `${t.note || ""} ${cat ? cat.name : ""}`.toLowerCase();
        return hay.includes(filter.toLowerCase());
      })
    : sorted.slice(0, 10);

  wrap.innerHTML = "";
  if (filtered.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  const now = new Date();
  let lastLabel = null;
  filtered.forEach((t) => {
    const d = new Date(t.date);
    let label;
    if (isSameDay(d, now)) label = "Hoy";
    else { const y = new Date(now); y.setDate(now.getDate() - 1); label = isSameDay(d, y) ? "Ayer" : fmtDateShort(d); }

    if (label !== lastLabel) {
      const dayEl = document.createElement("div");
      dayEl.className = "tx-day";
      dayEl.textContent = label;
      wrap.appendChild(dayEl);
      lastLabel = label;
    }

    const cat = categories.find((c) => c.id === t.categoryId);
    const isIncome = (t.type || "expense") === "income";
    const row = document.createElement("div");
    row.className = "tx-row";
    row.innerHTML = `
      <div class="tx-icon" style="background:${isIncome ? "#2FA84F33" : (cat ? cat.fill + "80" : "#E5E5EA")};">${isIncome ? "💰" : (cat ? cat.emoji : "❔")}</div>
      <div class="tx-body">
        <div class="tx-cat">${isIncome ? "Ingreso" : (cat ? cat.name : "Sin categoría")}</div>
        <div class="tx-desc">${t.note || (isIncome ? "Ingreso" : (cat ? cat.name : "Gasto"))}</div>
      </div>
      <div class="tx-amount" style="${isIncome ? "color:var(--green);" : ""}">${isIncome ? "+" : ""}${fmtMoney(t.amount, 2)}</div>
    `;
    row.onclick = () => {
      if (confirm("¿Eliminar esta transacción?")) {
        transactions = transactions.filter((x) => x.id !== t.id);
        saveTransactions();
        renderAll();
      }
    };
    wrap.appendChild(row);
  });
}

// ===================== rendering: ANÁLISIS =====================
let currentPeriod = "semana";

function renderAnalisis() {
  const now = new Date();
  const total = monthTotal(now.getFullYear(), now.getMonth());
  document.getElementById("an-total").textContent = fmtMoney(total);

  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevTotal = monthTotal(prevDate.getFullYear(), prevDate.getMonth());
  const pillEl = document.getElementById("an-change-pill");
  const vsLabel = document.getElementById("an-vs-label");
  if (prevTotal > 0) {
    const changePct = Math.round(((total - prevTotal) / prevTotal) * 100);
    pillEl.classList.remove("hidden");
    pillEl.className = "change-pill " + (changePct >= 0 ? "up" : "down");
    pillEl.textContent = `${changePct >= 0 ? "↑" : "↓"} ${Math.abs(changePct)}%`;
    vsLabel.textContent = `vs. ${fmtMoney(prevTotal)} el mes pasado`;
  } else {
    pillEl.classList.add("hidden");
    vsLabel.textContent = "Sin datos del mes pasado todavía";
  }

  renderChart();
  renderAnalisisCategories(total);
  renderAnalisisInsights();
}

function getPeriodData(period) {
  const now = new Date();
  if (period === "semana") {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const sum = transactions
        .filter((t) => isSameDay(new Date(t.date), d) && (t.type || "expense") === "expense")
        .reduce((s, t) => s + Number(t.amount), 0);
      out.push({ label: WEEKDAY_LETTERS[d.getDay()], value: sum });
    }
    return out;
  }
  if (period === "mes") {
    const weeks = Math.ceil(daysInMonth(now) / 7);
    const buckets = new Array(weeks).fill(0);
    transactions.forEach((t) => {
      if ((t.type || "expense") !== "expense") return;
      const d = new Date(t.date);
      if (isInMonth(d, now.getFullYear(), now.getMonth())) {
        buckets[Math.floor((d.getDate() - 1) / 7)] += Number(t.amount);
      }
    });
    return buckets.map((v, i) => ({ label: `S${i + 1}`, value: v }));
  }
  // año
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: MONTH_ABBR[d.getMonth()], value: monthTotal(d.getFullYear(), d.getMonth()) });
  }
  return out;
}

function renderChart() {
  const data = getPeriodData(currentPeriod);
  const svg = document.getElementById("an-chart");
  const labelsWrap = document.getElementById("an-chart-labels");
  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const n = data.length;
  const padX = 12, top = 12, bottom = 128;
  const stepX = n > 1 ? (320 - padX * 2) / (n - 1) : 0;

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = bottom - (d.value / max) * (bottom - top);
    return [x, y];
  });

  const linePath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${bottom} L${points[0][0]},${bottom} Z`;
  const dots = points.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" style="fill:var(--text);" />`).join("");

  svg.innerHTML = `
    <path d="${areaPath}" style="fill:var(--text); opacity:0.12; stroke:none;" />
    <path d="${linePath}" style="fill:none; stroke:var(--text); stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round;" />
    ${dots}
  `;

  labelsWrap.innerHTML = data.map((d) => `<span>${d.label}</span>`).join("");
}

function renderAnalisisCategories(totalSpentAllThisMonth) {
  const spentMap = categorySpentThisMonth();
  const wrap = document.getElementById("an-categories");
  wrap.innerHTML = "";
  const sorted = categories.slice().sort((a, b) => (spentMap[b.id] || 0) - (spentMap[a.id] || 0));
  sorted.forEach((c) => {
    const spent = spentMap[c.id] || 0;
    if (spent === 0) return;
    const share = totalSpentAllThisMonth > 0 ? Math.round((spent / totalSpentAllThisMonth) * 100) : 0;
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <div class="cat-medallion" style="background:${c.fill};">${c.emoji}</div>
      <div class="cat-body">
        <div class="cat-top"><div class="cat-name">${c.name}</div><div class="cat-amount">${fmtMoney(spent)}</div></div>
        <div class="cat-track"><div class="cat-fill" style="width:${share}%; background:${c.border};"></div></div>
        <div class="cat-share">${share}% del total</div>
      </div>
    `;
    wrap.appendChild(row);
  });
  if (wrap.innerHTML === "") {
    wrap.innerHTML = `<div class="empty-state">Aún no hay gastos este mes.</div>`;
  }
}

function renderAnalisisInsights() {
  const wrap = document.getElementById("an-insights");
  const insights = buildInsights();
  wrap.innerHTML = "";
  if (insights.length === 0) {
    wrap.innerHTML = `<div class="insight-card"><div class="insight-card-icon">💬</div><div class="insight-card-text">Sigue registrando gastos para ver insights personalizados aquí.</div></div>`;
    return;
  }
  insights.forEach((ins) => {
    const card = document.createElement("div");
    card.className = "insight-card";
    const icon = ins.html.match(/^(⚠️|✅|📈)/)[0];
    card.innerHTML = `<div class="insight-card-icon">${icon}</div><div class="insight-card-text">${ins.html.replace(/^(⚠️|✅|📈)\s*/, "")}</div>`;
    wrap.appendChild(card);
  });
}

// ===================== rendering: AJUSTES =====================
function renderAjustes() {
  document.getElementById("profile-name").textContent = settings.name || "Tú";
  document.getElementById("profile-avatar").textContent = (settings.name || "T").charAt(0).toUpperCase();

  const listWrap = document.getElementById("categories-list");
  listWrap.innerHTML = "";
  categories.forEach((c) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-icon" style="background:${c.border};">${c.emoji}</div>
      <div class="row-title">${c.name}</div>
      <div class="row-value">${fmtMoney(c.budget)}</div>
    `;
    row.onclick = () => openCatSheet(c.id);
    listWrap.appendChild(row);
  });

  // theme segmented
  const themes = ["auto", "light", "dark"];
  const idx = themes.indexOf(settings.theme || "auto");
  const seg = document.getElementById("theme-segmented");
  seg.querySelectorAll(".segmented-option").forEach((el, i) => el.classList.toggle("active", i === idx));
  seg.querySelector(".segmented-indicator").style.transform = `translateX(${idx * 100}%)`;
}

function applyTheme() {
  const mode = settings.theme || "auto";
  let effective = mode;
  if (mode === "auto") {
    effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", effective);
}

// ===================== render all =====================
function renderAll() {
  renderHome();
  renderAnalisis();
  renderAjustes();
}

// ===================== tabs =====================
function switchTab(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  document.querySelectorAll(".nav-tab").forEach((el) => el.classList.toggle("active", el.dataset.tab === name));
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// ===================== search =====================
document.getElementById("btn-search-toggle").addEventListener("click", () => {
  const bar = document.getElementById("search-bar");
  bar.classList.toggle("hidden");
  if (!bar.classList.contains("hidden")) document.getElementById("search-input").focus();
  else { document.getElementById("search-input").value = ""; renderHomeTransactions(); }
});
document.getElementById("search-input").addEventListener("input", (e) => renderHomeTransactions(e.target.value));

// ===================== period segmented (Análisis) =====================
document.querySelectorAll("#period-segmented .segmented-option").forEach((el, i) => {
  el.addEventListener("click", () => {
    document.querySelectorAll("#period-segmented .segmented-option").forEach((x) => x.classList.remove("active"));
    el.classList.add("active");
    document.querySelector("#period-segmented .segmented-indicator").style.transform = `translateX(${i * 100}%)`;
    currentPeriod = el.dataset.period;
    renderChart();
  });
});

// ===================== theme segmented (Ajustes) =====================
document.querySelectorAll("#theme-segmented .segmented-option").forEach((el, i) => {
  el.addEventListener("click", () => {
    settings.theme = el.dataset.theme;
    saveSettings();
    applyTheme();
    renderAjustes();
  });
});

// ===================== profile rename =====================
document.getElementById("profile-row").addEventListener("click", () => {
  const name = prompt("¿Cómo te llamas?", settings.name || "");
  if (name && name.trim()) {
    settings.name = name.trim();
    saveSettings();
    renderAjustes();
  }
});

// ===================== add transaction sheet =====================
let selectedTxCategoryId = null;
let selectedTxType = "expense";

function setTxTypeUI(type) {
  const seg = document.getElementById("tx-type-segmented");
  seg.querySelectorAll(".segmented-option").forEach((el) => el.classList.toggle("active", el.dataset.type === type));
  seg.querySelector(".segmented-indicator").style.transform = `translateX(${(type === "expense" ? 0 : 1) * 100}%)`;
  document.getElementById("tx-cat-section").classList.toggle("hidden", type === "income");
}

function openTxSheet() {
  document.getElementById("quick-entry").value = "";
  document.getElementById("quick-entry-hint").textContent = "";
  document.getElementById("tx-amount").value = "";
  document.getElementById("tx-note").value = "";
  document.getElementById("tx-date").value = new Date().toISOString().slice(0, 10);
  selectedTxType = "expense";
  setTxTypeUI("expense");
  selectedTxCategoryId = categories[0] ? categories[0].id : null;
  renderTxCatChips();
  document.getElementById("overlay-tx").classList.remove("hidden");
}
function closeTxSheet() { document.getElementById("overlay-tx").classList.add("hidden"); }

document.querySelectorAll("#tx-type-segmented .segmented-option").forEach((el) => {
  el.addEventListener("click", () => {
    selectedTxType = el.dataset.type;
    setTxTypeUI(selectedTxType);
  });
});

function renderTxCatChips() {
  const wrap = document.getElementById("tx-cat-chips");
  wrap.innerHTML = "";
  categories.forEach((c) => {
    const chip = document.createElement("div");
    chip.className = "cat-chip" + (c.id === selectedTxCategoryId ? " selected" : "");
    chip.innerHTML = `<span>${c.emoji}</span> ${c.name}`;
    chip.onclick = () => { selectedTxCategoryId = c.id; renderTxCatChips(); };
    wrap.appendChild(chip);
  });
}

document.getElementById("btn-add-tx").addEventListener("click", openTxSheet);
document.getElementById("close-tx-sheet").addEventListener("click", closeTxSheet);
document.getElementById("overlay-tx").addEventListener("click", (e) => { if (e.target.id === "overlay-tx") closeTxSheet(); });

document.getElementById("quick-entry").addEventListener("input", (e) => {
  const { amount, categoryId } = parseQuickEntry(e.target.value);
  const hint = document.getElementById("quick-entry-hint");
  if (amount) {
    document.getElementById("tx-amount").value = amount;
    const cat = categories.find((c) => c.id === categoryId);
    hint.textContent = cat ? `→ ${fmtMoney(amount, 2)} · ${cat.emoji} ${cat.name}` : `→ ${fmtMoney(amount, 2)} · elige una categoría`;
    if (categoryId) { selectedTxCategoryId = categoryId; renderTxCatChips(); }
  } else {
    hint.textContent = "";
  }
});

document.getElementById("save-tx").addEventListener("click", () => {
  const amount = parseFloat(document.getElementById("tx-amount").value);
  if (!amount || amount <= 0) return;
  if (selectedTxType === "expense" && !selectedTxCategoryId) return;

  const dateValue = document.getElementById("tx-date").value;
  // mediodía en vez de medianoche UTC, para que no se corra un día en zonas horarias como Ecuador
  const isoDate = dateValue ? new Date(dateValue + "T12:00:00").toISOString() : new Date().toISOString();

  transactions.push({
    id: uid(),
    categoryId: selectedTxType === "expense" ? selectedTxCategoryId : null,
    type: selectedTxType,
    amount,
    note: document.getElementById("tx-note").value.trim(),
    date: isoDate,
  });
  saveTransactions();
  closeTxSheet();
  renderAll();
});

// ===================== add/edit category sheet =====================
let editingCategoryId = null;
let selectedEmoji = "💰";

function renderEmojiGrid() {
  const wrap = document.getElementById("cat-emoji-grid");
  wrap.innerHTML = "";
  EMOJI_OPTIONS.forEach((e) => {
    const chip = document.createElement("div");
    chip.className = "emoji-chip" + (e === selectedEmoji ? " selected" : "");
    chip.textContent = e;
    chip.onclick = () => { selectedEmoji = e; renderEmojiGrid(); };
    wrap.appendChild(chip);
  });
}

function openCatSheet(catId) {
  editingCategoryId = catId || null;
  const cat = catId ? categories.find((c) => c.id === catId) : null;
  document.getElementById("cat-sheet-title").textContent = cat ? "Editar categoría" : "Nueva categoría";
  document.getElementById("cat-name").value = cat ? cat.name : "";
  document.getElementById("cat-budget").value = cat ? cat.budget : "";
  selectedEmoji = cat ? cat.emoji : "💰";
  renderEmojiGrid();
  document.getElementById("delete-cat").classList.toggle("hidden", !cat);
  document.getElementById("overlay-cat").classList.remove("hidden");
}
function closeCatSheet() { document.getElementById("overlay-cat").classList.add("hidden"); }

document.getElementById("btn-add-category").addEventListener("click", () => openCatSheet(null));
document.getElementById("close-cat-sheet").addEventListener("click", closeCatSheet);
document.getElementById("overlay-cat").addEventListener("click", (e) => { if (e.target.id === "overlay-cat") closeCatSheet(); });

document.getElementById("save-cat").addEventListener("click", () => {
  const name = document.getElementById("cat-name").value.trim();
  const budget = parseFloat(document.getElementById("cat-budget").value) || 0;
  if (!name) return;

  if (editingCategoryId) {
    const cat = categories.find((c) => c.id === editingCategoryId);
    cat.name = name; cat.emoji = selectedEmoji; cat.budget = budget;
  } else {
    const palette = PASTELS[categories.length % PASTELS.length];
    categories.push({ id: uid(), emoji: selectedEmoji, name, budget, fill: palette.fill, border: palette.border });
  }
  saveCategories();
  closeCatSheet();
  renderAll();
});

document.getElementById("delete-cat").addEventListener("click", () => {
  if (!editingCategoryId) return;
  if (!confirm("¿Eliminar esta categoría? Las transacciones ya registradas se conservan.")) return;
  categories = categories.filter((c) => c.id !== editingCategoryId);
  saveCategories();
  closeCatSheet();
  renderAll();
});

// ===================== export / clear data =====================
document.getElementById("btn-export").addEventListener("click", () => {
  const payload = { categories, transactions, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `adda01-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("btn-clear").addEventListener("click", () => {
  if (!confirm("Esto borrará todas tus categorías y transacciones de este dispositivo. ¿Continuar?")) return;
  localStorage.removeItem(STORE_CATS);
  localStorage.removeItem(STORE_TX);
  localStorage.removeItem(STORE_SETTINGS);
  categories = loadCategories();
  transactions = loadTransactions();
  settings = loadSettings();
  applyTheme();
  renderAll();
});

// ===================== init =====================
applyTheme();
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((settings.theme || "auto") === "auto") applyTheme();
  });
}
renderAll();

// ===================== service worker =====================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("No se pudo registrar el service worker:", err);
    });
  });
}
