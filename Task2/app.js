// app.js (ES module version using transformers.js for local sentiment classification)
// WITH GOOGLE SHEETS EVENT LOGGING INTEGRATION

import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// ============================================
// CONFIGURATION - UPDATE THIS WITH YOUR GAS URL
// ============================================
const GAS_LOGGING_ENDPOINT = "https://script.google.com/macros/s/AKfycbw3mDO4KULHecQ4NlMzCzlfoCDuu_onEjMlsBd5tUZjWpVB97_s6jvxl2NzquEJULUY1Q/exec";

// ============================================
// Global variables
// ============================================
let reviews = [];
let apiToken = ""; // kept for UI compatibility, but not used with local inference
let sentimentPipeline = null; // transformers.js text-classification pipeline
let sessionId = generateSessionId(); // Unique session identifier

// ============================================
// DOM elements
// ============================================
const analyzeBtn = document.getElementById("analyze-btn");
const reviewText = document.getElementById("review-text");
const sentimentResult = document.getElementById("sentiment-result");
const loadingElement = document.querySelector(".loading");
const errorElement = document.getElementById("error-message");
const apiTokenInput = document.getElementById("api-token");
const statusElement = document.getElementById("status"); // optional status label for model loading

// ============================================
// Initialize the app
// ============================================
document.addEventListener("DOMContentLoaded", function () {
    // Load the TSV file (Papa Parse)
    loadReviews();

    // Set up event listeners
    analyzeBtn.addEventListener("click", analyzeRandomReview);
    apiTokenInput.addEventListener("change", saveApiToken);

    // Load saved API token if exists (not used with local inference but kept for UI)
    const savedToken = localStorage.getItem("hfApiToken");
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }

    // Initialize transformers.js sentiment model
    initSentimentModel();
});

// ============================================
// Session ID generation
// ============================================
function generateSessionId() {
    // Try to get existing session ID from localStorage
    let id = localStorage.getItem("sessionId");
    if (!id) {
        // Generate new ID: timestamp + random string
        id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("sessionId", id);
    }
    return id;
}

// ============================================
// Initialize transformers.js sentiment model
// ============================================
async function initSentimentModel() {
    try {
        if (statusElement) {
            statusElement.textContent = "Loading sentiment model...";
        }

        // Use a transformers.js-supported text-classification model.
        // Xenova/distilbert-base-uncased-finetuned-sst-2-english is a common choice.
        sentimentPipeline = await pipeline(
            "text-classification",
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
        );

        if (statusElement) {
            statusElement.textContent = "Sentiment model ready";
        }
    } catch (error) {
        console.error("Failed to load sentiment model:", error);
        showError(
            "Failed to load sentiment model. Please check your network connection and try again."
        );
        if (statusElement) {
            statusElement.textContent = "Model load failed";
        }
    }
}

// ============================================
// Load and parse the TSV file using Papa Parse
// ============================================
function loadReviews() {
    fetch("reviews_test.tsv")
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to load TSV file");
            }
            return response.text();
        })
        .then((tsvData) => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: "\t",
                complete: (results) => {
                    reviews = results.data
                        .map((row) => row.text)
                        .filter((text) => typeof text === "string" && text.trim() !== "");
                    console.log("Loaded", reviews.length, "reviews");
                },
                error: (error) => {
                    console.error("TSV parse error: ", error);
                    showError("Failed to parse TSV file: " + error.message);
                },
            });
        })
        .catch((error) => {
            console.error("TSV load error: ", error);
            showError("Failed to load TSV file: " + error.message);
        });
}

// ============================================
// Save API token to localStorage
// ============================================
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem("hfApiToken", apiToken);
    } else {
        localStorage.removeItem("hfApiToken");
    }
}

// ============================================
// Analyze a random review (MAIN FUNCTION)
// ============================================
function analyzeRandomReview() {
    hideError();

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

    // Display the review
    reviewText.textContent = selectedReview;

    // Show loading state
    loadingElement.style.display = "block";
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = ""; // Reset previous result
    sentimentResult.className = "sentiment-result"; // Reset classes

    // Call local sentiment model (transformers.js)
    analyzeSentiment(selectedReview)
        .then((result) => {
            // Display sentiment to user
            displaySentiment(result);

            // Extract sentiment data for logging
            const sentimentData = extractSentimentData(result);

            // Log to Google Sheets
            logToGoogleSheets(selectedReview, sentimentData);
        })
        .catch((error) => {
            console.error("Error:", error);
            showError(error.message || "Failed to analyze sentiment.");
        })
        .finally(() => {
            loadingElement.style.display = "none";
            analyzeBtn.disabled = false;
        });
}

// ============================================
// Extract sentiment data from model output
// ============================================
function extractSentimentData(result) {
    let sentiment = "NEUTRAL";
    let score = 0.5;

    // Expected format: [[{label: 'POSITIVE', score: 0.99}]]
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
// Log sentiment analysis to Google Sheets
// ============================================
async function logToGoogleSheets(review, sentimentData) {
    try {
        // Prepare metadata
        const metadata = {
            sessionId: sessionId,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            model: "distilbert-base-uncased-finetuned-sst-2-english",
            reviewLength: review.length,
            timestampClient: new Date().toISOString()
        };

        // Prepare payload
        const payload = {
            timestamp: new Date().toISOString(),
            review: review,
            sentiment: sentimentData.sentiment,
            confidence: sentimentData.confidence,
            meta: metadata
        };

        // Send to Google Apps Script
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
        // Don't break UI if logging fails - just log to console
        console.warn("⚠️ Failed to log to Google Sheets:", error);
        // Optionally show subtle notification
        // showError("Note: Analysis completed but logging failed.");
    }
}

// ============================================
// Call local transformers.js pipeline for sentiment classification
// ============================================
async function analyzeSentiment(text) {
    if (!sentimentPipeline) {
        throw new Error("Sentiment model is not initialized.");
    }

    // transformers.js text-classification pipeline returns:
    // [{ label: 'POSITIVE', score: 0.99 }, ...]
    const output = await sentimentPipeline(text);

    if (!Array.isArray(output) || output.length === 0) {
        throw new Error("Invalid sentiment output from local model.");
    }

    // Wrap to match [[{ label, score }]] shape expected by displaySentiment
    return [output];
}

// ============================================
// Display sentiment result
// ============================================
function displaySentiment(result) {
    // Default to neutral if we can't parse the result
    let sentiment = "neutral";
    let score = 0.5;
    let label = "NEUTRAL";

    // Expected format: [[{label: 'POSITIVE', score: 0.99}]]
    if (
        Array.isArray(result) &&
        result.length > 0 &&
        Array.isArray(result[0]) &&
        result[0].length > 0
    ) {
        const sentimentData = result[0][0];
        if (sentimentData && typeof sentimentData === "object") {
            label =
                typeof sentimentData.label === "string"
                    ? sentimentData.label.toUpperCase()
                    : "NEUTRAL";
            score =
                typeof sentimentData.score === "number"
                    ? sentimentData.score
                    : 0.5;

            // Determine sentiment bucket
            if (label === "POSITIVE" && score > 0.5) {
                sentiment = "positive";
            } else if (label === "NEGATIVE" && score > 0.5) {
                sentiment = "negative";
            } else {
                sentiment = "neutral";
            }
        }
    }

    // Update UI
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `<i class="fas ${getSentimentIcon(sentiment)} icon"></i> <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>`;
}

// ============================================
// Get appropriate icon for sentiment bucket
// ============================================
function getSentimentIcon(sentiment) {
    switch (sentiment) {
        case "positive":
            return "fa-thumbs-up";
        case "negative":
            return "fa-thumbs-down";
        default:
            return "fa-question-circle";
    }
}

// ============================================
// Show error message
// ============================================
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
}

// ============================================
// Hide error message
// ============================================
function hideError() {
    errorElement.style.display = "none";

}
