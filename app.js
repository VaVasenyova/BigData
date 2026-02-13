// ============================================
// CONFIGURATION - REPLACE WITH YOUR URL AFTER DEPLOYMENT
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydsl44mz2f-go78SmYOVBGx9EPMub285Xo1EHRZoW-HdUQ-ary4FBgxOIRmPyhhZf48g/exec'; // ← MUST REPLACE
const DATA_FILE = 'reviews_test.tsv';
const USE_MOCK_API = !localStorage.getItem('huggingface_api_token') ||
    localStorage.getItem('huggingface_api_token') === '';

// Mock sentiment responses for testing without API token
const MOCK_SENTIMENTS = [
    { label: 'POSITIVE', score: 0.95 },
    { label: 'NEGATIVE', score: 0.92 },
    { label: 'NEUTRAL', score: 0.65 },
    { label: 'POSITIVE', score: 0.88 },
    { label: 'NEGATIVE', score: 0.76 }
];

// ============================================
// STATE MANAGEMENT
// ============================================
let reviews = [];
let apiToken = localStorage.getItem('huggingface_api_token') || '';
let startTime = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Show mock mode warning
    if (USE_MOCK_API) {
        document.getElementById('env-warning').style.display = 'block';
        document.querySelector('.section-title i.fa-key').parentNode.innerHTML +=
            ' <span class="mock-mode-badge">MOCK MODE</span>';
    }

    // Load token into input field
    if (apiToken) {
        document.getElementById('api-token').value = apiToken;
    }

    // Load reviews
    await loadReviews();

    // Setup event listeners
    document.getElementById('api-token').addEventListener('input', handleTokenInput);
    document.getElementById('analyze-btn').addEventListener('click', analyzeRandomReview);
});

// ============================================
// DATA LOADING WITH ERROR HANDLING
// ============================================
async function loadReviews() {
    try {
        console.log('Loading reviews from:', DATA_FILE);
        const response = await fetch(DATA_FILE);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const tsvText = await response.text();
        reviews = parseTSV(tsvText);

        if (reviews.length === 0) {
            throw new Error('No valid reviews found in TSV file');
        }

        console.log(`✓ Loaded ${reviews.length} reviews`);
        return true;
    } catch (error) {
        console.error('Failed to load reviews:', error);
        showError(
            'Failed to load reviews',
            [
                `File: ${DATA_FILE}`,
                `Error: ${error.message}`,
                '✅ Make sure file exists in same folder as index.html',
                '✅ Run from local server (not file:// protocol)'
            ]
        );
        return false;
    }
}

function parseTSV(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.length > 5);
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleTokenInput(e) {
    const token = e.target.value.trim();
    if (token) {
        localStorage.setItem('huggingface_api_token', token);
        apiToken = token;
        location.reload(); // Reload to switch out of mock mode
    } else {
        localStorage.removeItem('huggingface_api_token');
        apiToken = '';
    }
}

async function analyzeRandomReview() {
    // Validate reviews loaded
    if (reviews.length === 0) {
        const success = await loadReviews();
        if (!success) return;
    }

    // UI State: Loading
    document.getElementById('analyze-btn').disabled = true;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error-message').classList.remove('show');
    document.getElementById('action-badge').classList.remove('show');
    document.getElementById('dynamic-message').classList.remove('show');
    document.getElementById('action-details').classList.remove('show');

    try {
        // Select random review
        const randomIndex = Math.floor(Math.random() * reviews.length);
        const reviewText = reviews[randomIndex];
        document.getElementById('review-text').textContent = `"${reviewText}"`;

        console.log(`Analyzing review #${randomIndex + 1}: "${reviewText.substring(0, 50)}..."`);

        // Start timer
        startTime = Date.now();

        // Call API (real or mock)
        const sentimentResult = USE_MOCK_API
            ? getMockSentiment()
            : await callHuggingFaceAPI(reviewText);

        // Determine business action
        const actionData = determineBusinessAction(sentimentResult);

        // Display results
        displaySentiment(sentimentResult);
        displayBusinessAction(actionData);

        // Log to Google Sheets (skip if URL not configured)
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
            await logToGoogleSheets(reviewText, sentimentResult, actionData);
        } else {
            console.warn('Google Sheets logging skipped: URL not configured');
        }

        console.log('✓ Analysis complete:', actionData.action);

    } catch (error) {
        console.error('Analysis error:', error);
        showError(
            'Analysis failed',
            [
                `Error: ${error.message || 'Unknown error'}`,
                USE_MOCK_API
                    ? '💡 Running in mock mode - real API requires token'
                    : '💡 Check: API token valid? Running from http://localhost?',
                '💡 Open browser console (F12) for technical details'
            ]
        );
    } finally {
        // UI State: Done
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('loading').style.display = 'none';
    }
}

// ============================================
// API INTEGRATION (REAL + MOCK)
// ============================================
async function callHuggingFaceAPI(text) {
    if (!apiToken) {
        throw new Error('No API token provided. Enter token or use mock mode.');
    }

    console.log('Calling Hugging Face API...');

    const response = await fetch('https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
    });

    if (!response.ok) {
        let errorMsg = `API error ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg += `: ${JSON.stringify(errorData)}`;
        } catch (e) {
            errorMsg += `: ${await response.text()}`;
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    return parseSentimentResult(data);
}

function getMockSentiment() {
    // Simulate network delay
    return new Promise(resolve => {
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * MOCK_SENTIMENTS.length);
            resolve(MOCK_SENTIMENTS[randomIndex]);
        }, 800);
    });
}

function parseSentimentResult(apiResponse) {
    if (Array.isArray(apiResponse) && apiResponse.length > 0 &&
        apiResponse[0].label && apiResponse[0].score) {
        return {
            label: apiResponse[0].label.toUpperCase(),
            score: apiResponse[0].score
        };
    }
    throw new Error('Unexpected API response format: ' + JSON.stringify(apiResponse));
}

// ============================================
// BUSINESS LOGIC: SENTIMENT → ACTION
// ============================================
function determineBusinessAction(sentiment) {
    const { label, score } = sentiment;

    // Decision Matrix - FIXED SYNTAX (&& not & &)
    if (label === 'NEGATIVE' && score > 0.7) {
        return {
            action: 'OFFER_COUPON',
            message: 'We sincerely apologize for your experience. As a gesture of goodwill, here\'s a 20% discount on your next purchase.',
            icon: 'fa-gift',
            tone: 'negative',
            trigger: 'High-confidence negative review',
            recommendation: 'Offer coupon to retain customer and rebuild trust',
            score: score
        };
    } else if (label === 'NEGATIVE' && score <= 0.7) {
        return {
            action: 'FLAG_FOR_REVIEW',
            message: 'We\'re sorry to hear about your experience. Our customer success team will reach out to you shortly to address your concerns.',
            icon: 'fa-flag',
            tone: 'negative',
            trigger: 'Low-confidence negative review',
            recommendation: 'Manual review needed for ambiguous feedback',
            score: score
        };
    } else if (label === 'POSITIVE' && score > 0.7) {
        return {
            action: 'THANK_CUSTOMER',
            message: 'Thank you for your wonderful feedback! We\'re thrilled you love our product. Check out our premium collection for exclusive offers.',
            icon: 'fa-star',
            tone: 'positive',
            trigger: 'High-confidence positive review',
            recommendation: 'Thank customer and suggest upsell opportunity',
            score: score
        };
    } else if (label === 'POSITIVE' && score <= 0.7) {
        return {
            action: 'NO_ACTION',
            message: 'Thank you for your feedback! We appreciate you taking the time to share your thoughts.',
            icon: 'fa-check-circle',
            tone: 'positive',
            trigger: 'Low-confidence positive review',
            recommendation: 'Acknowledge feedback, no special action required',
            score: score
        };
    } else if (label === 'NEUTRAL') {
        return {
            action: 'NO_ACTION',
            message: 'We appreciate your input! Your feedback helps us improve our products and services.',
            icon: 'fa-info-circle',
            tone: 'neutral',
            trigger: 'Neutral sentiment',
            recommendation: 'No intervention needed',
            score: score
        };
    } else {
        return {
            action: 'NO_ACTION',
            message: 'Thank you for your feedback!',
            icon: 'fa-comment',
            tone: 'info',
            trigger: 'Unknown sentiment',
            recommendation: 'Default acknowledgment',
            score: score
        };
    }
}

// ============================================
// UI DISPLAY FUNCTIONS
// ============================================
function displaySentiment(result) {
    const { label, score } = result;
    const sentimentDiv = document.getElementById('sentiment-result');
    const confidencePercent = (score * 100).toFixed(1);

    let sentimentClass = 'neutral';
    let sentimentIcon = 'fa-question-circle';
    let sentimentColor = '#ffc107';

    if (label === 'POSITIVE') {
        sentimentClass = 'positive';
        sentimentIcon = 'fa-thumbs-up';
        sentimentColor = '#28a745';
    } else if (label === 'NEGATIVE') {
        sentimentClass = 'negative';
        sentimentIcon = 'fa-thumbs-down';
        sentimentColor = '#dc3545';
    }

    sentimentDiv.innerHTML = `
        <div class="sentiment-icon">
            <i class="fas ${sentimentIcon}" style="color: ${sentimentColor};"></i>
        </div>
        <div class="sentiment-label">
            ${label} ${USE_MOCK_API ? '<span style="font-size:0.7em; color:#aaa;">(mock)</span>' : ''}
        </div>
        <div class="sentiment-confidence">
            ${confidencePercent}% confidence
        </div>
    `;

    sentimentDiv.className = `sentiment ${sentimentClass}`;
}

function displayBusinessAction(actionData) {
    const { action, message, icon, tone, trigger, recommendation, score } = actionData;

    // Action Badge
    const badge = document.getElementById('action-badge');
    badge.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="action-type">${action.replace('_', ' ')}</span>
        ${USE_MOCK_API ? '<span style="font-size:0.8em; opacity:0.8; margin-left:8px;">(simulated)</span>' : ''}
    `;
    badge.classList.add('show');

    // Dynamic Message
    const messageDiv = document.getElementById('dynamic-message');
    messageDiv.innerHTML = `<p>${message}</p>`;
    messageDiv.className = `dynamic-message ${tone} show`;

    // Action Details
    document.getElementById('detail-sentiment').textContent = action;
    document.getElementById('detail-confidence').textContent = `${(score * 100).toFixed(1)}%`;
    document.getElementById('detail-trigger').textContent = trigger;
    document.getElementById('detail-recommendation').textContent = recommendation;
    document.getElementById('action-details').classList.add('show');
}

function showError(title, details = []) {
    document.getElementById('error-text').innerHTML = `<strong>${title}</strong>`;

    const detailsList = document.getElementById('error-details');
    detailsList.innerHTML = '';

    if (Array.isArray(details)) {
        details.forEach(detail => {
            const li = document.createElement('li');
            li.innerHTML = detail;
            detailsList.appendChild(li);
        });
    }

    document.getElementById('error-message').classList.add('show');
}

// ============================================
// GOOGLE SHEETS LOGGING (CORS-SAFE)
// ============================================
async function logToGoogleSheets(review, sentiment, actionData) {
    try {
        const logData = {
            review: review,
            sentiment: {
                label: sentiment.label,
                score: sentiment.score
            },
            meta: {
                model: USE_MOCK_API ? 'mock-sentiment' : 'siebert/sentiment-roberta-large-english',
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                mockMode: USE_MOCK_API
            },
            action_taken: actionData.action
        };

        console.log('Logging to Google Sheets:', logData);

        // Use POST with proper CORS handling
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', // Explicitly request CORS
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const textResponse = await response.text();
        if (textResponse.trim() !== 'OK') {
            console.warn('Google Sheets warning:', textResponse);
        }

        console.log('✓ Successfully logged to Google Sheets');
    } catch (error) {
        console.error('Google Sheets logging failed:', error);
        // Non-critical - don't show to user
    }
}