const tools = [
  {
    id: "compound",
    title: "Compound Interest Calculator",
    fields: [
      ["Principal", "p", 10000],
      ["Rate %", "r", 8],
      ["Years", "t", 10],
    ],
    calc: ({ p, r, t }) => p * (1 + r / 100) ** t,
    format: (v) => `$${v.toFixed(2)}`,
  },
  {
    id: "sip",
    title: "SIP Growth Calculator",
    fields: [
      ["Monthly Investment", "m", 300],
      ["Annual Return %", "r", 10],
      ["Years", "t", 15],
    ],
    calc: ({ m, r, t }) => {
      const monthly = r / 1200;
      const n = t * 12;
      return m * (((1 + monthly) ** n - 1) / monthly) * (1 + monthly);
    },
    format: (v) => `$${v.toFixed(2)}`,
  },
  {
    id: "networth",
    title: "Net Worth Calculator",
    fields: [
      ["Total Assets", "a", 50000],
      ["Total Liabilities", "l", 20000],
    ],
    calc: ({ a, l }) => a - l,
    format: (v) => `$${v.toFixed(2)}`,
  },
  {
    id: "emi",
    title: "EMI Calculator",
    fields: [
      ["Loan Amount", "p", 100000],
      ["Annual Interest %", "r", 9],
      ["Tenure (Years)", "t", 5],
    ],
    calc: ({ p, r, t }) => {
      const mRate = r / 1200;
      const n = t * 12;
      return (p * mRate * (1 + mRate) ** n) / ((1 + mRate) ** n - 1);
    },
    format: (v) => `$${v.toFixed(2)} / month`,
  },
  {
    id: "risk",
    title: "Portfolio Risk Score",
    fields: [
      ["Equity %", "e", 60],
      ["Debt %", "d", 30],
      ["Cash %", "c", 10],
    ],
    calc: ({ e, d, c }) => Math.max(0, Math.min(100, e * 1.1 + d * 0.4 + c * 0.1)),
    format: (v) => `${v.toFixed(0)} / 100`,
  },
  {
    id: "currency",
    title: "Currency Converter (USD base)",
    fields: [
      ["USD", "usd", 100],
      ["Target", "cur", "INR", ["INR", "GBP", "SGD"]],
    ],
    calc: ({ usd, cur }) => {
      const rates = { INR: 83, GBP: 0.79, SGD: 1.34 };
      return usd * rates[cur];
    },
    format: (v, inputs) => `${v.toFixed(2)} ${inputs.cur}`,
  },
];

const glossary = {
  USA: [
    {
      term: "Diversification",
      def: "Spreading money across different investments to reduce the impact of one loss.",
      example: "Holding stocks, bonds, and cash instead of only one stock.",
      risk: "Low",
      tool: "Portfolio Risk Score",
    },
    {
      term: "APR",
      def: "Annual Percentage Rate is the yearly cost of borrowing, including interest and certain fees.",
      example: "A loan with 12% APR generally costs more than 9% APR.",
      risk: "Medium",
      tool: "EMI Calculator",
    },
  ],
  UK: [
    {
      term: "ISA",
      def: "An Individual Savings Account is a tax-efficient UK savings and investment wrapper.",
      example: "Returns in a Stocks and Shares ISA are usually free from UK tax.",
      risk: "Medium",
      tool: "SIP Growth Calculator",
    },
    {
      term: "Base Rate",
      def: "The policy interest rate set by the central bank that influences lending and savings rates.",
      example: "Mortgage rates may rise when the base rate increases.",
      risk: "High",
      tool: "EMI Calculator",
    },
  ],
  Singapore: [
    {
      term: "CPF",
      def: "Central Provident Fund is Singapore’s compulsory savings system for retirement and key needs.",
      example: "Employees and employers contribute a share of monthly salary to CPF.",
      risk: "Low",
      tool: "Retirement Planner",
    },
    {
      term: "REIT",
      def: "A listed trust structure that owns or finances income-producing real estate.",
      example: "Investors buy REIT units to receive rental-income-linked distributions.",
      risk: "Medium",
      tool: "Portfolio Risk Score",
    },
  ],
  India: [
    {
      term: "Repo Rate",
      def: "The rate at which the central bank lends short-term funds to commercial banks.",
      example: "Lower repo rates can make loans cheaper over time.",
      risk: "High",
      tool: "EMI Calculator",
    },
    {
      term: "SIP",
      def: "Systematic Investment Plan is a way to invest a fixed amount regularly in mutual funds.",
      example: "Investing ₹5,000 every month in an equity mutual fund.",
      risk: "Medium",
      tool: "SIP Growth Calculator",
    },
  ],
};

const tips = [
  "Build a 3–6 month emergency fund before taking high-risk positions.",
  "Compare effective rates, not just teaser rates, before accepting any loan.",
  "Rebalance your portfolio periodically instead of chasing recent winners.",
];

const learningModes = {
  eli12:
    "Money grows with time if you keep adding and avoid putting everything in one basket. Risk means 'how much your money value can jump up/down'.",
  advanced:
    "Return compounding is exponential, while risk is path-dependent and volatility-weighted. Asset allocation and periodic rebalancing improve risk-adjusted outcomes.",
};

let score = Number(localStorage.getItem("gw_score") || 0);
const saved = JSON.parse(localStorage.getItem("gw_results") || "{}");

function updateScore(delta = 4) {
  score = Math.min(100, score + delta);
  localStorage.setItem("gw_score", String(score));
  document.getElementById("financialScore").textContent = `Score: ${score} / 100`;
}

function renderTools() {
  const grid = document.getElementById("toolGrid");
  grid.innerHTML = tools
    .map((tool) => {
      const fields = tool.fields
        .map(([label, key, val, opts]) => {
          if (opts) {
            return `<label>${label}<select name="${key}">${opts
              .map((opt) => `<option value="${opt}" ${opt === val ? "selected" : ""}>${opt}</option>`)
              .join("")}</select></label>`;
          }
          return `<label>${label}<input type="number" name="${key}" value="${val}" /></label>`;
        })
        .join("");
      return `
      <article class="card tool-card" data-id="${tool.id}">
        <h3>${tool.title}</h3>
        ${fields}
        <button class="btn calc-btn">Calculate</button>
        <div class="result" id="res-${tool.id}">${saved[tool.id] || "Result appears here"}</div>
      </article>`;
    })
    .join("");

  grid.querySelectorAll(".calc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".tool-card");
      const tool = tools.find((t) => t.id === card.dataset.id);
      const inputs = {};
      card.querySelectorAll("input,select").forEach((el) => {
        inputs[el.name] = el.tagName === "SELECT" ? el.value : Number(el.value);
      });
      const output = tool.format(tool.calc(inputs), inputs);
      document.getElementById(`res-${tool.id}`).textContent = output;
      saved[tool.id] = output;
      localStorage.setItem("gw_results", JSON.stringify(saved));
      updateScore();
    });
  });
}

function renderGlossary(country = "USA") {
  const tabWrap = document.getElementById("countryTabs");
  const list = document.getElementById("glossaryList");
  tabWrap.innerHTML = Object.keys(glossary)
    .map(
      (c) =>
        `<button class="btn ghost tab ${c === country ? "active" : ""}" data-country="${c}">${c}</button>`,
    )
    .join("");

  list.innerHTML = glossary[country]
    .map(
      (item) => `<article class="card glossary-item">
    <h3>${item.term}</h3>
    <p><strong>Definition:</strong> ${item.def}</p>
    <p><strong>Example:</strong> ${item.example}</p>
    <p><span class="badge ${item.risk.toLowerCase()}">Risk: ${item.risk}</span></p>
    <p><strong>Related tool:</strong> <a href="#tools">${item.tool}</a></p>
  </article>`,
    )
    .join("");

  tabWrap.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => renderGlossary(tab.dataset.country));
  });
}

function initOtherUI() {
  document.getElementById("themeToggle").onclick = () => document.body.classList.toggle("dark");

  document.getElementById("eli12Btn").onclick = () => {
    document.getElementById("learningContent").textContent = learningModes.eli12;
    updateScore(3);
  };
  document.getElementById("advancedBtn").onclick = () => {
    document.getElementById("learningContent").textContent = learningModes.advanced;
    updateScore(3);
  };

  document.querySelectorAll(".quiz").forEach((btn) => {
    btn.onclick = () => {
      const ok = btn.dataset.answer === "1";
      document.getElementById("quizResult").textContent = ok
        ? "✅ Correct: diversification reduces concentration risk."
        : "❌ Not quite. Diversification helps spread risk.";
      if (ok) updateScore(6);
    };
  });

  document.getElementById("saveResults").onclick = () => {
    localStorage.setItem("gw_results", JSON.stringify(saved));
    alert("Saved locally on this device.");
    updateScore(2);
  };

  document.getElementById("shareResults").onclick = async () => {
    const text = `My Global Wealth Hub summary: ${Object.entries(saved)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ")}`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Summary copied.");
      updateScore(2);
    } catch {
      alert("Clipboard unavailable in this browser.");
    }
  };

  document.getElementById("dailyTip").textContent = tips[new Date().getUTCDate() % tips.length];
  document.getElementById("trendingTerms").innerHTML = [
    "Inflation Hedge",
    "Debt-to-Income Ratio",
    "Credit Utilization",
    "Risk Premium",
  ]
    .map((x) => `<li>${x}</li>`)
    .join("");

  document.getElementById("learningContent").textContent = learningModes.eli12;
  document.getElementById("financialScore").textContent = `Score: ${score} / 100`;

  document.getElementById("globalSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".tool-card, .glossary-item").forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? "block" : "none";
    });
  });
}

renderTools();
renderGlossary();
initOtherUI();
