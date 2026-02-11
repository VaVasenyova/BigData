/**
 * Sentiment Decision Maker
 * Combines sentiment analysis with business logic for automated decision-making
 */

// ============================================
// CONFIGURATION - UPDATE THIS WITH YOUR GAS URL
// ============================================
const GAS_LOGGING_ENDPOINT = "https://script.google.com/macros/s/AKfycbzJgeKpRzsbecvqbxvbojOH0KAYpsAEeVfJJedAfhPX1xo80H6-SnevyJmXokYrg21cyg/exec";

// ============================================
// DEFAULT BUSINESS LOGIC
// ============================================
const DEFAULT_INSTRUCTION = `ROLE:
Sentiment-Based Decision Maker
CONTEXT:
Customer Data: sentiment, confidence, segment, churn_score, monthly_charges
INSTRUCTION:
Define your logic using IF/ELSE rules. The system executes them in order.
[RULES]
// 1. Critical Negative Sentiment (Emergency Response)
IF sentiment == "NEGATIVE" AND confidence >= 0.8 THEN RETURN "EMERGENCY_CALL"

// 2. Negative Sentiment (Offer Compensation)
IF sentiment == "NEGATIVE" AND confidence >= 0.6 THEN RETURN "OFFER_COUPON"

// 3. Neutral Sentiment (Upsell Opportunity)
IF sentiment == "NEUTRAL" AND confidence >= 0.7 THEN RETURN "SUGGEST_UPGRADE"

// 4. Positive Sentiment (Cross-sell)
IF sentiment == "POSITIVE" AND confidence >= 0.8 THEN RETURN "THANK_AND_CROSSSELL"

// 5. Low Confidence (Human Review)
IF confidence < 0.6 THEN RETURN "HUMAN_REVIEW"

// Default: Thank customer
RETURN "THANK_ONLY"

[MERMAID]
flowchart TD
    Start[Review Analyzed] --> Sentiment{Sentiment?}
    
    Sentiment -- NEGATIVE --> Conf1{Confidence >= 0.8?}
    Conf1 -- Yes --> Emergency[EMERGENCY_CALL]
    Conf1 -- No --> Conf2{Confidence >= 0.6?}
    Conf2 -- Yes --> Coupon[OFFER_COUPON]
    Conf2 -- No --> Review[HUMAN_REVIEW]
    
    Sentiment -- NEUTRAL --> Conf3{Confidence >= 0.7?}
    Conf3 -- Yes --> Upgrade[SUGGEST_UPGRADE]
    Conf3 -- No --> Review
    
    Sentiment -- POSITIVE --> Conf4{Confidence >= 0.8?}
    Conf4 -- Yes --> CrossSell[THANK_AND_CROSSSELL]
    Conf4 -- No --> Thank[THANK_ONLY]
    
    Emergency --> End[Action Taken]
    Coupon --> End
    Upgrade --> End
    CrossSell --> End
    Thank --> End
    Review --> End
`;

// ============================================
// Global Variables
// ============================================
let reviews = [];
let sentimentPipeline = null;
let sessionId = generateSessionId();
let businessRules = [];

// ============================================
// DOM Elements
// ============================================
const el = (id) => document.getElementById(id);

// ============================================
// Initialize the App
// ============================================
document.addEventListener("DOMContentLoaded", async function () {
    // Load reviews
    await loadReviews();

    // Initialize sentiment model
    await initSentimentModel();

    // Set up business logic
    el("instruction").value = DEFAULT_INSTRUCTION;
    businessRules = parseRules(DEFAULT_INSTRUCTION);

    // Event listeners
    el("runBtn").addEventListener("click", runSimulation);
    el("analyze-btn").addEventListener("click", analyzeRandomReview);

    // Initial render
    const mermaidCode = extractMermaid(DEFAULT_INSTRUCTION);
    await renderMermaid(mermaidCode);
});

// ============================================
// Session ID Generation
// ============================================
function generateSessionId() {
    let id = localStorage.getItem("sessionId");
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("sessionId", id);
    }
    return id;
}

// ============================================
// Initialize Sentiment Model
// ============================================
async function initSentimentModel() {
    try {
        const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js");

        el("model-status").textContent = "Loading sentiment model...";

        sentimentPipeline = await pipeline(
            "text-classification",
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
        );

        el("model-status").textContent = "✅ Model ready";
        el("model-status").style.color = "#10b981";
    } catch (error) {
        console.error("Failed to load sentiment model:", error);
        el("model-status").textContent = "❌ Model load failed";
        el("model-status").style.color = "#ef4444";
    }
}

// ============================================
// Load Reviews from TSV
// ============================================
async function loadReviews() {
    try {
        const response = await fetch("reviews_test.tsv");
        if (!response.ok) {
            throw new Error("Failed to load TSV file");
        }

        const tsvData = await response.text();

        return new Promise((resolve) => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: "\t",
                complete: (results) => {
                    reviews = results.data
                        .map((row) => row.text)
                        .filter((text) => typeof text === "string" && text.trim() !== "");
                    console.log("Loaded", reviews.length, "reviews");
                    resolve();
                },
                error: (error) => {
                    console.error("TSV parse error:", error);
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error("TSV load error:", error);
    }
}

// ============================================
// Parse Business Rules
// ============================================
function parseRules(instructionText) {
    const lines = instructionText.split("\n");
    const start = lines.findIndex(x => x.trim() === "[RULES]");
    if (start === -1) return [];

    const rules = [];
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("//")) continue;
        if (line.startsWith("[")) break;

        const ifMatch = line.match(/^IF\s+(.+?)\s+THEN\s+RETURN\s+"?([A-Z_]+)"?$/i);
        const returnMatch = line.match(/^RETURN\s+"?([A-Z_]+)"?$/i);

        if (ifMatch) {
            rules.push({
                type: "conditional",
                condition: ifMatch[1],
                result: ifMatch[2].toUpperCase()
            });
        } else if (returnMatch) {
            rules.push({
                type: "fallback",
                result: returnMatch[1].toUpperCase()
            });
        }
    }
    return rules;
}

// ============================================
// Execute Business Rules
// ============================================
function executeRules(data, rules) {
    for (const rule of rules) {
        if (rule.type === "fallback") {
            return rule.result;
        }

        if (rule.type === "conditional") {
            let cond = rule.condition
                .replace(/sentiment/g, `"${data.sentiment}"`)
                .replace(/confidence/g, data.confidence)
                .replace(/churn_score/g, data.churn_score || 0)
                .replace(/monthly_charges/g, data.monthly_charges || 0)
                .replace(/segment/g, `"${data.segment || "OTHER"}"`);

            try {
                if (eval(cond)) {
                    return rule.result;
                }
            } catch (e) {
                console.warn("Rule eval error:", cond, e);
            }
        }
    }
    return "NO_ACTION";
}

// ============================================
// Extract Mermaid Diagram
// ============================================
function extractMermaid(instructionText) {
    const lines = instructionText.split("\n");
    const start = lines.findIndex(x => x.trim() === "[MERMAID]");
    if (start === -1) return "flowchart TD\n  A[No MERMAID section found]";

    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("[") && line.trim() !== "[MERMAID]") break;
        out.push(line);
    }
    return out.join("\n").trim();
}

// ============================================
// Render Mermaid Diagram
// ============================================
async function renderMermaid(mermaidCode) {
    const mermaid = window.mermaid;
    if (!mermaid) return;

    const container = el("diagram");
    container.innerHTML = `<pre class="mermaid">${escapeHtml(mermaidCode)}</pre>`;

    try {
        await mermaid.run({ querySelector: ".mermaid" });
    } catch (error) {
        console.error("Mermaid render error:", error);
        container.innerHTML = `<div class="error">Failed to render diagram</div>`;
    }
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ============================================
// Analyze Random Review
// ============================================
async function analyzeRandomReview() {
    if (!Array.isArray(reviews) || reviews.length === 0) {
        showError("No reviews available. Please try again later.");
        return;
    }

    if (!sentimentPipeline) {
        showError("Sentiment model is not ready yet. Please wait a moment.");
        return;
    }

    // Select random review
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    el("review-text").textContent = selectedReview;

    // Show loading state
    document.querySelector(".loading").style.display = "block";
    el("analyze-btn").disabled = true;
    el("sentiment-result").innerHTML = "";
    el("sentiment-result").className = "sentiment-result";
    el("business-action").innerHTML = "";
    el("business-action").className = "business-action";

    try {
        // Analyze sentiment
        const sentimentResult = await analyzeSentiment(selectedReview);
        const sentimentData = extractSentimentData(sentimentResult);

        // Execute business logic
        const businessAction = executeRules(sentimentData, businessRules);

        // Display results
        displaySentiment(sentimentData);
        displayBusinessAction(sentimentData, businessAction);

        // Log to Google Sheets
        await logToGoogleSheets(selectedReview, sentimentData, businessAction);

    } catch (error) {
        console.error("Error:", error);
        showError(error.message || "Failed to analyze sentiment.");
    } finally {
        document.querySelector(".loading").style.display = "none";
        el("analyze-btn").disabled = false;
    }
}

// ============================================
// Analyze Sentiment
// ============================================
async function analyzeSentiment(text) {
    if (!sentimentPipeline) {
        throw new Error("Sentiment model is not initialized.");
    }

    const output = await sentimentPipeline(text);

    if (!Array.isArray(output) || output.length === 0) {
        throw new Error("Invalid sentiment output from local model.");
    }

    return [output];
}

// ============================================
// Extract Sentiment Data
// ============================================
function extractSentimentData(result) {
    let sentiment = "NEUTRAL";
    let score = 0.5;

    if (
        Array.isArray(result) &&
        result.length > 0 &&
        Array.isArray(result[0]) &&
        result[0].length > 0
    ) {
        const sentimentData = result[0][0];
        if (sentimentData && typeof sentimentData === "object") {
            sentiment = typeof sentimentData.label === "string"
                ? sentimentData.label.toUpperCase()
                : "NEUTRAL";
            score = typeof sentimentData.score === "number"
                ? sentimentData.score
                : 0.5;
        }
    }

    return { sentiment, confidence: score };
}

// ============================================
// Display Sentiment
// ============================================
function displaySentiment(sentimentData) {
    let sentimentClass = "neutral";
    let label = sentimentData.sentiment;
    let score = sentimentData.confidence;

    if (label === "POSITIVE" && score > 0.5) {
        sentimentClass = "positive";
    } else if (label === "NEGATIVE" && score > 0.5) {
        sentimentClass = "negative";
    }

    const icon = getSentimentIcon(sentimentClass);
    const confidencePercent = (score * 100).toFixed(1);

    el("sentiment-result").classList.add(sentimentClass);
    el("sentiment-result").innerHTML = `
        <i class="fas ${icon} icon"></i>
        <span>${label} (${confidencePercent}% confidence)</span>
    `;
}

// ============================================
// Display Business Action
// ============================================
function displayBusinessAction(sentimentData, action) {
    const actionElement = el("business-action");
    const message = getActionMessage(action, sentimentData);
    const className = getActionClass(action);

    actionElement.className = `business-action ${className}`;
    actionElement.innerHTML = `
        <h4>🤖 Automated Decision:</h4>
        <p>${message}</p>
        <div class="action-tag">${action}</div>
    `;
}

// ============================================
// Get Action Message
// ============================================
function getActionMessage(action, sentimentData) {
    const messages = {
        "EMERGENCY_CALL": "🚨 CRITICAL: Customer extremely dissatisfied. Immediate manager call required!",
        "OFFER_COUPON": "🎫 Offer 20% discount coupon to restore customer loyalty",
        "SUGGEST_UPGRADE": "💡 Recommend premium version upgrade",
        "THANK_AND_CROSSSELL": "⭐ Thank customer! Suggest additional services",
        "THANK_ONLY": "🙏 Thank you for your feedback!",
        "HUMAN_REVIEW": "🔍 Requires manual review (low model confidence)",
        "NO_ACTION": "No action required"
    };
    return messages[action] || "No action defined";
}

// ============================================
// Get Action Class
// ============================================
function getActionClass(action) {
    const classes = {
        "EMERGENCY_CALL": "action-emergency",
        "OFFER_COUPON": "action-negative",
        "SUGGEST_UPGRADE": "action-neutral",
        "THANK_AND_CROSSSELL": "action-positive",
        "THANK_ONLY": "action-default",
        "HUMAN_REVIEW": "action-warning",
        "NO_ACTION": "action-default"
    };
    return classes[action] || "action-default";
}

// ============================================
// Get Sentiment Icon
// ============================================
function getSentimentIcon(sentiment) {
    switch (sentiment) {
        case "positive": return "fa-thumbs-up";
        case "negative": return "fa-thumbs-down";
        default: return "fa-question-circle";
    }
}

// ============================================
// Log to Google Sheets
// ============================================
async function logToGoogleSheets(review, sentimentData, businessAction) {
    try {
        const metadata = {
            sessionId: sessionId,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            model: "distilbert-base-uncased-finetuned-sst-2-english",
            reviewLength: review.length,
            timestampClient: new Date().toISOString()
        };

        const payload = {
            ts_iso: new Date().toISOString(),
            review: review,
            sentiment: sentimentData.sentiment,
            confidence: sentimentData.confidence,
            meta: metadata,
            action_taken: businessAction
        };

        const response = await fetch(GAS_LOGGING_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ Logged to Google Sheets:", result);

    } catch (error) {
        console.warn("⚠️ Failed to log to Google Sheets:", error);
    }
}

// ============================================
// Show Error Message
// ============================================
function showError(message) {
    const errorElement = el("error-message");
    errorElement.textContent = message;
    errorElement.style.display = "block";
    setTimeout(() => {
        errorElement.style.display = "none";
    }, 5000);
}

// ============================================
// Run Simulation (Mock Data)
// ============================================
async function runSimulation() {
    el("status").textContent = "Parsing logic & Simulating...";

    try {
        // Parse rules
        const rules = parseRules(el("instruction").value);
        businessRules = rules; // Update global rules

        // Generate mock data
        const mockData = generateMockData(300);

        // Process rows
        const enriched = mockData.map(row => {
            const action = executeRules(row, rules);
            const cost = actionCost(action);

            return {
                customer_id: row.customer_id,
                segment: row.segment,
                monthly_charges: row.monthly_charges.toFixed(2),
                tenure: row.tenure,
                contract: row.contract,
                churn_score: (row.churn_score || 0).toFixed(2),
                sentiment: row.sentiment || "N/A",
                confidence: (row.confidence || 0).toFixed(2),
                action: action,
                cost: cost
            };
        });

        // Calculate KPIs
        const totalCost = enriched.reduce((a, r) => a + r.cost, 0);
        const highRisk = enriched.filter(r => parseFloat(r.churn_score) >= 0.7);
        const highRiskCovered = highRisk.filter(r => r.action !== "NO_ACTION").length;
        const coverage = highRisk.length ? (highRiskCovered / highRisk.length) : 0;

        // Policy Score
        const BUDGET_LIMIT = 3500;
        const safetyScore = Math.min(50, (coverage / 0.9) * 50);
        let efficiencyScore = 0;
        if (totalCost <= BUDGET_LIMIT) {
            efficiencyScore = 30 + (20 * (1 - (totalCost / BUDGET_LIMIT)));
        }

        let penalty = 0;
        if (totalCost > BUDGET_LIMIT) {
            penalty = (totalCost - BUDGET_LIMIT) * 0.1;
        }

        const finalScore = Math.max(0, Math.round(safetyScore + efficiencyScore - penalty));

        // Render KPIs
        el("kpiRows").textContent = enriched.length;
        el("kpiBudget").textContent = `$${totalCost.toLocaleString()}`;
        el("kpiCoverage").textContent = `${Math.round(coverage * 100)}%`;
        el("kpiScore").textContent = finalScore;
        el("kpiAvgCost").textContent = `$${(totalCost / enriched.length).toFixed(2)}`;
        el("kpiActions").textContent = enriched.filter(r => r.action !== "NO_ACTION").length;

        // Color code score
        const scoreEl = el("kpiScore");
        if (finalScore >= 85) scoreEl.style.color = "#10b981";
        else if (finalScore >= 50) scoreEl.style.color = "#f59e0b";
        else scoreEl.style.color = "#ef4444";

        // Offer counts
        const counts = {};
        enriched.forEach(r => counts[r.action] = (counts[r.action] || 0) + 1);
        el("offerCounts").textContent = JSON.stringify(counts, null, 2);

        // Render table
        renderTable(enriched);

        // Render diagram
        const mermaidCode = extractMermaid(el("instruction").value);
        await renderMermaid(mermaidCode);

        el("status").textContent = "✅ Simulation Complete";

    } catch (err) {
        console.error(err);
        el("status").textContent = "❌ Error: " + err.message;
    }
}

// ============================================
// Generate Mock Data
// ============================================
function generateMockData(count) {
    const segments = ["VIP", "STANDARD", "OTHER"];
    const contracts = ["Month-to-month", "One year", "Two year"];
    const sentiments = ["POSITIVE", "NEGATIVE", "NEUTRAL"];

    return Array.from({ length: count }, (_, i) => {
        const monthlyCharges = Math.random() * 120;
        const segment = monthlyCharges >= 90 ? "VIP" : monthlyCharges >= 50 ? "STANDARD" : "OTHER";

        let churnScore = 0.3;
        if (Math.random() > 0.5) churnScore += 0.4;
        if (segment === "VIP") churnScore -= 0.2;

        return {
            customer_id: `CUST_${String(i + 1).padStart(4, '0')}`,
            segment: segment,
            monthly_charges: monthlyCharges,
            tenure: Math.floor(Math.random() * 72),
            contract: contracts[Math.floor(Math.random() * contracts.length)],
            churn_score: churnScore,
            sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
            confidence: 0.6 + Math.random() * 0.4
        };
    });
}

// ============================================
// Action Cost
// ============================================
function actionCost(action) {
    const costs = {
        "EMERGENCY_CALL": 100,
        "OFFER_COUPON": 25,
        "SUGGEST_UPGRADE": 10,
        "THANK_AND_CROSSSELL": 5,
        "THANK_ONLY": 0,
        "HUMAN_REVIEW": 15,
        "NO_ACTION": 0
    };
    return costs[action] || 0;
}

// ============================================
// Render Table
// ============================================
function renderTable(rows) {
    const table = el("outTable");
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    rows.slice(0, 15).forEach(row => {
        const tr = document.createElement("tr");

        const fields = [
            "customer_id", "segment", "monthly_charges", "tenure",
            "contract", "churn_score", "sentiment", "confidence",
            "action", "cost"
        ];

        fields.forEach(field => {
            const td = document.createElement("td");
            td.textContent = row[field];
            if (field === "action") {
                td.className = getActionClass(row[field]);
            }
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}