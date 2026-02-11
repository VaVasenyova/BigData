// app.js - Remote Hugging Face API version with Business Decision Logic
// Uses API token + internet for each request (no local model)

// ============================================
// CONFIGURATION - UPDATE THIS WITH YOUR GAS URL
// ============================================
const GAS_LOGGING_ENDPOINT = "https://script.google.com/macros/s/AKfycbw3mDO4KULHecQ4NlMzCzlfoCDuu_onEjMlsBd5tUZjWpVB97_s6jvxl2NzquEJULUY1Q/exec";

// ============================================
// STATE MANAGEMENT
// ============================================
let reviews = [];
let apiToken = '';

// ============================================
// DOM ELEMENTS
// ============================================
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const actionResult = document.getElementById('action-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Load reviews from TSV
    loadReviews();
    
    // Set up event listeners
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeRandomReview);
    }
    if (apiTokenInput) {
        apiTokenInput.addEventListener('change', saveApiToken);
    }

    // Load saved API token if exists
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken && apiTokenInput) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
});

// ============================================
// DATA LOADING
// ============================================
function loadReviews() {
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load TSV file');
            return response.text();
        })
        .then(tsvData => {
            // Parse TSV using Papa Parse (loaded from CDN in HTML)
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                complete: (results) => {
                    reviews = results.data
                        .map(row => row.text || row.review || row.Text || row.Review)
                        .filter(text => text && text.trim() !== '');
                    console.log('✅ Loaded', reviews.length, 'reviews');
                },
                error: (error) => {
                    console.error('TSV parse error:', error);
                    showError('Failed to parse TSV file: ' + error.message);
                }
            });
        })
        .catch(error => {
            console.error('TSV load error:', error);
            showError('Failed to load TSV file. Ensure "reviews_test.tsv" exists in the same folder.');
        });
}

// ============================================
// TOKEN MANAGEMENT
// ============================================
function saveApiToken() {
    if (apiTokenInput) {
        apiToken = apiTokenInput.value.trim();
        if (apiToken) {
            localStorage.setItem('hfApiToken', apiToken);
        } else {
            localStorage.removeItem('hfApiToken');
        }
    }
}

// ============================================
// BUSINESS LOGIC - DETERMINE ACTION
// ============================================
/**
 * Determines the appropriate business action based on sentiment analysis results.
 * 
 * @param {number} confidence - The confidence score returned by the API (0.0 to 1.0).
 * @param {string} label - The label returned by the API (e.g., "POSITIVE", "NEGATIVE").
 * @returns {object} An object containing the action metadata (code, message, color).
 */
function determineBusinessAction(confidence, label) {
    // 1. Normalize Score: Map everything to a 0 (Worst) to 1 (Best) scale.
    let normalizedScore = 0.5; // Default neutral

    if (label === "POSITIVE") {
        normalizedScore = confidence;
    } else if (label === "NEGATIVE") {
        normalizedScore = 1.0 - confidence;
    }

    // 2. Apply Business Thresholds
    if (normalizedScore <= 0.4) {
        // CASE: Critical Churn Risk
        return {
            actionCode: "OFFER_COUPON",
            uiMessage: "🚨 We are truly sorry. Please accept this 50% discount coupon.",
            uiColor: "#ef4444", // Red
            buttonText: "Get 50% Off",
            buttonLink: "#coupon"
        };
    } else if (normalizedScore < 0.7) {
        // CASE: Ambiguous / Neutral
        return {
            actionCode: "REQUEST_FEEDBACK",
            uiMessage: "📝 Thank you! Could you tell us how we can improve?",
            uiColor: "#6b7280", // Gray
            buttonText: "Take Survey",
            buttonLink: "#feedback"
        };
    } else {
        // CASE: Happy Customer
        return {
            actionCode: "ASK_REFERRAL",
            uiMessage: "⭐ Glad you liked it! Refer a friend and earn rewards.",
            uiColor: "#3b82f6", // Blue
            buttonText: "Refer a Friend",
            buttonLink: "#referral"
        };
    }
}

// ============================================
// ANALYSIS WORKFLOW
// ============================================
function analyzeRandomReview() {
    hideError();
    if (reviews.length === 0) {
        showError('No reviews available. Please load reviews first.');
        return;
    }

    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];

    // Display the review
    if (reviewText) {
        reviewText.textContent = selectedReview;
    }

    // Show loading state
    if (loadingElement) loadingElement.style.display = 'block';
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (sentimentResult) {
        sentimentResult.innerHTML = ''; 
        sentimentResult.className = 'sentiment-result';
    }
    if (actionResult) {
        actionResult.innerHTML = '';
        actionResult.style.display = 'none';
    }

    // Call Hugging Face API
    analyzeSentiment(selectedReview)
        .then(result => {
            const sentimentData = displaySentiment(result);
            // Determine business action
            const decision = determineBusinessAction(sentimentData.score, sentimentData.label);
            
            // Display the action
            displayAction(decision);
            
            // Log to Google Sheets
            logToGoogleSheet(selectedReview, sentimentData, decision);
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Failed to analyze sentiment: ' + (error.message || error));
        })
        .finally(() => {
            if (loadingElement) loadingElement.style.display = 'none';
            if (analyzeBtn) analyzeBtn.disabled = false;
        });
}

// ============================================
// SENTIMENT ANALYSIS (REMOTE API)
// ============================================
async function analyzeSentiment(text) {
    if (!apiToken) {
        throw new Error('Please enter your Hugging Face API token first');
    }

    const response = await fetch(
        'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english',
        {
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ inputs: text }),
        }
    );
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText || response.statusText}`);
    }

    const result = await response.json();
    return result;
}

// ============================================
// UI DISPLAY FUNCTIONS
// ============================================
function displaySentiment(result) {
    // Default to neutral if we can't parse the result
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    // Parse the API response (format: [[{label: 'POSITIVE', score: 0.99}]])
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
        const sentimentData = result[0][0];
        label = (sentimentData.label || '').toUpperCase();
        score = sentimentData.score || 0.5;
        
        // Determine sentiment
        if (label === 'POSITIVE' && score > 0.5) {
            sentiment = 'positive';
        } else if (label === 'NEGATIVE' && score > 0.5) {
            sentiment = 'negative';
        }
    }

    // Update UI
    if (sentimentResult) {
        sentimentResult.classList.add(sentiment);
        sentimentResult.innerHTML = `
            <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
            <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
        `;
    }
    
    return { label, score, sentiment };
}

function getSentimentIcon(sentiment) {
    switch(sentiment) {
        case 'positive':
            return 'fa-thumbs-up';
        case 'negative':
            return 'fa-thumbs-down';
        default:
            return 'fa-question-circle';
    }
}

function displayAction(decision) {
    if (!actionResult) return;
    
    actionResult.style.display = 'block';
    actionResult.style.backgroundColor = decision.uiColor;
    actionResult.style.color = '#ffffff';
    actionResult.style.padding = '20px';
    actionResult.style.borderRadius = '8px';
    actionResult.style.marginTop = '20px';
    actionResult.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    actionResult.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 24px;">${getActionEmoji(decision.actionCode)}</div>
            <div>
                <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">System Decision</h3>
                <p style="margin: 0; font-size: 16px;">${decision.uiMessage}</p>
            </div>
        </div>
        <div style="margin-top: 15px; text-align: center;">
            <a href="${decision.buttonLink}" 
               onclick="event.preventDefault(); alert('Demo action triggered: ${decision.actionCode}');"
               style="display: inline-block; padding: 10px 20px; background: white; 
                      color: ${decision.uiColor}; text-decoration: none; 
                      border-radius: 5px; font-weight: bold; border: 2px solid white;
                      cursor: pointer; transition: all 0.2s;">
                ${decision.buttonText}
            </a>
        </div>
    `;
}

function getActionEmoji(actionCode) {
    switch(actionCode) {
        case 'OFFER_COUPON':
            return '🚨';
        case 'REQUEST_FEEDBACK':
            return '📝';
        case 'ASK_REFERRAL':
            return '⭐';
        default:
            return '🤖';
    }
}

// ============================================
// GOOGLE SHEETS LOGGING
// ============================================
async function logToGoogleSheet(review, sentimentData, decision) {
    try {
        const logData = {
            review: review,
            sentiment: sentimentData.label,
            confidence: sentimentData.score,
            action_taken: decision.actionCode,
            meta: {
                normalized_score: sentimentData.label === 'POSITIVE' 
                    ? sentimentData.score 
                    : 1 - sentimentData.score,
                timestamp: new Date().toISOString()
            }
        };

        console.log('📝 Logging to Google Sheets:', logData);
        
        const response = await fetch(GAS_LOGGING_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData)
        });

        if (!response.ok) {
            console.warn('⚠️ Failed to log to Google Sheets:', response.statusText);
        } else {
            console.log('✅ Successfully logged to Google Sheets:', decision.actionCode);
        }
    } catch (error) {
        console.warn('⚠️ Error logging to Google Sheets (non-critical):', error.message);
    }
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        console.error('UI Error:', message);
    }
}

function hideError() {
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}
