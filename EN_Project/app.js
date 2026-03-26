// Global variables
let currentCategory = '';
let currentCards = [];
let currentZodiacSign = null;
let currentNatalData = null;
let currentBirthInfo = {};
let hfApiKey = localStorage.getItem('hf_api_key') || '';

// DOM elements
let mainScreen, categoryScreen, spreadScreen, interpretationScreen;
let zodiacScreen, horoscopeScreen, natalInputScreen, natalChartScreen, dreamChatScreen;
let apiSettingsBtn, apiSettingsModal, apiKeyInput, saveApiKeyBtn, closeSettingsBtn;
let backToMainFromDream, sendDreamBtn, dreamInput, chatMessages;
let isDreamChatLoading = false;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    mainScreen = document.getElementById('mainScreen');
    categoryScreen = document.getElementById('categoryScreen');
    spreadScreen = document.getElementById('spreadScreen');
    interpretationScreen = document.getElementById('interpretationScreen');
    zodiacScreen = document.getElementById('zodiacScreen');
    horoscopeScreen = document.getElementById('horoscopeScreen');
    natalInputScreen = document.getElementById('natalInputScreen');
    natalChartScreen = document.getElementById('natalChartScreen');
    dreamChatScreen = document.getElementById('dreamChatScreen');
    apiSettingsBtn = document.getElementById('apiSettingsBtn');
    apiSettingsModal = document.getElementById('apiSettingsModal');
    apiKeyInput = document.getElementById('apiKeyInput');
    saveApiKeyBtn = document.getElementById('saveApiKey');
    closeSettingsBtn = document.getElementById('closeSettings');
    backToMainFromDream = document.getElementById('backToMainFromDream');
    sendDreamBtn = document.getElementById('sendDreamBtn');
    dreamInput = document.getElementById('dreamInput');
    chatMessages = document.getElementById('chatMessages');

    // Main screen - section selection
    document.querySelectorAll('.main-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const option = e.currentTarget.dataset.option;
            if (option === 'tarot') showScreen('category');
            else if (option === 'horoscope') showZodiacScreen();
            else if (option === 'natal') showScreen('natalInput');
            else if (option === 'dream') showDreamChat();
        });
    });

    // Tarot - category selection
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            startSpread(e.currentTarget.dataset.category);
        });
    });

    // Navigation
    const backToMainFromTarot = document.getElementById('backToMainFromTarot');
    const backToMainFromHoroscope = document.getElementById('backToMainFromHoroscope');
    const backToMainFromNatal = document.getElementById('backToMainFromNatal');
    const newSpreadBtn = document.getElementById('newSpreadBtn');
    const newHoroscopeBtn = document.getElementById('newHoroscopeBtn');
    const newNatalBtn = document.getElementById('newNatalBtn');
    const revealBtn = document.getElementById('revealBtn');
    const calculateNatalBtn = document.getElementById('calculateNatalBtn');

    if (backToMainFromTarot) backToMainFromTarot.addEventListener('click', () => showScreen('main'));
    if (backToMainFromHoroscope) backToMainFromHoroscope.addEventListener('click', () => showScreen('main'));
    if (backToMainFromNatal) backToMainFromNatal.addEventListener('click', () => showScreen('main'));
    if (backToMainFromDream) backToMainFromDream.addEventListener('click', () => showScreen('main'));
    if (newSpreadBtn) newSpreadBtn.addEventListener('click', () => showScreen('category'));
    if (newHoroscopeBtn) newHoroscopeBtn.addEventListener('click', () => showZodiacScreen());
    if (newNatalBtn) newNatalBtn.addEventListener('click', () => showScreen('natalInput'));
    if (revealBtn) revealBtn.addEventListener('click', revealCards);
    if (calculateNatalBtn) calculateNatalBtn.addEventListener('click', calculateNatalChartHandler);

    // Dream chat
    if (sendDreamBtn) sendDreamBtn.addEventListener('click', sendDreamMessage);
    if (dreamInput) {
        dreamInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendDreamMessage();
            }
        });
    }

    // API Settings
    if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', showAPISettings);
    if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
        if (apiSettingsModal) apiSettingsModal.classList.remove('active');
    });

    // Close modal when clicking outside
    if (apiSettingsModal) {
        apiSettingsModal.addEventListener('click', (e) => {
            if (e.target === apiSettingsModal) {
                apiSettingsModal.classList.remove('active');
            }
        });
    }

    initZodiacGrid();

    if (!hfApiKey) {
        console.log('💡 App works without API key (local interpretation)');
        console.log('🔑 For AI interpretations, add Hugging Face API key in settings (⚙️)');
    }
});

function showAPISettings() {
    if (apiKeyInput) apiKeyInput.value = hfApiKey;
    if (apiSettingsModal) apiSettingsModal.classList.add('active');
}

function saveApiKey() {
    if (apiKeyInput) {
        hfApiKey = apiKeyInput.value.trim();
        localStorage.setItem('hf_api_key', hfApiKey);
        if (apiSettingsModal) apiSettingsModal.classList.remove('active');
        if (hfApiKey) {
            alert('✅ API key saved! AI interpretations will now work via Hugging Face.');
        } else {
            alert('⚠️ API key removed. Interpretations will work in basic mode.');
        }
    }
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const screens = {
        'main': mainScreen,
        'category': categoryScreen,
        'spread': spreadScreen,
        'interpretation': interpretationScreen,
        'zodiac': zodiacScreen,
        'horoscope': horoscopeScreen,
        'natalInput': natalInputScreen,
        'natalChart': natalChartScreen,
        'dreamChat': dreamChatScreen
    };
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

function showDreamChat() {
    showScreen('dreamChat');
    if (dreamInput) setTimeout(() => dreamInput.focus(), 300);
}

function fillDreamHint(text) {
    if (dreamInput) {
        dreamInput.value = text;
        dreamInput.focus();
    }
}

function initZodiacGrid() {
    const grid = document.getElementById('zodiacGrid');
    if (!grid) return;

    grid.innerHTML = zodiacSigns.map(sign => `
        <button class="zodiac-sign-btn" data-sign="${sign.id}">
            <div class="zodiac-symbol-large">${sign.symbol}</div>
            <div class="zodiac-name-small">${sign.name}</div>
            <div class="zodiac-dates">${sign.dates}</div>
        </button>
    `).join('');

    grid.querySelectorAll('.zodiac-sign-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            generateHoroscope(e.currentTarget.dataset.sign);
        });
    });
}

function showZodiacScreen() {
    showScreen('zodiac');
}

function startSpread(category) {
    currentCategory = category;
    currentCards = getRandomCards(3);
    const categoryTitle = document.getElementById('categoryTitle');
    if (categoryTitle) categoryTitle.textContent = `Reading: ${categoryTranslations[category]}`;
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.innerHTML = '<div class="card-back"></div>';
    });
    showScreen('spread');
}

function revealCards() {
    const cardSlots = document.querySelectorAll('.card-slot');
    cardSlots.forEach((slot, index) => {
        setTimeout(() => {
            const card = currentCards[index];
            const imageUrl = getCardImageUrl(card.id);
            slot.innerHTML = `
                <div class="card-front">
                    <img src="${imageUrl}" alt="${card.name}" class="card-image" 
                         onerror="this.src='https://www.sacred-texts.com/tarot/pkt/img/ar00.jpg'">
                    <div class="card-name">${card.name}</div>
                    <div style="font-size: 0.8em; color: #666; margin-top: 5px;">${card.keywords[0]}</div>
                </div>
            `;
        }, index * 300);
    });
    setTimeout(() => getAIInterpretation(), 1000);
}

// 🔥 NEW FUNCTION: Check and continue text if cut off
async function fetchWithContinuation(messages, model, maxTokens = 4000) {
    try {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messages,
                model: model,
                stream: false,
                temperature: 0.1,
                max_tokens: maxTokens,
                top_p: 0.9
            })
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Invalid API key');
            if (response.status === 404) throw new Error('Model not available');
            if (response.status === 429) throw new Error('Too many requests');
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        let content = result.choices?.[0]?.message?.content || '';

        // 🔥 Check if text was cut off
        const lastChar = content.trim().slice(-1);
        const endsProperly = ['.', '!', '?', '\n', 's', 'y', 'e', 'i', 'o', 'a', 'u', ')', '"', '»'].includes(lastChar);

        // If text was cut off and it's long enough — request continuation
        if (!endsProperly && content.length > 200) {
            console.log('⚠️ Text was cut off, requesting continuation...');
            const continuationMessages = [
                { role: 'system', content: 'You are a professional astrologer/tarot reader. Continue the previous response from where it was cut off. Do not repeat what was already written.' },
                { role: 'user', content: `Continue this text that was cut off: "${content.slice(-200)}"... Write only the continuation, without introductions.` }
            ];

            const continuationResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${hfApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: continuationMessages,
                    model: model,
                    stream: false,
                    temperature: 0.1,
                    max_tokens: 2000,
                    top_p: 0.9
                })
            });

            if (continuationResponse.ok) {
                const continuationResult = await continuationResponse.json();
                if (continuationResult.choices?.[0]?.message?.content) {
                    content += '\n\n' + continuationResult.choices[0].message.content;
                }
            }
        }

        return content;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function getAIInterpretation() {
    const loading = document.getElementById('loadingTarot');
    const loadingText = document.getElementById('loadingText');
    const interpretationDiv = document.getElementById('aiInterpretation');

    if (loading) loading.style.display = 'block';
    if (interpretationDiv) interpretationDiv.innerHTML = '';
    showScreen('interpretation');

    const cardsDisplay = document.getElementById('cardsDisplay');
    if (cardsDisplay) {
        cardsDisplay.innerHTML = currentCards.map(card => {
            const imageUrl = getCardImageUrl(card.id);
            return `
                <div class="card-info">
                    <img src="${imageUrl}" alt="${card.name}" class="card-image-small" 
                         onerror="this.src='https://www.sacred-texts.com/tarot/pkt/img/ar00.jpg'">
                    <div class="card-name">${card.name}</div>
                </div>
            `;
        }).join('');
    }

    const loadingMessages = [
        'AI is analyzing your spread...',
        'Connecting card meanings...',
        'Generating personalized interpretation...',
        'Almost ready...'
    ];

    for (let i = 0; i < loadingMessages.length; i++) {
        if (loadingText) loadingText.textContent = loadingMessages[i];
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
        let interpretation;
        if (hfApiKey) {
            interpretation = await callHuggingFaceAPI();
        } else {
            interpretation = generateSmartInterpretation();
            interpretation += '\n\n---\n\n💡 **Tip:** Add Hugging Face API key in settings (⚙️) for AI interpretation!';
        }
        if (loading) loading.style.display = 'none';
        if (interpretationDiv) await typeWriterEffect(interpretationDiv, interpretation);
        saveToHistory('tarot', currentCategory, currentCards, interpretation);
    } catch (error) {
        console.error('AI Error:', error);
        if (loading) loading.style.display = 'none';
        const fallbackInterpretation = generateSmartInterpretation();
        if (interpretationDiv) await typeWriterEffect(interpretationDiv, fallbackInterpretation);
        saveToHistory('tarot', currentCategory, currentCards, fallbackInterpretation);
    }
}

async function callHuggingFaceAPI() {
    const categoryName = categoryTranslations[currentCategory];
    const cardsInfo = currentCards.map((card, index) => {
        return `${index + 1}. ${card.name} - ${card.meaning}`;
    }).join('\n\n');

    const prompt = `You are a professional tarot reader. Give an interpretation for a reading on the topic "${categoryName}".
Cards:
${cardsInfo}
Give a DETAILED interpretation in English (400-600 words). Write until the end, DO NOT CUT OFF the text.`;

    const messages = [
        { role: 'system', content: 'You are a professional tarot reader. Write complete answers.' },
        { role: 'user', content: prompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 4000);
}

async function generateHoroscope(signId) {
    currentZodiacSign = getZodiacSignById(signId);
    const zodiacSymbol = document.getElementById('zodiacSymbol');
    const zodiacName = document.getElementById('zodiacName');
    if (zodiacSymbol) zodiacSymbol.textContent = currentZodiacSign.symbol;
    if (zodiacName) zodiacName.textContent = currentZodiacSign.name;

    const loading = document.getElementById('loadingHoroscope');
    const loadingText = document.getElementById('loadingHoroscopeText');
    const contentDiv = document.getElementById('horoscopeContent');
    if (loading) loading.style.display = 'block';
    if (contentDiv) contentDiv.innerHTML = '';
    showScreen('horoscope');

    const loadingMessages = ['AI is analyzing the stars...', 'Preparing your forecast...', 'Almost ready...'];
    for (let i = 0; i < loadingMessages.length; i++) {
        if (loadingText) loadingText.textContent = loadingMessages[i];
        await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
        let horoscope;
        if (hfApiKey) {
            horoscope = await interpretHoroscopeWithAI(currentZodiacSign);
        } else {
            horoscope = generateSmartHoroscope();
            horoscope += '\n\n---\n\n💡 Add API key for AI horoscope!';
        }
        if (loading) loading.style.display = 'none';
        if (contentDiv) await typeWriterEffect(contentDiv, horoscope);
        saveToHistory('horoscope', currentZodiacSign.name, null, horoscope);
    } catch (error) {
        console.error('Horoscope AI Error:', error);
        if (loading) loading.style.display = 'none';
        const fallbackHoroscope = generateSmartHoroscope();
        if (contentDiv) await typeWriterEffect(contentDiv, fallbackHoroscope);
        saveToHistory('horoscope', currentZodiacSign.name, null, fallbackHoroscope);
    }
}

async function interpretHoroscopeWithAI(sign) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are a professional astrologer. Write a DETAILED horoscope in ENGLISH.
RULES:
1. Overall energy of the day
2. Forecast: career, love, health, finances
3. Specific recommendations
4. Write warmly, without fatalism
5. Length: 500-700 words
6. Write until the END, DO NOT CUT OFF the text!`;

    const userPrompt = `Horoscope for ${today} for ${sign.name}. Element: ${sign.element}, Ruling Planet: ${sign.planet}.
Give a DETAILED forecast, write until the very end.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 4000);
}

function generateSmartHoroscope() {
    const sign = currentZodiacSign;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `♈ **${sign.name}** (${sign.dates})\n\n🌟 **Forecast for ${today}**\n\nA favorable day for important decisions. Trust your intuition!\n\n✨ *TarotMate*`;
}

// === NATAL CHART WITH CACHING ===

function createNatalCacheKey(birthInfo) {
    const data = `${birthInfo.birthDate}|${birthInfo.birthTime}|${birthInfo.birthCity}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `natal_cache_${Math.abs(hash)}`;
}

function getCachedInterpretation(cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        if (age < maxAge) {
            console.log('✅ Loaded from cache');
            return parsed.content;
        }
    }
    return null;
}

function saveCachedInterpretation(cacheKey, content) {
    const cacheData = { content: content, timestamp: Date.now(), version: '1.0' };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Saved to cache');
}

async function calculateNatalChartHandler() {
    const name = document.getElementById('birthName').value;
    const birthDate = document.getElementById('birthDate').value;
    const birthTime = document.getElementById('birthTime').value || '12:00';
    const birthCity = document.getElementById('birthCity').value;

    if (!birthDate) {
        alert('Please enter your date of birth');
        return;
    }

    currentBirthInfo = { name, birthDate, birthTime, birthCity };
    currentNatalData = calculateNatalChart(birthDate, birthTime);

    const cacheKey = createNatalCacheKey(currentBirthInfo);
    const cachedInterpretation = getCachedInterpretation(cacheKey);

    displayNatalChart();

    const loading = document.getElementById('loadingNatal');
    const loadingText = document.getElementById('loadingNatalText');
    const interpretationDiv = document.getElementById('natalInterpretation');

    if (loading) loading.style.display = 'block';
    if (interpretationDiv) interpretationDiv.innerHTML = '';
    showScreen('natalChart');

    if (cachedInterpretation) {
        const loadingMessages = ['Loading...', 'Found in cache...', 'Almost ready...'];
        for (let i = 0; i < loadingMessages.length; i++) {
            if (loadingText) loadingText.textContent = loadingMessages[i];
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (loading) loading.style.display = 'none';
        await typeWriterEffect(interpretationDiv, cachedInterpretation);
        saveToHistory('natal', `${name || 'User'}'s Natal Chart`, null, cachedInterpretation);
        return;
    }

    const loadingMessages = [
        'AI is analyzing your natal chart...',
        'Interpreting planet positions...',
        'Creating your astrological profile...',
        'Almost ready...'
    ];
    for (let i = 0; i < loadingMessages.length; i++) {
        if (loadingText) loadingText.textContent = loadingMessages[i];
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    try {
        let interpretation;
        if (hfApiKey) {
            interpretation = await interpretNatalChartWithAI();
            saveCachedInterpretation(cacheKey, interpretation);
        } else {
            interpretation = generateNatalInterpretation();
            interpretation += '\n\n---\n\n💡 **Tip:** Add Hugging Face API key in settings (⚙️) for detailed AI interpretation!';
            saveCachedInterpretation(cacheKey, interpretation);
        }
        if (loading) loading.style.display = 'none';
        if (interpretationDiv) await typeWriterEffect(interpretationDiv, interpretation);
        saveToHistory('natal', `${name || 'User'}'s Natal Chart`, null, interpretation);
    } catch (error) {
        console.error('Natal Chart AI Error:', error);
        if (loading) loading.style.display = 'none';
        const fallbackFromCache = getCachedInterpretation(cacheKey);
        if (fallbackFromCache) {
            await typeWriterEffect(interpretationDiv, fallbackFromCache);
            saveToHistory('natal', `${name || 'User'}'s Natal Chart`, null, fallbackFromCache);
        } else {
            const fallbackInterpretation = generateNatalInterpretation();
            await typeWriterEffect(interpretationDiv, fallbackInterpretation);
            saveToHistory('natal', `${name || 'User'}'s Natal Chart`, null, fallbackInterpretation);
        }
    }
}

async function interpretNatalChartWithAI() {
    const sunSign = currentNatalData.sunSign;
    const moonSign = currentNatalData.moonSign;
    const ascendant = currentNatalData.ascendant;
    const elementDist = getElementDistribution(currentNatalData);

    const planetsInfo = Object.values(currentNatalData.planets).map(planetData => {
        return `${planetData.planet.name}: ${planetData.zodiacSign.name} (${Math.floor(planetData.degreeInSign)}°)`;
    }).join('\n');

    const systemPrompt = `You are a professional astrologer with 20 years of experience in natal astrology. Your task is to create a DETAILED, personalized, and inspiring interpretation of a natal chart in ENGLISH.

RULES FOR INTERPRETATION:
1. Start with overall personality description (Sun + Ascendant + Moon)
2. Describe strengths and talents
3. Analyze element balance and what it means for character
4. Give recommendations for developing strengths
5. Point out growth areas and life challenges
6. Career and purpose — suitable fields
7. Relationships — suitable partner, relationship patterns
8. Write warmly, supportively, WITHOUT fatalism
9. Emphasize the person's uniqueness
10. Length: 900-1200 words
11. Write until the END, DO NOT CUT OFF the text!

Format response with headings (##), lists, and separators (---) for readability.`;

    const userPrompt = `Create a DETAILED interpretation of this natal chart:

📋 BIRTH DATA:
Date: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('en-US')}
Time: ${currentBirthInfo.birthTime}
${currentBirthInfo.birthCity ? `Location: ${currentBirthInfo.birthCity}` : ''}

☉ KEY POSITIONS:
• Sun: ${sunSign?.name || 'Unknown'} (personality, ego)
• Moon: ${moonSign?.name || 'Unknown'} (emotions, subconscious)
${ascendant?.sign ? `• Ascendant: ${ascendant.sign.name} (outer expression)` : ''}

🔥 ELEMENT BALANCE:
• Fire: ${elementDist['Fire']}, Earth: ${elementDist['Earth']}, Air: ${elementDist['Air']}, Water: ${elementDist['Water']}

🪙 PLANET POSITIONS:
${planetsInfo}

Give a DEEP astrological profile with practical recommendations for life, career, and relationships. Write in DETAIL, until the very end!`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 4000);
}

function displayNatalChart() {
    if (!currentNatalData) {
        console.error('Natal data is not calculated!');
        alert('Error: Natal chart data could not be calculated');
        return;
    }

    const natalUserInfo = document.getElementById('natalUserInfo');
    if (natalUserInfo) {
        natalUserInfo.innerHTML = `
            <div class="birth-info">
                <h3>${currentBirthInfo.name || 'Natal Chart'}</h3>
                <p>📅 ${new Date(currentBirthInfo.birthDate).toLocaleDateString('en-US')}</p>
                <p>🕐 ${currentBirthInfo.birthTime}</p>
                ${currentBirthInfo.birthCity ? `<p>📍 ${currentBirthInfo.birthCity}</p>` : ''}
            </div>
        `;
    }

    const wheel = document.getElementById('natalChartWheel');
    if (wheel) {
        wheel.innerHTML = '<div class="wheel-title">Zodiac Wheel</div>';
        if (typeof zodiacSignsNatal !== 'undefined' && zodiacSignsNatal) {
            zodiacSignsNatal.forEach(sign => {
                const signDiv = document.createElement('div');
                signDiv.className = 'zodiac-segment';
                signDiv.innerHTML = `
                    <div class="zodiac-symbol-small">${sign.symbol || '♈'}</div>
                    <div class="zodiac-name-tiny">${sign.name || 'Unknown'}</div>
                `;
                wheel.appendChild(signDiv);
            });
        }
    }

    const planetsList = document.getElementById('planetsList');
    if (planetsList) {
        planetsList.innerHTML = '<h3>Planet Positions</h3>';
        if (currentNatalData.planets) {
            Object.values(currentNatalData.planets).forEach(planetData => {
                if (planetData && planetData.planet && planetData.zodiacSign) {
                    const planetDiv = document.createElement('div');
                    planetDiv.className = 'planet-position';
                    planetDiv.innerHTML = `
                        <div class="planet-symbol">${planetData.planet.symbol || '☉'}</div>
                        <div class="planet-info">
                            <div class="planet-name">${planetData.planet.name || 'Unknown'}</div>
                            <div class="planet-zodiac">
                                ${planetData.zodiacSign.symbol || '♈'}
                                ${planetData.zodiacSign.name || 'Unknown'}
                                ${Math.floor(planetData.degreeInSign || 0)}°
                            </div>
                        </div>
                    `;
                    planetsList.appendChild(planetDiv);
                }
            });
        }
    }

    if (currentNatalData.ascendant) {
        const planetsList2 = document.getElementById('planetsList');
        if (planetsList2) {
            const ascDiv = document.createElement('div');
            ascDiv.className = 'ascendant-highlight';
            ascDiv.innerHTML = `
                <h4>Ascendant (Rising Sign)</h4>
                <div class="ascendant-sign">
                    <span class="zodiac-symbol-large">${currentNatalData.ascendant.sign?.symbol || '♈'}</span>
                    <span>${currentNatalData.ascendant.sign?.name || 'Unknown'}</span>
                </div>
            `;
            planetsList2.appendChild(ascDiv);
        }
    }
}

function generateNatalInterpretation() {
    if (!currentNatalData || !currentNatalData.sunSign || !currentNatalData.moonSign) {
        return 'Error: Insufficient data for interpretation.';
    }

    const sunSign = currentNatalData.sunSign;
    const moonSign = currentNatalData.moonSign;
    const ascendant = currentNatalData.ascendant;
    const elementDist = getElementDistribution(currentNatalData);
    const dominantElement = Object.entries(elementDist).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    const sunInterpretations = {
        'Aries': 'You are a natural leader, full of energy and initiative.',
        'Taurus': 'You are reliable, practical, and value stability.',
        'Gemini': 'You are sociable, curious, and adaptable.',
        'Cancer': 'You are emotional, intuitive, and caring.',
        'Leo': 'You are charismatic, creative, and love being in the spotlight.',
        'Virgo': 'You are analytical, practical, and detail-oriented.',
        'Libra': 'You are diplomatic and value harmony and beauty.',
        'Scorpio': 'You are intense, passionate, and perceptive.',
        'Sagittarius': 'You are optimistic and love freedom and adventure.',
        'Capricorn': 'You are ambitious, disciplined, and practical.',
        'Aquarius': 'You are independent, innovative, and humanitarian.',
        'Pisces': 'You are sensitive, intuitive, and spiritual.'
    };

    let interpretation = `🌟 **NATAL CHART**\n\n`;
    if (currentBirthInfo.name) interpretation += `For: ${currentBirthInfo.name}\n`;
    interpretation += `Date: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('en-US')}\n\n---\n\n`;
    interpretation += `☉ **SUN IN ${sunSign.name.toUpperCase()}**\n\n`;
    interpretation += `${sunInterpretations[sunSign.name] || 'Unique personality'}\n\n---\n\n`;
    interpretation += `☽ **MOON IN ${moonSign.name.toUpperCase()}**\n\n`;
    interpretation += `Deep emotional nature.\n\n---\n\n`;

    if (ascendant && ascendant.sign) {
        interpretation += `⬆️ **ASCENDANT IN ${ascendant.sign.name.toUpperCase()}**\n\n`;
        interpretation += `You make an impression of someone with qualities of ${ascendant.sign.name}.\n\n---\n\n`;
    }

    interpretation += `🔥 **ELEMENT BALANCE**\n\n`;
    interpretation += `• 🔥 Fire: ${elementDist['Fire']} planet(s)\n`;
    interpretation += `• 🌍 Earth: ${elementDist['Earth']} planet(s)\n`;
    interpretation += `• 💨 Air: ${elementDist['Air']} planet(s)\n`;
    interpretation += `• 💧 Water: ${elementDist['Water']} planet(s)\n\n`;
    interpretation += `**Dominant: ${dominantElement}**\n\n`;
    interpretation += `---\n\n✨ *Natal chart by TarotMate*`;

    return interpretation;
}

// === DREAM INTERPRETATION ===

function addMessageToChat(content, isUser = false) {
    if (!chatMessages) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${isUser ? '👤' : '🔮'}</div>
        <div class="message-content">${content}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    if (!chatMessages) return;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

async function sendDreamMessage() {
    if (!dreamInput || isDreamChatLoading) return;
    const dreamText = dreamInput.value.trim();
    if (!dreamText) return;

    addMessageToChat(dreamText, true);
    dreamInput.value = '';
    isDreamChatLoading = true;
    if (sendDreamBtn) sendDreamBtn.disabled = true;
    showTypingIndicator();

    try {
        let interpretation;
        if (hfApiKey) {
            interpretation = await interpretDreamWithAI(dreamText);
        } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
            interpretation = generateLocalDreamInterpretation(dreamText);
        }
        removeTypingIndicator();
        addMessageToChat(interpretation, false);
    } catch (error) {
        console.error('Dream AI Error:', error);
        removeTypingIndicator();
        const fallbackInterpretation = generateLocalDreamInterpretation(dreamText);
        addMessageToChat(`⚠️ *Temporary AI difficulty. Basic interpretation:*\n\n${fallbackInterpretation}`, false);
    } finally {
        isDreamChatLoading = false;
        if (sendDreamBtn) sendDreamBtn.disabled = false;
        if (dreamInput) dreamInput.focus();
    }
}

async function interpretDreamWithAI(dreamDescription) {
    const systemPrompt = `You are an experienced dream interpreter with deep knowledge of symbolism, psychology, and cultural traditions. Your task is to help a person understand the meaning of their dream in ENGLISH.

RULES:
1. Start with a brief summary: good/bad/neutral
2. Explain key symbols from the dream
3. Give a psychological interpretation: what this dream might mean
4. Offer a practical tip or reflection question
5. Write in ENGLISH, with a warm, supportive tone
6. Avoid fatalism and scary predictions
7. Emphasize that dreams reflect the inner world, not predict the future
8. Length: 300-500 words
9. Write until the END, DO NOT CUT OFF!`;

    const userPrompt = `Please help me understand the meaning of my dream:

"${dreamDescription}"

What could this mean? Write in DETAIL, until the end.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 3000);
}

function generateLocalDreamInterpretation(dreamText) {
    const lowerDream = dreamText.toLowerCase();
    const positiveWords = ['flying', 'light', 'joy', 'love', 'flowers', 'ocean', 'sun', 'smile'];
    const negativeWords = ['falling', 'darkness', 'fear', 'chase', 'loss', 'death', 'scream'];

    let tone = 'neutral';
    if (positiveWords.some(w => lowerDream.includes(w))) tone = 'positive';
    if (negativeWords.some(w => lowerDream.includes(w))) tone = 'needs attention';

    const symbols = [];
    if (lowerDream.includes('water') || lowerDream.includes('ocean')) symbols.push('💧 Water — emotions, subconscious');
    if (lowerDream.includes('fly') || lowerDream.includes('flying')) symbols.push('✈️ Flying — freedom, ambitions');
    if (lowerDream.includes('teeth')) symbols.push('🦷 Teeth — confidence, communication');
    if (lowerDream.includes('chase') || lowerDream.includes('running')) symbols.push('🏃 Chase — avoiding a problem');
    if (lowerDream.includes('house') || lowerDream.includes('home')) symbols.push('🏠 Home — your inner self');

    let interpretation = `🌙 **Dream Tone**: ${tone}\n\n`;
    if (symbols.length > 0) interpretation += `**Key Symbols**:\n${symbols.map(s => `• ${s}`).join('\n')}\n\n`;
    interpretation += `**What this might mean**: ${tone === 'positive' ? 'A good sign.' : tone === 'needs attention' ? 'Pay attention to inner tensions.' : 'Neutral information.'}\n\n`;
    interpretation += `**Question to reflect on**: What in your life needs attention right now?\n\n`;
    interpretation += `💡 **Tip**: Write down dream details in a journal.`;
    return interpretation;
}

// === GENERAL FUNCTIONS ===

function generateSmartInterpretation() {
    const [card1, card2, card3] = currentCards;
    const templates = {
        career: {
            title: "🔮 Career Reading",
            intro: `The cards speak of important processes in your professional sphere.`,
            card1: `**${card1.name}** — current situation: ${card1.meaning}.`,
            card2: `**${card2.name}** — challenges: ${card2.meaning}.`,
            card3: `**${card3.name}** — advice: ${card3.meaning}.`,
            advice: `**Recommendations:**\n• Trust your intuition\n• Don't be afraid to ask for help\n• Focus on long-term goals`
        },
        love: {
            title: "💖 Relationship Reading",
            intro: `Important changes are brewing in your relationships.`,
            card1: `**${card1.name}** — current energy: ${card1.meaning}.`,
            card2: `**${card2.name}** — hidden aspects: ${card2.meaning}.`,
            card3: `**${card3.name}** — path to harmony: ${card3.meaning}.`,
            advice: `**What to do:**\n• Be honest with yourself and your partner\n• Allow yourself to be vulnerable\n• Practice active listening`
        },
        money: {
            title: "💰 Financial Reading",
            intro: `Your financial sphere requires your attention.`,
            card1: `**${card1.name}** — situation: ${card1.meaning}.`,
            card2: `**${card2.name}** — warning: ${card2.meaning}.`,
            card3: `**${card3.name}** — strategy: ${card3.meaning}.`,
            advice: `**Practical steps:**\n• Analyze your expenses\n• Build a financial safety net\n• Invest in education`
        },
        general: {
            title: "🌟 General Reading",
            intro: `A holistic picture of your current life period.`,
            card1: `**${card1.name}** — your position: ${card1.meaning}.`,
            card2: `**${card2.name}** — challenge: ${card2.meaning}.`,
            card3: `**${card3.name}** — advice: ${card3.meaning}.`,
            advice: `**Directions:**\n• Practice mindfulness\n• Record your insights\n• Trust the process of life`
        }
    };

    const t = templates[currentCategory];
    return `${t.title}\n\n${t.intro}\n\n---\n\n${t.card1}\n\n${t.card2}\n\n${t.card3}\n\n---\n\n${t.advice}\n\n---\n\n✨ *Reading by TarotMate*`;
}

async function typeWriterEffect(element, text) {
    if (!element) return;
    const lines = text.split('\n');
    element.innerHTML = '';

    for (let line of lines) {
        const p = document.createElement('div');
        p.style.marginBottom = '10px';
        p.style.opacity = '0';

        let formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #a78bfa;">$1</strong>')
            .replace(/^---$/, '<hr style="border: 1px solid rgba(167, 139, 250, 0.3); margin: 20px 0;">')
            .replace(/^• /g, '&bull; ');

        p.innerHTML = formattedLine;
        element.appendChild(p);

        await new Promise(resolve => {
            setTimeout(() => {
                p.style.transition = 'opacity 0.3s';
                p.style.opacity = '1';
                resolve();
            }, 100);
        });

        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function saveToHistory(type, category, cards, content) {
    const history = JSON.parse(localStorage.getItem('mysticHistory') || '[]');
    let cardsData = null;

    if (type === 'natal') {
        cardsData = currentBirthInfo ? {
            birthDate: currentBirthInfo.birthDate,
            birthTime: currentBirthInfo.birthTime,
            birthCity: currentBirthInfo.birthCity,
            sunSign: currentNatalData?.sunSign?.name || null,
            moonSign: currentNatalData?.moonSign?.name || null,
            ascendant: currentNatalData?.ascendant?.sign?.name || null
        } : null;
    } else if (type === 'dream') {
        cardsData = null;
    } else if (Array.isArray(cards)) {
        cardsData = cards.map(c => ({ name: c.name, nameEn: c.nameEn }));
    }

    const entry = {
        date: new Date().toISOString(),
        type: type,
        category: category,
        cards: cardsData,
        content: content
    };

    history.unshift(entry);
    if (history.length > 50) history.pop();
    localStorage.setItem('mysticHistory', JSON.stringify(history));
}

window.tarotMate = {
    getHistory: () => JSON.parse(localStorage.getItem('mysticHistory') || '[]'),
    clearHistory: () => localStorage.removeItem('mysticHistory')
};