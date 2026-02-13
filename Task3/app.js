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

// Normalize sentiment score to 0.0–1.0 scale
function normalizeSentiment(label, confidence) {
    if (label === 'POSITIVE') {
        return confidence;
    } else if (label === 'NEGATIVE') {
        return 1.0 - confidence;
    }
    return 0.5; // Default neutral
}

// Determine business action based on normalized score
function determineBusinessAction(normalizedScore) {
    if (normalizedScore <= 0.4) {
        return {
            actionCode: 'OFFER_COUPON',
            uiMessage: 'We are truly sorry. Please accept this 50% discount coupon.',
            uiColor: '#ef4444'
        };
    } else if (normalizedScore < 0.7) {
        return {
            actionCode: 'REQUEST_FEEDBACK',
            uiMessage: 'Thank you! Could you tell us how we can improve?',
            uiColor: '#6b7280'
        };
    } else {
        return {
            actionCode: 'ASK_REFERRAL',
            uiMessage: 'Glad you liked it! Refer a friend and earn rewards.',
            uiColor: '#3b82f6'
        };
    }
}

// Display business action UI
function displayBusinessAction(action) {
    const actionResult = document.getElementById('action-result');
    if (!actionResult) return;

    actionResult.style.display = 'block';
    actionResult.style.backgroundColor = action.uiColor;
    actionResult.style.color = '#ffffff';
    actionResult.innerHTML = `
        <strong>Action:</strong> ${action.uiMessage}
        <div class="action-buttons">
            ${action.actionCode === 'OFFER_COUPON' ?
            '<button class="coupon-btn">Generate 50% Off Coupon</button>' : ''}
            ${action.actionCode === 'REQUEST_FEEDBACK' ?
            '<button class="feedback-btn">Open Survey</button>' : ''}
            ${action.actionCode === 'ASK_REFERRAL' ?
            '<button class="referral-btn">Refer a Friend</button>' : ''}
        </div>
    `;
}

// Display sentiment result
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

    // Normalize score and determine business action
    const normalizedScore = normalizeSentiment(label, score);
    const businessAction = determineBusinessAction(normalizedScore);

    // Update UI
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;

    // Display business action
    displayBusinessAction(businessAction);
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

// Show error message
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    errorElement.style.display = 'none';
}
