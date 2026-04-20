const COUNTRY_CONFIG = {
  US: { name: "United States", currency: "USD", inflation: 3.2, loanHint: "Mortgage focused", taxType: "Federal simplified", taxBrackets: [{ upto: 11600, rate: 0.1 }, { upto: 47150, rate: 0.12 }, { upto: 100525, rate: 0.22 }, { upto: Infinity, rate: 0.24 }] },
  UK: { name: "United Kingdom", currency: "GBP", inflation: 2.8, loanHint: "Mortgage + ISA focus", taxType: "HMRC simplified", taxBrackets: [{ upto: 12570, rate: 0 }, { upto: 50270, rate: 0.2 }, { upto: 125140, rate: 0.4 }, { upto: Infinity, rate: 0.45 }] },
  SG: { name: "Singapore", currency: "SGD", inflation: 2.5, loanHint: "CPF focused", taxType: "Progressive simplified", taxBrackets: [{ upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 }, { upto: 80000, rate: 0.07 }, { upto: Infinity, rate: 0.115 }] },
  IN: { name: "India", currency: "INR", inflation: 5.5, loanHint: "EMI heavy usage", taxType: "Slab simplified", taxBrackets: [{ upto: 300000, rate: 0 }, { upto: 700000, rate: 0.05 }, { upto: 1000000, rate: 0.1 }, { upto: 1200000, rate: 0.15 }, { upto: Infinity, rate: 0.2 }] },
};

const FX_TABLE = {
  USD: { USD: 1, INR: 83, GBP: 0.79, SGD: 1.35 },
  INR: { INR: 1, USD: 0.012, GBP: 0.0095, SGD: 0.016 },
  GBP: { GBP: 1, USD: 1.26, INR: 105, SGD: 1.7 },
  SGD: { SGD: 1, USD: 0.74, INR: 61, GBP: 0.59 },
};

const TOOL_GROUPS = { US: ["mortgage", "retirement", "tax", "compound"], UK: ["mortgage", "retirement", "tax", "sip"], SG: ["retirement", "homeLoan", "tax", "compound"], IN: ["emi", "sip", "tax", "retirement"] };

const TOOLS = {
  mortgage: { title: "Mortgage Calculator", fields: [["Principal", "p", 300000], ["Annual Interest %", "r", 6.5], ["Years", "t", 25]], calc: ({ p, r, t }) => { const n = t * 12; const rm = r / 1200; const emi = (p * rm * (1 + rm) ** n) / ((1 + rm) ** n - 1); return { monthly: emi, total: emi * n }; }, format: (out, cfg, code) => `[${code}] Monthly ${fmt(out.monthly, cfg.currency)} • Total ${fmt(out.total, cfg.currency)}` },
  retirement: { title: "Retirement Corpus Planner", fields: [["Monthly Contribution", "m", 700], ["Annual Return %", "r", 8], ["Years", "t", 20]], calc: ({ m, r, t }, cfg) => { const rm = r / 1200; const n = t * 12; const fv = m * ((((1 + rm) ** n) - 1) / rm) * (1 + rm); const real = fv / (1 + cfg.inflation / 100) ** t; return { fv, real }; }, format: (out, cfg) => `Future ${fmt(out.fv, cfg.currency)} • Inflation-adjusted ${fmt(out.real, cfg.currency)}` },
  tax: { title: "Income Tax Estimator", fields: [["Annual Income", "income", 90000]], calc: ({ income }, cfg) => { let rem = income; let prev = 0; let tax = 0; for (const b of cfg.taxBrackets) { const slab = Math.max(0, Math.min(rem, b.upto - prev)); tax += slab * b.rate; rem -= slab; prev = b.upto; if (rem <= 0) break; } return { tax, net: income - tax }; }, format: (out, cfg) => `Tax ${fmt(out.tax, cfg.currency)} • Net ${fmt(out.net, cfg.currency)}` },
  compound: { title: "Compound Interest", fields: [["Principal", "p", 10000], ["Rate %", "r", 9], ["Years", "t", 12]], calc: ({ p, r, t }) => { const amount = p * (1 + r / 100) ** t; return { amount, interest: amount - p }; }, format: (out, cfg) => `Final ${fmt(out.amount, cfg.currency)} • Interest ${fmt(out.interest, cfg.currency)}` },
  sip: { title: "SIP Growth", fields: [["Monthly Investment", "p", 500], ["Annual Return %", "r", 10], ["Years", "t", 15]], calc: ({ p, r, t }) => { const rm = r / 1200; const n = t * 12; const fv = p * ((((1 + rm) ** n) - 1) / rm) * (1 + rm); return { fv, invested: p * n }; }, format: (out, cfg) => `Value ${fmt(out.fv, cfg.currency)} • Invested ${fmt(out.invested, cfg.currency)}` },
  emi: { title: "EMI Calculator", fields: [["Loan Amount", "p", 1500000], ["Annual Interest %", "r", 8.8], ["Years", "t", 10]], calc: ({ p, r, t }) => { const rm = r / 1200; const n = t * 12; const emi = (p * rm * (1 + rm) ** n) / ((1 + rm) ** n - 1); return { emi, total: emi * n }; }, format: (out, cfg) => `EMI ${fmt(out.emi, cfg.currency)}/mo • Total ${fmt(out.total, cfg.currency)}` },
  homeLoan: { title: "Housing Loan Calculator", fields: [["Loan Amount", "p", 400000], ["Annual Interest %", "r", 3.2], ["Years", "t", 20]], calc: ({ p, r, t }) => TOOLS.emi.calc({ p, r, t }), format: (out, cfg) => `Installment ${fmt(out.emi, cfg.currency)}/mo • Total ${fmt(out.total, cfg.currency)}` },
};

const GLOSSARY = {
  US: [{ term: "401(k)", exp: "Employer retirement account with tax benefits.", ex: "Monthly payroll contribution compounds.", risk: "Low", rel: "Retirement" }, { term: "APR", exp: "Effective annual borrowing rate.", ex: "Lower APR usually lowers total mortgage cost.", risk: "Medium", rel: "Mortgage" }],
  UK: [{ term: "ISA", exp: "Tax-efficient savings/investing wrapper.", ex: "ISA returns can grow tax-advantaged.", risk: "Low", rel: "SIP" }, { term: "Stamp Duty", exp: "Property purchase tax in UK.", ex: "Budget this in home-buying cost.", risk: "Medium", rel: "Mortgage" }],
  SG: [{ term: "CPF", exp: "Mandatory savings for retirement and housing.", ex: "CPF balances can support home loans.", risk: "Low", rel: "Retirement" }, { term: "T-bill", exp: "Short-term government security.", ex: "Used for conservative cash management.", risk: "Low", rel: "Compound" }],
  IN: [{ term: "SIP", exp: "Systematic monthly mutual fund investment.", ex: "SIP reduces timing stress in volatile markets.", risk: "Medium", rel: "SIP" }, { term: "EMI", exp: "Fixed monthly loan repayment amount.", ex: "Long tenure lowers EMI but raises total interest.", risk: "High", rel: "EMI" }],
};

const TIPS = ["Track liabilities monthly to avoid hidden debt drift.", "A 1% fee cut can materially improve long-term corpus.", "Separate emergency cash from investment capital."];

let state = { country: localStorage.getItem("gw_country_v2") || "US", score: Number(localStorage.getItem("gw_score_v2") || 12), results: JSON.parse(localStorage.getItem("gw_results_v2") || "{}") };

function fmt(v, currency) { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(v); }
function convertCurrency(amount, from, to) { if (from === to) return amount; const direct = FX_TABLE[from]?.[to]; if (direct) return amount * direct; const usd = amount * (FX_TABLE[from]?.USD || 0); return usd * (FX_TABLE.USD?.[to] || 0); }

function renderNav() {
  const nav = document.getElementById("toolNav");
  nav.innerHTML = TOOL_GROUPS[state.country].map((id) => `<button class="btn ghost tool-link" data-scroll="tool-${id}">${TOOLS[id].title}</button>`).join("");
  nav.querySelectorAll(".tool-link").forEach((btn) => btn.onclick = () => document.getElementById(btn.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function buildField([label, key, def]) { return `<label>${label}<input type="number" name="${key}" step="any" value="${def}" /></label>`; }

function renderTools() {
  const dashboard = document.getElementById("dashboard");
  const cfg = COUNTRY_CONFIG[state.country];
  dashboard.innerHTML = TOOL_GROUPS[state.country].map((id) => {
    const t = TOOLS[id];
    return `<article class="tool-card glass" id="tool-${id}"><h3>${t.title}</h3><small>${cfg.name} • ${cfg.currency} • ${cfg.taxType} • ${cfg.loanHint}</small>${t.fields.map(buildField).join("")}<div class="tool-actions"><button class="btn calc-btn" data-id="${id}">Calculate</button><button class="btn ghost share-btn" data-id="${id}">Share</button></div><div id="res-${id}" class="result">Result appears here</div><div class="ad-slot">Ad zone: after result</div></article>`;
  }).join("");

  dashboard.querySelectorAll(".calc-btn").forEach((btn) => btn.onclick = () => runCalc(btn.dataset.id));
  dashboard.querySelectorAll(".share-btn").forEach((btn) => btn.onclick = () => shareResult(btn.dataset.id));
}

function runCalc(toolId) {
  const tool = TOOLS[toolId];
  const card = document.getElementById(`tool-${toolId}`);
  const cfg = COUNTRY_CONFIG[state.country];
  const inputs = {};
  card.querySelectorAll("input").forEach((i) => { inputs[i.name] = Number(i.value); });
  if (Object.values(inputs).some((v) => !Number.isFinite(v) || v < 0)) {
    document.getElementById(`res-${toolId}`).textContent = "Enter valid non-negative numbers.";
    return;
  }
  const out = tool.calc(inputs, cfg);
  let txt = tool.format(out, cfg, state.country);
  const netWorth = (inputs.assets || 10000) - (inputs.liabilities || 2000);
  const risk = Math.min(100, Math.max(0, (60 * 0.7) + (30 * 0.3) + (10 * 0.1)));
  const fxSample = convertCurrency(100, cfg.currency, "USD");
  txt += ` • NetWorthSample ${fmt(netWorth, cfg.currency)} • Risk ${risk.toFixed(1)} • 100 ${cfg.currency}≈${fmt(fxSample, "USD")}`;
  document.getElementById(`res-${toolId}`).textContent = txt;
  state.results[`${state.country}-${toolId}`] = txt;
  localStorage.setItem("gw_results_v2", JSON.stringify(state.results));
  state.score = Math.min(100, state.score + 4);
  localStorage.setItem("gw_score_v2", String(state.score));
  renderScore();
  drawGrowthChart(out);
}

async function shareResult(toolId) {
  const text = state.results[`${state.country}-${toolId}`] || "No result yet";
  try { await navigator.clipboard.writeText(text); alert("Result copied."); } catch { alert("Clipboard unavailable."); }
}

function renderGlossary() {
  const tabs = document.getElementById("glossaryTabs");
  tabs.innerHTML = Object.keys(COUNTRY_CONFIG).map((code) => `<button class="btn ghost tab ${code === state.country ? "active" : ""}" data-country="${code}">${code}</button>`).join("");
  tabs.querySelectorAll(".tab").forEach((t) => t.onclick = () => { state.country = t.dataset.country; applyCountry(); });
  document.getElementById("glossaryList").innerHTML = GLOSSARY[state.country].map((g) => `<article class="glossary-item"><h3>${g.term}</h3><p>${g.exp}</p><p><strong>Example:</strong> ${g.ex}</p><p><span class="badge ${g.risk.toLowerCase()}">Risk: ${g.risk}</span></p><p><strong>Related:</strong> ${g.rel}</p></article>`).join("");
}

function renderScore() { document.getElementById("financialScore").textContent = `${state.score} / 100`; }
function renderTrending() { document.getElementById("trendingTerms").innerHTML = GLOSSARY[state.country].map((g) => `<li>${g.term}</li>`).join(""); }

function drawPortfolioChart() {
  const c = document.getElementById("portfolioChart");
  const ctx = c.getContext("2d");
  const w = c.width = c.clientWidth * devicePixelRatio;
  const h = c.height = 200 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const bars = [{ l: "Eq", v: 60, color: "#42a5ff" }, { l: "Debt", v: 30, color: "#36d399" }, { l: "Cash", v: 10, color: "#f9c74f" }];
  bars.forEach((b, i) => {
    const x = 20 + i * 70;
    const bh = b.v * 1.3;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, 180 - bh, 46, bh);
    ctx.fillStyle = "#cde3ff";
    ctx.fillText(`${b.l} ${b.v}%`, x, 195);
  });
}

function drawGrowthChart(lastOut = { fv: 1000, total: 1000 }) {
  const base = Number(lastOut.fv || lastOut.total || 1000);
  const c = document.getElementById("growthChart");
  const ctx = c.getContext("2d");
  const w = c.width = c.clientWidth * devicePixelRatio;
  const h = c.height = 200 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const points = [0.45, 0.62, 0.79, 0.91, 1].map((m, i) => ({ x: 20 + i * 55, y: 185 - ((base * m) / base) * 140 }));
  ctx.strokeStyle = "#42a5ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  points.forEach((p) => { ctx.fillStyle = "#42a5ff"; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
}

function wireTopActions() {
  document.getElementById("countrySelector").addEventListener("change", (e) => { state.country = e.target.value; applyCountry(); });
  document.getElementById("eli12Btn").onclick = () => { alert("ELI12: Save regularly, diversify, and let compounding do the heavy lifting."); state.score = Math.min(100, state.score + 2); renderScore(); };
  document.getElementById("advancedBtn").onclick = () => { alert("Advanced: optimize real return = nominal return - inflation - costs."); state.score = Math.min(100, state.score + 2); renderScore(); };
}

function applyCountry() {
  localStorage.setItem("gw_country_v2", state.country);
  document.getElementById("countrySelector").value = state.country;
  renderNav();
  renderTools();
  renderGlossary();
  renderTrending();
  drawPortfolioChart();
}

function init() {
  document.getElementById("dailyTip").textContent = TIPS[new Date().getUTCDate() % TIPS.length];
  wireTopActions();
  renderScore();
  applyCountry();
  drawGrowthChart();
}

init();
