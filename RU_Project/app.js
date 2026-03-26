// Глобальные переменные
let currentCategory = '';
let currentCards = [];
let currentZodiacSign = null;
let currentNatalData = null;
let currentBirthInfo = {};
let hfApiKey = localStorage.getItem('hf_api_key') || '';

// DOM элементы
let mainScreen, categoryScreen, spreadScreen, interpretationScreen;
let zodiacScreen, horoscopeScreen, natalInputScreen, natalChartScreen, dreamChatScreen;
let apiSettingsBtn, apiSettingsModal, apiKeyInput, saveApiKeyBtn, closeSettingsBtn;
let backToMainFromDream, sendDreamBtn, dreamInput, chatMessages;
let isDreamChatLoading = false;

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация DOM элементов
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

    // Главный экран
    document.querySelectorAll('.main-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const option = e.currentTarget.dataset.option;
            if (option === 'tarot') showScreen('category');
            else if (option === 'horoscope') showZodiacScreen();
            else if (option === 'natal') showScreen('natalInput');
            else if (option === 'dream') showDreamChat();
        });
    });

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            startSpread(e.currentTarget.dataset.category);
        });
    });

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

    if (sendDreamBtn) sendDreamBtn.addEventListener('click', sendDreamMessage);
    if (dreamInput) {
        dreamInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendDreamMessage();
            }
        });
    }

    if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', showAPISettings);
    if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
        if (apiSettingsModal) apiSettingsModal.classList.remove('active');
    });

    if (apiSettingsModal) {
        apiSettingsModal.addEventListener('click', (e) => {
            if (e.target === apiSettingsModal) {
                apiSettingsModal.classList.remove('active');
            }
        });
    }

    initZodiacGrid();

    if (!hfApiKey) {
        console.log('💡 Приложение работает без API ключа (локальная интерпретация)');
        console.log('🔑 Для AI-интерпретаций добавьте Hugging Face API ключ в настройках (⚙️)');
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
            alert('✅ API ключ сохранен!');
        } else {
            alert('⚠️ API ключ удален.');
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
    if (categoryTitle) categoryTitle.textContent = `Расклад: ${categoryTranslations[category]}`;
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

// 🔥 НОВАЯ ФУНКЦИЯ: Проверка и продолжение текста
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
            if (response.status === 401) throw new Error('Неверный API ключ');
            if (response.status === 404) throw new Error('Модель недоступна');
            if (response.status === 429) throw new Error('Слишком много запросов');
            throw new Error(`Ошибка API: ${response.status}`);
        }

        const result = await response.json();
        let content = result.choices?.[0]?.message?.content || '';

        // 🔥 Проверяем, не оборвался ли текст
        const lastChar = content.trim().slice(-1);
        const endsProperly = ['.', '!', '?', '\n', 'ь', 'й', 'я', 'е', 'и', 'о', 'а', 'у', ')', '"', '»'].includes(lastChar);

        // Если текст оборвался и он достаточно длинный — запрашиваем продолжение
        if (!endsProperly && content.length > 200) {
            console.log('⚠️ Текст оборвался, запрашиваю продолжение...');
            const continuationMessages = [
                { role: 'system', content: 'Ты профессиональный астролог/таролог. Продолжи предыдущий ответ с того места, где он оборвался. Не повторяй уже написанное.' },
                { role: 'user', content: `Продолжи этот текст, который оборвался: "${content.slice(-200)}"... Пиши только продолжение, без вступлений.` }
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
        'AI анализирует ваш расклад...',
        'Связываем значения карт...',
        'Генерируем персонализированную интерпретацию...',
        'Почти готово...'
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
            interpretation += '\n\n---\n\n💡 **Совет:** Добавьте API ключ в настройках (⚙️) для AI-интерпретации!';
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

    const prompt = `Ты профессиональный таролог. Дай интерпретацию расклада на тему "${categoryName}".
Карты:
${cardsInfo}
Дай ПОДРОБНУЮ интерпретацию на русском языке (400-600 слов). Пиши до конца, не обрывай текст.`;

    const messages = [
        { role: 'system', content: 'Ты профессиональный таролог. Пиши полные ответы.' },
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

    const loadingMessages = ['AI анализирует звёзды...', 'Составляем прогноз...', 'Почти готово...'];
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
            horoscope += '\n\n---\n\n💡 Добавьте API ключ для AI-гороскопа!';
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
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const systemPrompt = `Ты — профессиональный астролог. Составь ПОДРОБНЫЙ гороскоп на РУССКОМ языке.
ПРАВИЛА:
1. Общая энергия дня
2. Прогноз: карьера, любовь, здоровье, финансы
3. Конкретные рекомендации
4. Пиши тепло, без фатализма
5. Объем: 500-700 слов
6. Пиши до конца, НЕ ОБРЫВАЙ текст!`;

    const userPrompt = `Гороскоп на ${today} для ${sign.name}. Стихия: ${sign.element}, Планета: ${sign.planet}.
Дай ПОДРОБНЫЙ прогноз, пиши до самого конца.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 4000);
}

function generateSmartHoroscope() {
    const sign = currentZodiacSign;
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    return `♈ **${sign.name}** (${sign.dates})\n\n🌟 **Прогноз на ${today}**\n\nБлагоприятный день для важных решений. Доверьтесь интуиции!\n\n✨ *MysticAI*`;
}

// === НАТАЛЬНАЯ КАРТА ===

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
            console.log('✅ Загружено из кэша');
            return parsed.content;
        }
    }
    return null;
}

function saveCachedInterpretation(cacheKey, content) {
    const cacheData = { content: content, timestamp: Date.now(), version: '1.0' };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Сохранено в кэш');
}

async function calculateNatalChartHandler() {
    const name = document.getElementById('birthName').value;
    const birthDate = document.getElementById('birthDate').value;
    const birthTime = document.getElementById('birthTime').value || '12:00';
    const birthCity = document.getElementById('birthCity').value;

    if (!birthDate) {
        alert('Пожалуйста, введите дату рождения');
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
        const loadingMessages = ['Загружаем...', 'Найдено в кэше...', 'Почти готово...'];
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
        'AI анализирует вашу натальную карту...',
        'Интерпретируем положение планет...',
        'Составляем астрологический портрет...',
        'Почти готово...'
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
            interpretation += '\n\n---\n\n💡 Добавьте API ключ для подробной интерпретации!';
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

    const systemPrompt = `Ты — профессиональный астролог с 20-летним опытом. Составь ПОДРОБНУЮ интерпретацию натальной карты на РУССКОМ языке.

ПРАВИЛА:
1. Общая характеристика (Солнце + Асцендент + Луна)
2. Сильные стороны и таланты
3. Баланс стихий и характер
4. Рекомендации по развитию
5. Зоны роста и вызовы
6. Карьера и предназначение
7. Отношения и паттерны
8. Пиши тепло, без фатализма
9. Объем: 900-1200 слов
10. Пиши до КОНЦА, НЕ ОБРЫВАЙ текст!

Форматируй с заголовками (##), списками и разделителями (---).`;

    const userPrompt = `Составь ПОДРОБНУЮ интерпретацию натальной карты:

📋 ДАННЫЕ:
Дата: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}
Время: ${currentBirthInfo.birthTime}
${currentBirthInfo.birthCity ? `Место: ${currentBirthInfo.birthCity}` : ''}

☉ ПОЛОЖЕНИЯ:
• Солнце: ${sunSign?.name || 'Unknown'}
• Луна: ${moonSign?.name || 'Unknown'}
${ascendant?.sign ? `• Асцендент: ${ascendant.sign.name}` : ''}

🔥 СТИХИИ:
• Огонь: ${elementDist['Огонь']}, Земля: ${elementDist['Земля']}, Воздух: ${elementDist['Воздух']}, Вода: ${elementDist['Вода']}

🪙 ПЛАНЕТЫ:
${planetsInfo}

Дай ГЛУБОКИЙ портрет с рекомендациями. Пиши ПОДРОБНО, до самого конца!`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 4000);
}

function displayNatalChart() {
    if (!currentNatalData) {
        console.error('Natal data is not calculated!');
        alert('Ошибка: данные натальной карты не рассчитаны');
        return;
    }

    const natalUserInfo = document.getElementById('natalUserInfo');
    if (natalUserInfo) {
        natalUserInfo.innerHTML = `
            <div class="birth-info">
                <h3>${currentBirthInfo.name || 'Натальная карта'}</h3>
                <p>📅 ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}</p>
                <p>🕐 ${currentBirthInfo.birthTime}</p>
                ${currentBirthInfo.birthCity ? `<p>📍 ${currentBirthInfo.birthCity}</p>` : ''}
            </div>
        `;
    }

    const wheel = document.getElementById('natalChartWheel');
    if (wheel) {
        wheel.innerHTML = '<div class="wheel-title">Зодиакальный круг</div>';
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
        planetsList.innerHTML = '<h3>Положение планет</h3>';
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
                <h4>Асцендент</h4>
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
        return 'Ошибка: недостаточно данных для интерпретации.';
    }

    const sunSign = currentNatalData.sunSign;
    const moonSign = currentNatalData.moonSign;
    const ascendant = currentNatalData.ascendant;
    const elementDist = getElementDistribution(currentNatalData);
    const dominantElement = Object.entries(elementDist).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    const sunInterpretations = {
        'Овен': 'Вы прирожденный лидер.', 'Телец': 'Вы надежны и практичны.',
        'Близнецы': 'Вы общительны.', 'Рак': 'Вы эмоциональны.',
        'Лев': 'Вы харизматичны.', 'Дева': 'Вы аналитичны.',
        'Весы': 'Вы дипломатичны.', 'Скорпион': 'Вы интенсивны.',
        'Стрелец': 'Вы оптимистичны.', 'Козерог': 'Вы амбициозны.',
        'Водолей': 'Вы независимы.', 'Рыбы': 'Вы чувствительны.'
    };

    let interpretation = `🌟 **НАТАЛЬНАЯ КАРТА**\n\n`;
    if (currentBirthInfo.name) interpretation += `Для: ${currentBirthInfo.name}\n`;
    interpretation += `Дата: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}\n\n---\n\n`;
    interpretation += `☉ **СОЛНЦЕ В ${sunSign.name.toUpperCase()}**\n\n`;
    interpretation += `${sunInterpretations[sunSign.name] || 'Уникальная личность'}\n\n---\n\n`;
    interpretation += `☽ **ЛУНА В ${moonSign.name.toUpperCase()}**\n\n`;
    interpretation += `Глубокая эмоциональная природа.\n\n---\n\n`;

    if (ascendant && ascendant.sign) {
        interpretation += `⬆️ **АСЦЕНДЕНТ: ${ascendant.sign.name.toUpperCase()}**\n\n`;
        interpretation += `Вы производите впечатление человека с качествами ${ascendant.sign.name}.\n\n---\n\n`;
    }

    interpretation += `🔥 **БАЛАНС СТИХИЙ**\n\n`;
    interpretation += `• 🔥 Огонь: ${elementDist['Огонь']} планет\n`;
    interpretation += `• 🌍 Земля: ${elementDist['Земля']} планет\n`;
    interpretation += `• 💨 Воздух: ${elementDist['Воздух']} планет\n`;
    interpretation += `• 💧 Вода: ${elementDist['Вода']} планет\n\n`;
    interpretation += `**Доминирует: ${dominantElement}**\n\n`;
    interpretation += `---\n\n✨ *Натальная карта от MysticAI*`;

    return interpretation;
}

// === ТОЛКОВАНИЕ СНОВ ===

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
        addMessageToChat(`⚠️ *Временные трудности с AI.*\n\n${fallbackInterpretation}`, false);
    } finally {
        isDreamChatLoading = false;
        if (sendDreamBtn) sendDreamBtn.disabled = false;
        if (dreamInput) dreamInput.focus();
    }
}

async function interpretDreamWithAI(dreamDescription) {
    const systemPrompt = `Ты — опытный толкователь снов. Помоги понять значение сна на РУССКОМ языке.

ПРАВИЛА:
1. Начни с резюме: хорошо/плохо/нейтрально
2. Объясни ключевые символы
3. Дай психологическую интерпретацию
4. Предложи практический совет
5. Пиши тепло, без фатализма
6. Объем: 300-500 слов
7. Пиши до конца, НЕ ОБРЫВАЙ!`;

    const userPrompt = `Помоги понять значение моего сна:\n\n"${dreamDescription}"\n\nЧто это может означать? Пиши ПОДРОБНО, до конца.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    return await fetchWithContinuation(messages, 'MiniMaxAI/MiniMax-M2.1:novita', 3000);
}

function generateLocalDreamInterpretation(dreamText) {
    const lowerDream = dreamText.toLowerCase();
    const positiveWords = ['летал', 'свет', 'радость', 'любовь', 'цветы', 'море', 'солнце', 'улыбка'];
    const negativeWords = ['падал', 'темнота', 'страх', 'погоня', 'потеря', 'смерть', 'крик'];

    let tone = 'нейтральный';
    if (positiveWords.some(w => lowerDream.includes(w))) tone = 'позитивный';
    if (negativeWords.some(w => lowerDream.includes(w))) tone = 'требующий внимания';

    const symbols = [];
    if (lowerDream.includes('вода') || lowerDream.includes('море')) symbols.push('💧 Вода — эмоции');
    if (lowerDream.includes('лет') || lowerDream.includes('полёт')) symbols.push('✈️ Полёт — свобода');
    if (lowerDream.includes('зуб')) symbols.push('🦷 Зубы — уверенность');
    if (lowerDream.includes('погоня') || lowerDream.includes('бег')) symbols.push('🏃 Погоня — избегание');
    if (lowerDream.includes('дом') || lowerDream.includes('квартира')) symbols.push('🏠 Дом — ваше "Я"');

    let interpretation = `🌙 **Тон сна**: ${tone}\n\n`;
    if (symbols.length > 0) interpretation += `**Символы**:\n${symbols.map(s => `• ${s}`).join('\n')}\n\n`;
    interpretation += `**Значение**: ${tone === 'позитивный' ? 'Хороший знак.' : tone === 'требующий внимания' ? 'Обратите внимание на внутренние напряжения.' : 'Нейтральная информация.'}\n\n`;
    interpretation += `**Вопрос**: Что сейчас требует внимания?\n\n`;
    interpretation += `💡 **Совет**: Запишите детали в дневник.`;
    return interpretation;
}

// === ОБЩИЕ ФУНКЦИИ ===

function generateSmartInterpretation() {
    const [card1, card2, card3] = currentCards;
    const templates = {
        career: {
            title: "🔮 Расклад на карьеру",
            intro: `Карты говорят о важных процессах в вашей профессиональной сфере.`,
            card1: `**${card1.name}** — текущая ситуация: ${card1.meaning}.`,
            card2: `**${card2.name}** — вызовы: ${card2.meaning}.`,
            card3: `**${card3.name}** — совет: ${card3.meaning}.`,
            advice: `**Рекомендации:**\n• Доверьтесь интуиции\n• Не бойтесь просить о помощи`
        },
        love: {
            title: "💖 Расклад на отношения",
            intro: `В сфере отношений назревают важные перемены.`,
            card1: `**${card1.name}** — текущая энергия: ${card1.meaning}.`,
            card2: `**${card2.name}** — скрытые аспекты: ${card2.meaning}.`,
            card3: `**${card3.name}** — путь к гармонии: ${card3.meaning}.`,
            advice: `**Что делать:**\n• Будьте честны с собой и партнером`
        },
        money: {
            title: "💰 Финансовый расклад",
            intro: `Финансовая сфера требует вашего внимания.`,
            card1: `**${card1.name}** — ситуация: ${card1.meaning}.`,
            card2: `**${card2.name}** — предупреждение: ${card2.meaning}.`,
            card3: `**${card3.name}** — стратегия: ${card3.meaning}.`,
            advice: `**Шаги:**\n• Проанализируйте расходы`
        },
        general: {
            title: "🌟 Общий расклад",
            intro: `Целостная картина текущего периода.`,
            card1: `**${card1.name}** — ваша позиция: ${card1.meaning}.`,
            card2: `**${card2.name}** — вызов: ${card2.meaning}.`,
            card3: `**${card3.name}** — совет: ${card3.meaning}.`,
            advice: `**Направления:**\n• Практикуйте осознанность`
        }
    };

    const t = templates[currentCategory];
    return `${t.title}\n\n${t.intro}\n\n---\n\n${t.card1}\n\n${t.card2}\n\n${t.card3}\n\n---\n\n${t.advice}\n\n---\n\n✨ *MysticAI*`;
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

window.mysticApp = {
    getHistory: () => JSON.parse(localStorage.getItem('mysticHistory') || '[]'),
    clearHistory: () => localStorage.removeItem('mysticHistory')
};