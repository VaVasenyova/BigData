// app.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

const GAS_LOGGING_ENDPOINT = "https://script.google.com/macros/s/AKfycbzzl37wcWLLVisp6w1KC8Mpfh1qsxPGwFDZswmAO2QrL4eiTKoVUileE_pS2Ev0WoYciQ/exec "; // ← ЗАМЕНИТЕ НА СВОЙ!

let reviews = [];
let sentimentPipeline = null;
let sessionId = localStorage.getItem("sessionId") || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem("sessionId", sessionId);

const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");

document.addEventListener("DOMContentLoaded", () => {
  loadReviews();
  analyzeBtn.addEventListener("click", analyzeRandomReview);
  apiTokenInput.addEventListener("change", () => {
    const token = apiTokenInput.value.trim();
    if (token) localStorage.setItem("hfApiToken", token);
  });
  
  const savedToken = localStorage.getItem("hfApiToken");
  if (savedToken) apiTokenInput.value = savedToken;
  
  initSentimentModel();
});

function loadReviews() {
  fetch("reviews_test.tsv") // ← ВАЖНО: без пробела в конце!
    .then(response => {
      if (!response.ok) throw new Error("Failed to load TSV file");
      return response.text();
    })
    .then(tsvData => {
      Papa.parse(tsvData, {
        header: true,
        delimiter: "\t",
        complete: results => {
          reviews = results.data
            .map(row => row.text)
            .filter(text => typeof text === "string" && text.trim() !== "");
          console.log(`Loaded ${reviews.length} reviews`);
        },
        error: error => {
          console.error("TSV parse error:", error);
          showError("Failed to parse reviews file");
        }
      });
    })
    .catch(error => {
      console.error("TSV load error:", error);
      showError("Failed to load reviews");
    });
}

async function initSentimentModel() {
  try {
    sentimentPipeline = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
    console.log("Model loaded");
  } catch (error) {
    console.error("Model load failed:", error);
    showError("Failed to load AI model. Check your internet connection.");
  }
}

function analyzeRandomReview() {
  if (!sentimentPipeline || reviews.length === 0) {
    showError("Model not ready or no reviews loaded");
    return;
  }

  const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
  reviewText.textContent = selectedReview;
  
  loadingElement.style.display = "block";
  analyzeBtn.disabled = true;
  sentimentResult.className = "sentiment-result";
  sentimentResult.innerHTML = "Analyzing...";
  errorElement.style.display = "none";

  analyzeSentiment(selectedReview)
    .then(result => {
      displaySentiment(result, selectedReview);
    })
    .catch(error => {
      console.error("Analysis error:", error);
      showError(error.message || "Analysis failed");
    })
    .finally(() => {
      loadingElement.style.display = "none";
      analyzeBtn.disabled = false;
    });
}

async function analyzeSentiment(text) {
  const output = await sentimentPipeline(text);
  return [output]; // Оборачиваем для совместимости
}

function displaySentiment(result, reviewText) {
  let label = "NEUTRAL";
  let score = 0.5;
  let sentimentClass = "neutral";

  if (Array.isArray(result) && result[0]?.[0]) {
    const { label: rawLabel, score: rawScore } = result[0][0];
    label = rawLabel.toUpperCase();
    score = rawScore;
    
    if (label === "POSITIVE" && score > 0.6) {
      sentimentClass = "positive";
    } else if (label === "NEGATIVE" && score > 0.6) {
      sentimentClass = "negative";
    }
  }

  sentimentResult.classList.add(sentimentClass);
  sentimentResult.innerHTML = `
    <i class="fas ${getIcon(sentimentClass)}"></i>
    ${label} (${(score * 100).toFixed(1)}% confidence)
  `;

  // Логируем данные
  logToGoogleSheets(reviewText, label, score);
}

function getIcon(sentiment) {
  return sentiment === "positive" ? "fa-thumbs-up" : 
         sentiment === "negative" ? "fa-thumbs-down" : "fa-meh";
}

async function logToGoogleSheets(review, sentiment, confidence) {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      review: review.substring(0, 500), // Ограничиваем длину
      sentiment: sentiment,
      confidence: confidence,
      normalized_score: sentiment === "NEGATIVE" ? 1 - confidence : confidence,
      action_taken: getActionCode(confidence, sentiment),
      meta: {
        sessionId: sessionId,
        userAgent: navigator.userAgent.substring(0, 100),
        timestampClient: new Date().toISOString()
      }
    };

    console.log("Sending to Google Sheets:", payload); // ← ОТЛАДКА

    const response = await fetch(GAS_LOGGING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("✅ Successfully logged to Google Sheets");
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.warn("⚠️ Logging failed:", error);
    // Не показываем ошибку пользователю — анализ прошёл успешно
  }
}

function getActionCode(confidence, label) {
  const normalized = label === "NEGATIVE" ? 1 - confidence : confidence;
  if (normalized <= 0.4) return "OFFER_COUPON";
  if (normalized < 0.7) return "REQUEST_FEEDBACK";
  return "ASK_REFERRAL";
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
}
