// Global variables
let reviews = [];
let apiToken = '';

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const actionResult = document.getElementById('action-result'); // NEW
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const apiTokenInput = document.getElementById('api-token');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
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

/**
 * Determines the appropriate business action based on sentiment analysis results.
 * 
 * Normalizes the AI output into a linear scale (0.0 to 1.0) to simplify
 * threshold comparisons.
 * 
 * @param {number} confidence - The confidence score returned by the API (0.0 to 1.0).
 * @param {string} label - The label returned by the API (e.g., "POSITIVE", "NEGATIVE").
 * @returns {object} An object containing the action metadata (code, message, color).
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
    actionResult.innerHTML = '';  // Reset action result
    actionResult.style.display = 'none';

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
    
    return { label, score, sentiment };
}

// Get appropriate icon for sentiment
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

// Display business action result
function displayAction(decision) {
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
                <h3 style="margin: 0 0 10px 0; font-size: 18px;">System Decision</h3>
                <p style="margin: 0; font-size: 16px;">${decision.uiMessage}</p>
            </div>
        </div>
        <div style="margin-top: 15px; text-align: center;">
            <a href="${decision.buttonLink}" 
               style="display: inline-block; padding: 10px 20px; background: white; 
                      color: ${decision.uiColor}; text-decoration: none; 
                      border-radius: 5px; font-weight: bold; border: 2px solid white;">
                ${decision.buttonText}
            </a>
        </div>
    `;
}

// Get emoji for action type
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

// Log data to Google Sheets via Apps Script
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

        // Replace with your actual Apps Script Web App URL
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwutXlICXZ4hKF9zU0BOpUZWz_zleOt0v19wYI3HoHju6ril9MIrZkVUcIrNZ8vsj7kzA/exec';
        
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData)
        });

        if (!response.ok) {
            console.warn('Failed to log to Google Sheets:', response.statusText);
        } else {
            console.log('Successfully logged to Google Sheets');
        }
    } catch (error) {
        console.warn('Error logging to Google Sheets:', error);
    }
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
