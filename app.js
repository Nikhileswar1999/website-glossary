const countryRules = {
  USA: {
    retirementLabel: "401(k)",
    mortgageRate: 6.2,
    taxBrackets: [
      { max: 12000, rate: 0.1 },
      { max: 50000, rate: 0.22 },
      { max: Infinity, rate: 0.32 },
    ],
    capitalGains: { shortRate: 0.24, longRate: 0.15, thresholdMonths: 12 },
    hint: "USA profile: 401(k) focus + standard mortgage defaults.",
  },
  UK: {
    retirementLabel: "Pension",
    mortgageRate: 5.4,
    taxBrackets: [
      { max: 12570, rate: 0 },
      { max: 50270, rate: 0.2 },
      { max: 125140, rate: 0.4 },
      { max: Infinity, rate: 0.45 },
    ],
    capitalGains: { shortRate: 0.2, longRate: 0.1, thresholdMonths: 12 },
    hint: "UK profile: pension and ISA-oriented context with UK tax bands.",
  },
  India: {
    retirementLabel: "Retirement",
    mortgageRate: 8.9,
    taxBrackets: [
      { max: 300000, rate: 0 },
      { max: 700000, rate: 0.1 },
      { max: 1000000, rate: 0.15 },
      { max: Infinity, rate: 0.2 },
    ],
    capitalGains: { shortRate: 0.15, longRate: 0.1, thresholdMonths: 12 },
    hint: "India profile: EMI + SIP priority with simplified 80C-style planning context.",
  },
  Singapore: {
    retirementLabel: "CPF",
    mortgageRate: 3,
    taxBrackets: [
      { max: 20000, rate: 0 },
      { max: 40000, rate: 0.03 },
      { max: 80000, rate: 0.07 },
      { max: Infinity, rate: 0.11 },
    ],
    capitalGains: { shortRate: 0, longRate: 0, thresholdMonths: 12 },
    hint: "Singapore profile: CPF and housing loan centric assumptions.",
  },
};

const calculatorSections = {
  loanToolGrid: ["emi", "mortgage", "homeLoan"],
  retirementToolGrid: ["retirement"],
  taxToolGrid: ["incomeTax", "capitalGains"],
  investToolGrid: ["compound", "sip", "netWorth", "risk", "currency"],
};

const calculators = [
  {
    id: "compound",
    title: "Compound Interest Calculator",
    seo: "Compound Interest Calculator Global",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Project principal growth with annual compounding.",
    fields: [
      ["Principal", "p", 10000],
      ["Rate %", "r", 8],
      ["Years", "t", 10],
    ],
    faq: "What does compounding mean? You earn returns on prior returns over time.",
    calc: ({ p, r, t }) => {
      const finalAmount = p * (1 + r / 100) ** t;
      return {
        finalAmount,
        totalInterest: finalAmount - p,
      };
    },
    format: ({ finalAmount, totalInterest }) =>
      `Final: ${formatCurrency(finalAmount)} | Interest: ${formatCurrency(totalInterest)}`,
  },
  {
    id: "sip",
    title: "SIP Growth Calculator",
    seo: "SIP Growth Calculator India",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Estimate monthly investment growth with compounding.",
    fields: [
      ["Monthly Investment", "m", 300],
      ["Annual Return %", "r", 10],
      ["Years", "t", 15],
    ],
    faq: "SIP is systematic periodic investing; growth assumes a constant return rate.",
    calc: ({ m, r, t }) => {
      const monthlyRate = r / 1200;
      const months = t * 12;
      const finalValue = m * (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);
      const invested = m * months;
      return { finalValue, invested, profit: finalValue - invested };
    },
    format: ({ finalValue, invested, profit }) =>
      `Value: ${formatCurrency(finalValue)} | Invested: ${formatCurrency(invested)} | Profit: ${formatCurrency(profit)}`,
  },
  {
    id: "emi",
    title: "EMI Calculator",
    seo: "EMI Loan Calculator India",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Calculate monthly loan payment, total payment, and total interest.",
    fields: [
      ["Loan Amount", "p", 100000],
      ["Annual Interest %", "r", 9],
      ["Tenure (Years)", "t", 5],
    ],
    faq: "EMI keeps monthly repayments fixed over the selected tenure.",
    calc: ({ p, r, t }) => {
      const monthlyRate = r / 1200;
      const months = t * 12;
      const emi = (p * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
      const totalPayment = emi * months;
      return { emi, totalPayment, totalInterest: totalPayment - p };
    },
    format: ({ emi, totalPayment, totalInterest }) =>
      `EMI: ${formatCurrency(emi)} /mo | Total: ${formatCurrency(totalPayment)} | Interest: ${formatCurrency(totalInterest)}`,
  },
  {
    id: "mortgage",
    title: "Mortgage Calculator",
    seo: "Mortgage Calculator USA",
    countries: ["USA", "UK", "Singapore"],
    intro: "Country-aware mortgage projection with down payment and total interest.",
    fields: [
      ["Home Price", "price", 500000],
      ["Down Payment", "down", 100000],
      ["Interest %", "r", 6],
      ["Loan Term (Years)", "t", 30],
    ],
    faq: "Mortgage payment excludes property taxes, insurance, and maintenance costs.",
    calc: ({ price, down, r, t }, country) => {
      const effectiveRate = r || countryRules[country].mortgageRate;
      const principal = price - down;
      const monthlyRate = effectiveRate / 1200;
      const months = t * 12;
      const monthlyPayment =
        (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
      const totalPayment = monthlyPayment * months;
      return { monthlyPayment, totalInterest: totalPayment - principal, principal };
    },
    format: ({ monthlyPayment, totalInterest, principal }) =>
      `Loan: ${formatCurrency(principal)} | Monthly: ${formatCurrency(monthlyPayment)} | Interest: ${formatCurrency(totalInterest)}`,
  },
  {
    id: "homeLoan",
    title: "Home Loan Calculator",
    seo: "Home Loan Calculator Singapore",
    countries: ["India", "Singapore", "UK"],
    intro: "Simplified housing EMI with quick repayment insight.",
    fields: [
      ["Loan Amount", "p", 300000],
      ["Interest %", "r", 5],
      ["Tenure (Years)", "t", 20],
    ],
    faq: "Longer tenure lowers EMI but typically increases total interest paid.",
    calc: ({ p, r, t }) => {
      const monthlyRate = r / 1200;
      const months = t * 12;
      const emi = (p * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
      const totalPayment = emi * months;
      return { emi, totalPayment, totalInterest: totalPayment - p };
    },
    format: ({ emi, totalPayment, totalInterest }) =>
      `EMI: ${formatCurrency(emi)} /mo | Total: ${formatCurrency(totalPayment)} | Interest: ${formatCurrency(totalInterest)}`,
  },
  {
    id: "retirement",
    title: "Retirement Corpus Calculator",
    seo: "401k Retirement Calculator USA",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Estimate retirement corpus with inflation-adjusted purchasing power.",
    fields: [
      ["Monthly Contribution", "m", 500],
      ["Annual Return %", "r", 7],
      ["Years to Retirement", "y", 25],
      ["Inflation %", "i", 3],
    ],
    faq: "Real corpus = future corpus adjusted for inflation impact over time.",
    calc: ({ m, r, y, i }) => {
      const monthlyRate = r / 1200;
      const months = y * 12;
      const corpus = m * (((1 + monthlyRate) ** months - 1) / monthlyRate);
      const contributions = m * months;
      const inflationFactor = (1 + i / 100) ** y;
      return {
        corpus,
        contributions,
        growth: corpus - contributions,
        inflationAdjustedCorpus: corpus / inflationFactor,
      };
    },
    format: ({ corpus, contributions, growth, inflationAdjustedCorpus }, _, country) =>
      `${countryRules[country].retirementLabel} Corpus: ${formatCurrency(corpus)} | Contribution: ${formatCurrency(contributions)} | Growth: ${formatCurrency(growth)} | Real Value: ${formatCurrency(inflationAdjustedCorpus)}`,
  },
  {
    id: "incomeTax",
    title: "Income Tax Estimator",
    seo: "Income Tax Estimator USA UK India Singapore",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Simplified country tax bracket estimator with net income output.",
    fields: [["Annual Income", "income", 70000]],
    faq: "Tax model is approximate and excludes deductions, credits, and local surcharges.",
    calc: ({ income }, country) => {
      const brackets = countryRules[country].taxBrackets;
      let remaining = income;
      let prevMax = 0;
      let tax = 0;
      for (const bracket of brackets) {
        const taxableAtBand = Math.max(0, Math.min(remaining, bracket.max - prevMax));
        tax += taxableAtBand * bracket.rate;
        remaining -= taxableAtBand;
        prevMax = bracket.max;
        if (remaining <= 0) break;
      }
      return { tax, netIncome: income - tax };
    },
    format: ({ tax, netIncome }) => `Tax: ${formatCurrency(tax)} | Net Income: ${formatCurrency(netIncome)}`,
  },
  {
    id: "capitalGains",
    title: "Capital Gains Calculator",
    seo: "Capital Gains Calculator USA",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Estimate capital gains tax based on holding period and country profile.",
    fields: [
      ["Buy Price", "buy", 10000],
      ["Sell Price", "sell", 13000],
      ["Holding Period (Months)", "months", 8],
    ],
    faq: "Long-term holdings usually get lower tax rates than short-term holdings.",
    calc: ({ buy, sell, months }, country) => {
      const gain = sell - buy;
      const rules = countryRules[country].capitalGains;
      const rate = months >= rules.thresholdMonths ? rules.longRate : rules.shortRate;
      const tax = Math.max(0, gain * rate);
      return { gain, tax, postTaxGain: gain - tax, rate };
    },
    format: ({ gain, tax, postTaxGain, rate }) =>
      `Gain: ${formatCurrency(gain)} | Tax (${(rate * 100).toFixed(1)}%): ${formatCurrency(tax)} | After Tax: ${formatCurrency(postTaxGain)}`,
  },
  {
    id: "netWorth",
    title: "Net Worth Calculator",
    seo: "Net Worth Calculator",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Track your financial health by subtracting liabilities from assets.",
    fields: [
      ["Total Assets", "a", 50000],
      ["Total Liabilities", "l", 20000],
    ],
    faq: "Positive and growing net worth indicates improving financial stability.",
    calc: ({ a, l }) => ({ netWorth: a - l }),
    format: ({ netWorth }) => `Net Worth: ${formatCurrency(netWorth)}`,
  },
  {
    id: "risk",
    title: "Portfolio Risk Score",
    seo: "Portfolio Risk Score Calculator",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Weighted risk score from equity, debt, and cash allocation.",
    fields: [
      ["Equity %", "e", 60],
      ["Debt %", "d", 30],
      ["Cash %", "c", 10],
    ],
    faq: "Higher equity concentration usually means higher short-term volatility.",
    calc: ({ e, d, c }) => {
      const score = Math.max(0, Math.min(100, e * 1.2 + d * 0.6 + c * 0.2));
      const label = score <= 40 ? "Low" : score <= 70 ? "Medium" : "High";
      return { score, label };
    },
    format: ({ score, label }) => `Risk Score: ${score.toFixed(0)} / 100 (${label})`,
  },
  {
    id: "currency",
    title: "Currency Converter",
    seo: "Currency Converter USD INR GBP SGD",
    countries: ["USA", "UK", "India", "Singapore"],
    intro: "Static-rate converter for quick comparisons (educational use only).",
    fields: [
      ["Amount", "amount", 100],
      ["From", "from", "USD", ["USD", "INR", "GBP", "SGD"]],
      ["To", "to", "INR", ["USD", "INR", "GBP", "SGD"]],
    ],
    faq: "Rates are fixed demo values and do not reflect live FX markets.",
    calc: ({ amount, from, to }) => {
      const perUsd = { USD: 1, INR: 83, GBP: 0.79, SGD: 1.34 };
      const inUsd = amount / perUsd[from];
      return { converted: inUsd * perUsd[to], to };
    },
    format: ({ converted, to }) => `Converted Value: ${converted.toFixed(2)} ${to}`,
  },
];

const glossary = {
  USA: [
    {
      term: "401(k)",
      def: "A tax-advantaged retirement savings plan offered by many employers in the United States.",
      example: "Employee and employer can both contribute to long-term retirement corpus.",
      risk: "Low",
      tool: "Retirement Corpus Calculator",
    },
    {
      term: "APR",
      def: "Annual percentage rate showing borrowing cost including interest and some fees.",
      example: "Lower APR usually means cheaper total loan cost.",
      risk: "Medium",
      tool: "Mortgage Calculator",
    },
  ],
  UK: [
    {
      term: "Pension",
      def: "Long-term retirement saving arrangement often supported by employer and tax benefits.",
      example: "Contributions grow over decades and can fund retirement income.",
      risk: "Low",
      tool: "Retirement Corpus Calculator",
    },
    {
      term: "ISA",
      def: "UK tax-efficient wrapper for savings and investments.",
      example: "Returns in ISA are generally protected from capital gains and income tax.",
      risk: "Medium",
      tool: "SIP Growth Calculator",
    },
  ],
  India: [
    {
      term: "SIP",
      def: "Systematic monthly investing approach used for disciplined wealth creation.",
      example: "A monthly fund contribution can benefit from rupee cost averaging.",
      risk: "Medium",
      tool: "SIP Growth Calculator",
    },
    {
      term: "80C",
      def: "A section of Indian tax law that provides deductions for eligible investments and expenses.",
      example: "Eligible retirement or insurance investments may reduce taxable income.",
      risk: "Low",
      tool: "Income Tax Estimator",
    },
  ],
  Singapore: [
    {
      term: "CPF",
      def: "Compulsory savings program used for retirement, housing, and healthcare needs.",
      example: "Monthly salary contributions are allocated across CPF accounts.",
      risk: "Low",
      tool: "Retirement Corpus Calculator",
    },
    {
      term: "HDB Loan",
      def: "Housing loan framework commonly used for public housing purchases in Singapore.",
      example: "Loan servicing is often planned with CPF balances and cash flow together.",
      risk: "Medium",
      tool: "Home Loan Calculator",
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
    "Money grows with time if you keep adding and avoid putting everything in one basket. Risk means how much your money can move up and down.",
  advanced:
    "Return compounding is exponential, while risk is path-dependent. Asset allocation and periodic rebalancing improve risk-adjusted outcomes.",
};

let selectedCountry = localStorage.getItem("gw_country") || "USA";
let score = Number(localStorage.getItem("gw_score") || 0);
const saved = JSON.parse(localStorage.getItem("gw_results") || "{}");

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "Invalid";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function validateInputs(inputs) {
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value !== "string" && !Number.isFinite(value)) {
      return `Invalid number for ${key}`;
    }
    if (typeof value === "number" && value < 0) {
      return `${key} cannot be negative`;
    }
  }
  return "";
}

function updateScore(delta = 4) {
  score = Math.min(100, score + delta);
  localStorage.setItem("gw_score", String(score));
  document.getElementById("financialScore").textContent = `Score: ${score} / 100`;
}

function updateSeo(tool) {
  const title = `${tool.seo} | ${selectedCountry} | Global Wealth & Risk Tools Hub`;
  document.title = title;
  const description = document.querySelector("meta[name='description']");
  description.setAttribute(
    "content",
    `${tool.title} for ${selectedCountry}. Lightweight, mobile-first calculator with instant results and simple FAQs.`,
  );
}

function renderCalculators() {
  Object.entries(calculatorSections).forEach(([gridId, ids]) => {
    const grid = document.getElementById(gridId);
    grid.innerHTML = ids
      .map((id) => calculators.find((x) => x.id === id))
      .filter((tool) => tool.countries.includes(selectedCountry))
      .map((tool) => {
        const fields = tool.fields
          .map(([label, key, val, opts]) => {
            if (opts) {
              return `<label>${label}<select name="${key}">${opts
                .map((opt) => `<option value="${opt}" ${opt === val ? "selected" : ""}>${opt}</option>`)
                .join("")}</select></label>`;
            }
            return `<label>${label}<input type="number" step="any" name="${key}" value="${val}" /></label>`;
          })
          .join("");

        return `<article class="card tool-card" data-id="${tool.id}">
            <h3>${tool.title}</h3>
            <p class="tool-intro">${tool.intro}</p>
            ${fields}
            <button class="btn calc-btn">Calculate</button>
            <a class="btn ghost" href="#tool=${tool.id}&country=${selectedCountry}">Open SEO Route</a>
            <div class="result" id="res-${tool.id}">${saved[tool.id] || "Result appears here"}</div>
            <div class="result-ad">Ad placement: shown after results only (ad-safe).</div>
            <div class="faq"><strong>FAQ:</strong> ${tool.faq}</div>
          </article>`;
      })
      .join("");
  });

  document.querySelectorAll(".calc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".tool-card");
      const tool = calculators.find((t) => t.id === card.dataset.id);
      const inputs = {};
      card.querySelectorAll("input,select").forEach((el) => {
        inputs[el.name] = el.tagName === "SELECT" ? el.value : Number(el.value);
      });

      const invalid = validateInputs(inputs);
      const resultNode = document.getElementById(`res-${tool.id}`);
      if (invalid) {
        resultNode.textContent = invalid;
        resultNode.classList.add("error");
        return;
      }

      const output = tool.calc(inputs, selectedCountry);
      const formatted = tool.format(output, inputs, selectedCountry);
      resultNode.textContent = formatted;
      resultNode.classList.remove("error");
      saved[tool.id] = `[${selectedCountry}] ${formatted}`;
      localStorage.setItem("gw_results", JSON.stringify(saved));
      updateSeo(tool);
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
    tab.addEventListener("click", () => {
      selectedCountry = tab.dataset.country;
      applyCountrySelection();
    });
  });
}

function applyCountrySelection() {
  localStorage.setItem("gw_country", selectedCountry);
  document.getElementById("countrySelector").value = selectedCountry;
  document.getElementById("countryHint").textContent = countryRules[selectedCountry].hint;
  renderCalculators();
  renderGlossary(selectedCountry);
}

function applyRouteHash() {
  const hash = window.location.hash;
  const matches = hash.match(/tool=([^&]+)&country=([^&]+)/);
  if (!matches) return;
  const [, toolId, country] = matches;
  if (countryRules[country]) selectedCountry = country;
  applyCountrySelection();

  const targetTool = calculators.find((tool) => tool.id === toolId);
  if (targetTool) {
    updateSeo(targetTool);
    setTimeout(() => {
      const card = document.querySelector(`.tool-card[data-id='${toolId}']`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }
}

function initOtherUI() {
  document.getElementById("themeToggle").onclick = () => document.body.classList.toggle("dark");

  document.getElementById("countrySelector").addEventListener("change", (e) => {
    selectedCountry = e.target.value;
    applyCountrySelection();
    window.location.hash = `tool=retirement&country=${selectedCountry}`;
  });

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

  document.getElementById("learningContent").textContent = learningModes.eli12;
  document.getElementById("financialScore").textContent = `Score: ${score} / 100`;

  document.getElementById("globalSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".tool-card, .glossary-item").forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? "block" : "none";
    });
  });

  const tipNode = document.createElement("p");
  tipNode.textContent = tips[new Date().getUTCDate() % tips.length];
  document.querySelector("footer .note").append(` Daily Tip: ${tipNode.textContent}`);

  window.addEventListener("hashchange", applyRouteHash);
}

applyCountrySelection();
initOtherUI();
applyRouteHash();
