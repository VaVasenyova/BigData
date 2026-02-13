// Global variables
let reviews = [];
let apiToken = '';

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// Initialize the app
document.addEventListener('DOMContentLoaded', function () {
    // Load the TSV file (Papa Parse 활성화)
    loadReviews();

    // Set up event listeners
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    apiTokenInput.addEventListener('change', saveApiToken);

    // Load saved API token if exists
    const savedToken = localStorage.getItem('hfApiToken');
    if (savedToken) {
        apiTokenInput.value = savedToken;
        apiToken = savedToken;
    }
});

// Load and parse the TSV file using Papa Parse
function loadReviews() {
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load TSV file');
            return response.text();
        })
        .then(tsvData => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                complete: (results) => {
                    reviews = results.data
                        .map(row => row.text)
                        .filter(text => text && text.trim() !== '');
                    console.log('Loaded', reviews.length, 'reviews');
                },
                error: (error) => {
                    console.error('TSV parse error:', error);
                    showError('Failed to parse TSV file: ' + error.message);
                }
            });
        })
        .catch(error => {
            console.error('TSV load error:', error);
            showError('Failed to load TSV file: ' + error.message);
        });
}

// Save API token to localStorage
function saveApiToken() {
    apiToken = apiTokenInput.value.trim();
    if (apiToken) {
        localStorage.setItem('hfApiToken', apiToken);
    } else {
        localStorage.removeItem('hfApiToken');
    }
}

// Analyze a random review
function analyzeRandomReview() {
    hideError();

    if (reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }

    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];

    // Display the review
    reviewText.textContent = selectedReview;

    // Show loading state
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';  // Reset previous result
    sentimentResult.className = 'sentiment-result';  // Reset classes

    // Call Hugging Face API
    analyzeSentiment(selectedReview)
        .then(result => displaySentiment(result))
        .catch(error => {
            console.error('Error:', error);
            showError('Failed to analyze sentiment: ' + error.message);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        });
}

// Call Hugging Face API for sentiment analysis
async function analyzeSentiment(text) {
    const response = await fetch(
        'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english',
        {
            headers: {
                Authorization: apiToken ? `Bearer ${apiToken}` : undefined,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({ inputs: text }),
        }
    );

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
}


/**
 * Determines the appropriate business action based on sentiment analysis results.
 * 
 * Normalizes the AI output into a linear scale (0.0 to 1.0) to simplify
 * threshold comparisons.
 * 
 * @param {number} confidence - The confidence score returned by the API (0.0 to 1.0).
 * @param {string} label - The label returned by the API (e.g., "POSITIVE", "NEGATIVE").
 * @returns {object} An object containing the action metadata (code, message, color, icon).
 */
function determineBusinessAction(confidence, label) {
    // 1. Normalize Score: Map everything to a 0 (Worst) to 1 (Best) scale.
    // If Label is NEGATIVE, a high confidence means a VERY BAD score (near 0).
    let normalizedScore = 0.5; // Default neutral

    if (label === "POSITIVE") {
        normalizedScore = confidence; // e.g., 0.9 -> 0.9 (Great)
    } else if (label === "NEGATIVE") {
        normalizedScore = 1.0 - confidence; // e.g., 0.9 conf -> 0.1 (Terrible)
    }

    // 2. Apply Business Thresholds
    if (normalizedScore <= 0.4) {
        // CASE: Critical Churn Risk
        return {
            actionCode: "OFFER_COUPON",
            uiMessage: "We are truly sorry. Please accept this 50% discount coupon.",
            uiColor: "#ef4444", // Red
            uiIcon: "fa-gift",
            uiButtonText: "🎁 Apply 50% Coupon",
            uiSecondaryButton: "📞 Contact Support"
        };
    } else if (normalizedScore < 0.7) {
        // CASE: Ambiguous / Neutral
        return {
            actionCode: "REQUEST_FEEDBACK",
            uiMessage: "Thank you! Could you tell us how we can improve?",
            uiColor: "#6b7280", // Gray
            uiIcon: "fa-comment-dots",
            uiButtonText: "📝 Take Survey",
            uiSecondaryButton: null
        };
    } else {
        // CASE: Happy Customer
        return {
            actionCode: "ASK_REFERRAL",
            uiMessage: "Glad you liked it! Refer a friend and earn rewards.",
            uiColor: "#3b82f6", // Blue
            uiIcon: "fa-user-friends",
            uiButtonText: "⭐ Refer a Friend",
            uiSecondaryButton: "⭐ Leave a Review"
        };
    }
}

// Display sentiment result
function displaySentiment(result) {
    // Default to neutral if we can't parse the result
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';

    // Parse the API response (format: [[{label: 'POSITIVE', score: 0.99}]])
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && result[0].length > 0) {
        const sentimentData = result[0][0];
        label = sentimentData.label?.toUpperCase() || 'NEUTRAL';
        score = sentimentData.score ?? 0.5;

        // Determine sentiment
        if (label === 'POSITIVE' && score > 0.5) {
            sentiment = 'positive';
        } else if (label === 'NEGATIVE' && score > 0.5) {
            sentiment = 'negative';
        }
    }

    // Update UI
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;
}

// Get appropriate icon for sentiment
function getSentimentIcon(sentiment) {
    switch (sentiment) {
        case 'positive':
            return 'fa-thumbs-up';
        case 'negative':
            return 'fa-thumbs-down';
        default:
            return 'fa-question-circle';
    }
}

// Display business action in UI
function displayBusinessAction(decision, label, score) {
    actionResult.style.display = 'block';

    // Set appropriate class based on action
    actionResult.className = 'action-result';
    if (decision.actionCode === 'OFFER_COUPON') {
        actionResult.classList.add('action-offer-coupon');
    } else if (decision.actionCode === 'REQUEST_FEEDBACK') {
        actionResult.classList.add('action-request-feedback');
    } else if (decision.actionCode === 'ASK_REFERRAL') {
        actionResult.classList.add('action-ask-referral');
    }

    // Build button HTML
    let buttonsHTML = '';
    if (decision.actionCode === 'OFFER_COUPON') {
        buttonsHTML = `
            <button class="btn-primary" onclick="applyCoupon()">🎁 Apply 50% Coupon</button>
            <button class="btn-secondary" onclick="contactSupport()">📞 Contact Support</button>
        `;
    } else if (decision.actionCode === 'REQUEST_FEEDBACK') {
        buttonsHTML = `
            <button class="btn-primary" onclick="openSurvey()">📝 Take Survey</button>
        `;
    } else if (decision.actionCode === 'ASK_REFERRAL') {
        buttonsHTML = `
            <button class="btn-primary" onclick="shareReferral()">⭐ Refer a Friend</button>
            <button class="btn-secondary" onclick="leaveReview()">⭐ Leave a Review</button>
        `;
    }

    // Render action UI
    actionResult.innerHTML = `
        <div class="action-header">
            <i class="fas ${decision.uiIcon}"></i>
            <h3>🤖 System Decision: ${decision.actionCode.replace('_', ' ')}</h3>
        </div>
        <div class="action-content" style="background-color: ${decision.uiColor}20; border-left-color: ${decision.uiColor};">
            <p><strong>Action:</strong> ${decision.uiMessage}</p>
            <p><small>Normalized Score: ${(getNormalizedScore(score, label) * 100).toFixed(1)}%</small></p>
        </div>
        <div class="action-buttons">
            ${buttonsHTML}
        </div>
    `;
}

// Get appropriate icon for sentiment
function getSentimentIcon(sentiment) {
    switch (sentiment) {
        case 'positive':
            return 'fa-thumbs-up';
        case 'negative':
            return 'fa-thumbs-down';
        default:
            return 'fa-question-circle';
    }
}

// Calculate normalized score for display
function getNormalizedScore(confidence, label) {
    if (label === "POSITIVE") {
        return confidence;
    } else if (label === "NEGATIVE") {
        return 1.0 - confidence;
    }
    return 0.5;
}

// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}

// ============================================
// BUTTON EVENT HANDLERS
// ============================================

function applyCoupon() {
    alert('🎁 Coupon applied! Use code: SAVE50 at checkout.');
    logUserAction('coupon_applied');
}

function contactSupport() {
    window.open('mailto:support@example.com?subject=Customer Support Request', '_blank');
    logUserAction('contact_support');
}

function openSurvey() {
    window.open('https://forms.example.com/feedback', '_blank');
    logUserAction('survey_opened');
}

function shareReferral() {
    const shareText = 'Check out this amazing product! Use my link: https://example.com/referral';
    navigator.clipboard.writeText(shareText).then(() => {
        alert('🔗 Referral link copied to clipboard!');
    });
    logUserAction('referral_shared');
}

function leaveReview() {
    window.open('https://reviews.example.com', '_blank');
    logUserAction('review_requested');
}

function logUserAction(actionType) {
    console.log(`User action: ${actionType}`);
    // Optional: Send to analytics service
}

// ============================================
// GOOGLE SHEETS LOGGING
// ============================================

async function logToGoogleSheet(review, label, confidence, actionCode) {
    const logData = {
        timestamp: new Date().toISOString(),
        review: review || '',
        sentiment: label,
        confidence: confidence,
        action_taken: actionCode,
        meta: {
            model: "siebert/sentiment-roberta-large-english",
            normalizedScore: getNormalizedScore(confidence, label)
        }
    };

    try {
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('https://script.google.com/macros/s/AKfycbxy6IlGdwB9cphL1zgUtXS9td2ABg5aGA5EHMuKdzuL8sGeLnpQQ0ZP9HCct7SOxKXwDg/exec')) {
            console.warn('⚠️ Google Sheets URL not configured. Skipping log.');
            return;
        }

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        });

        if (response.ok) {
            console.log('✅ Logged to Google Sheets:', actionCode);
        } else {
            console.warn('⚠️ Logging failed:', await response.text());
        }
    } catch (error) {
        console.error('❌ Logging error:', error);
    }
}
