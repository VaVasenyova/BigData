// ============================================
// CONFIGURATION
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydsl44mz2f-go78SmYOVBGx9EPMub285Xo1EHRZoW-HdUQ-ary4FBgxOIRmPyhhZf48g/exec';
const DATA_FILE = 'reviews_test.tsv';

// FORCE MOCK MODE - Hugging Face API doesn't allow direct browser requests from GitHub Pages
const USE_MOCK_API = true;

// Mock sentiment responses
const MOCK_SENTIMENTS = [
    { label: 'POSITIVE', score: 0.95 },
    { label: 'NEGATIVE', score: 0.92 },
    { label: 'NEUTRAL', score: 0.65 },
    { label: 'POSITIVE', score: 0.88 },
    { label: 'NEGATIVE', score: 0.76 },
    { label: 'POSITIVE', score: 0.91 },
    { label: 'NEGATIVE', score: 0.85 },
    { label: 'NEUTRAL', score: 0.58 }
];

// ============================================
// STATE MANAGEMENT
// ============================================
let reviews = [];
let startTime = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Show mock mode warning
    document.getElementById('env-warning').style.display = 'block';
    document.querySelector('.section-title').innerHTML += ' <span class="mock-mode-badge">MOCK MODE</span>';

    // Load reviews
    await loadReviews();

    // Setup event listeners
    document.getElementById('analyze-btn').addEventListener('click', analyzeRandomReview);
});

// ============================================
// DATA LOADING
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
            throw new Error('No valid reviews found');
        }

        console.log(`✓ Loaded ${reviews.length} reviews`);
        return true;
    } catch (error) {
        console.error('Failed to load reviews:', error);
        showError(
            'Failed to load reviews',
            [
                `Error: ${error.message}`,
                'Make sure reviews_test.tsv exists in the same folder',
                'Check browser console (F12) for details'
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
// ANALYSIS FUNCTION
// ============================================
async function analyzeRandomReview() {
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

        // Get mock sentiment (simulated API call)
        const sentimentResult = await getMockSentiment();

        // Determine business action
        const actionData = determineBusinessAction(sentimentResult);

        // Display results
        displaySentiment(sentimentResult);
        displayBusinessAction(actionData);

        // Log to Google Sheets
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
                '💡 Running in mock mode (simulated AI responses)',
                '💡 Check browser console (F12) for technical details'
            ]
        );
    } finally {
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('loading').style.display = 'none';
    }
}

// ============================================
// MOCK API (Simulates Hugging Face)
// ============================================
function getMockSentiment() {
    return new Promise(resolve => {
        // Simulate network delay (800ms)
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * MOCK_SENTIMENTS.length);
            resolve(MOCK_SENTIMENTS[randomIndex]);
        }, 800);
    });
}

// ============================================
// BUSINESS LOGIC: SENTIMENT → ACTION
// ============================================
function determineBusinessAction(sentiment) {
    const { label, score } = sentiment;

    // Decision Matrix
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
            ${label} <span style="font-size:0.7em; color:#aaa;">(simulated)</span>
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
        <span style="font-size:0.8em; opacity:0.8; margin-left:8px;">(simulated decision)</span>
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
// GOOGLE SHEETS LOGGING
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
                model: 'mock-sentiment-simulator',
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                mockMode: true
            },
            action_taken: actionData.action
        };

        console.log('Logging to Google Sheets:', logData);

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
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
