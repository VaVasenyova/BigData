// Глобальные переменные
let currentCategory = '';
let currentCards = [];
let currentZodiacSign = null;
let currentNatalData = null;
let currentBirthInfo = {};
let hfApiKey = localStorage.getItem('hf_api_key') || '';

// DOM элементы
let mainScreen, categoryScreen, spreadScreen, interpretationScreen;
let zodiacScreen, horoscopeScreen, natalInputScreen, natalChartScreen;
let apiSettingsBtn, apiSettingsModal, apiKeyInput, saveApiKeyBtn, closeSettingsBtn;

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
    apiSettingsBtn = document.getElementById('apiSettingsBtn');
    apiSettingsModal = document.getElementById('apiSettingsModal');
    apiKeyInput = document.getElementById('apiKeyInput');
    saveApiKeyBtn = document.getElementById('saveApiKey');
    closeSettingsBtn = document.getElementById('closeSettings');

    // Главный экран
    document.querySelectorAll('.main-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const option = e.currentTarget.dataset.option;
            if (option === 'tarot') showScreen('category');
            else if (option === 'horoscope') showZodiacScreen();
            else if (option === 'natal') showScreen('natalInput');
        });
    });

    // Таро
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            startSpread(e.currentTarget.dataset.category);
        });
    });

    // Навигация
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
    if (newSpreadBtn) newSpreadBtn.addEventListener('click', () => showScreen('category'));
    if (newHoroscopeBtn) newHoroscopeBtn.addEventListener('click', () => showZodiacScreen());
    if (newNatalBtn) newNatalBtn.addEventListener('click', () => showScreen('natalInput'));
    if (revealBtn) revealBtn.addEventListener('click', revealCards);
    if (calculateNatalBtn) calculateNatalBtn.addEventListener('click', calculateNatalChartHandler);

    // Настройки API
    if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', showAPISettings);
    if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => {
        if (apiSettingsModal) apiSettingsModal.classList.remove('active');
    });

    // Закрытие модального окна по клику вне
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
            alert('✅ API ключ сохранен! Теперь AI-интерпретации будут работать через Hugging Face.');
        } else {
            alert('⚠️ API ключ удален. Интерпретации будут работать в базовом режиме.');
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
        'natalChart': natalChartScreen
    };
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
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
            slot.innerHTML = `
                <div class="card-front">
                    <div style="font-size: 3em; margin-bottom: 10px;">🎴</div>
                    <div class="card-name">${card.name}</div>
                    <div style="font-size: 0.8em; color: #666; margin-top: 5px;">${card.keywords[0]}</div>
                </div>
            `;
        }, index * 300);
    });
    setTimeout(() => getAIInterpretation(), 1000);
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
        cardsDisplay.innerHTML = currentCards.map(card => `
            <div class="card-info">
                <div class="card-symbol">🎴</div>
                <div class="card-name">${card.name}</div>
            </div>
        `).join('');
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
            interpretation += '\n\n---\n\n💡 **Совет:** Добавьте API ключ Hugging Face в настройках (⚙️) для AI-интерпретации!';
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
Дай подробную интерпретацию на русском языке (500-700 слов).

ВАЖНО: Закончи мысль полностью, не обрывай на полуслове!`;

    try {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: 'Ты профессиональный таролог. Давай полные, развернутые ответы.' },
                    { role: 'user', content: prompt }
                ],
                model: 'MiniMaxAI/MiniMax-M2.1:novita',
                stream: false,
                temperature: 0.7,
                max_tokens: 3000,  // 🔥 УВЕЛИЧИЛИ с 800 до 3000!
                top_p: 0.95
            })
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Неверный API ключ');
            if (response.status === 404) throw new Error('Модель не найдена');
            if (response.status === 429) throw new Error('Слишком много запросов');
            throw new Error(`Ошибка API: ${response.status}`);
        }

        const result = await response.json();
        let fullText = '';

        if (result.choices?.[0]?.message?.content) {
            fullText = result.choices[0].message.content;

            // Проверяем, не оборвался ли текст
            const lastChar = fullText.trim().slice(-1);
            const lastSentence = fullText.trim().split('\n').pop();

            // Если текст оборвался (не заканчивается на точку/вопрос/восклицание)
            // И последняя строка длиннее 20 символов (значит это не просто заголовок)
            if (!['.', '!', '?', '\n', ''].includes(lastChar) && lastSentence.length > 20) {
                console.log('⚠️ Текст оборвался, запрашиваю продолжение...');

                // Запрашиваем продолжение
                const continuationPrompt = `Продолжи предыдущую интерпретацию с того места, где остановился. Не повторяй уже сказанное. Закончи мысль полностью.

Предыдущий текст:
${fullText}

Продолжи:`;

                const continuationResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${hfApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: 'Ты профессиональный таролог. Продолжи предыдущий текст.' },
                            { role: 'user', content: continuationPrompt }
                        ],
                        model: 'MiniMaxAI/MiniMax-M2.1:novita',
                        stream: false,
                        temperature: 0.7,
                        max_tokens: 1500,
                        top_p: 0.95
                    })
                });

                if (continuationResponse.ok) {
                    const continuationResult = await continuationResponse.json();
                    if (continuationResult.choices?.[0]?.message?.content) {
                        fullText += '\n\n' + continuationResult.choices[0].message.content;
                        console.log('✅ Продолжение получено!');
                    }
                }
            }

            return fullText;

        } else if (result.error) {
            throw new Error(result.error.message || result.error);
        } else {
            throw new Error('Неожиданный формат ответа');
        }

    } catch (error) {
        console.error('Hugging Face API Error:', error);
        throw error;
    }
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
    const systemPrompt = `Ты — профессиональный астролог. Составь гороскоп на РУССКОМ языке.
ПРАВИЛА:
1. Общая энергия дня
2. Прогноз: карьера, любовь, здоровье, финансы
3. Конкретные рекомендации
4. Пиши тепло, без фатализма
5. Объем: 400-600 слов`;

    const userPrompt = `Гороскоп на ${today} для ${sign.name}. Стихия: ${sign.element}, Планета: ${sign.planet}.`;

    try {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'MiniMaxAI/MiniMax-M2.1:novita',
                stream: false,
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Неверный API ключ');
            if (response.status === 404) throw new Error('Модель недоступна');
            throw new Error(`Ошибка API: ${response.status}`);
        }

        const result = await response.json();
        if (result.choices?.[0]?.message?.content) {
            return result.choices[0].message.content;
        } else if (result.error) {
            throw new Error(result.error.message || result.error);
        } else {
            throw new Error('Неожиданный формат ответа');
        }
    } catch (error) {
        console.error('Horoscope AI Error:', error);
        throw error;
    }
}

function generateSmartHoroscope() {
    const sign = currentZodiacSign;
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const luckyNumber = Math.floor(Math.random() * 9) + 1;
    const luckyColor = ['красный', 'синий', 'зеленый', 'золотой', 'фиолетовый', 'серебряный'][Math.floor(Math.random() * 6)];
    return `♈ **${sign.name}** (${sign.dates})\n\n🌟 **Прогноз на ${today}**\n\nБлагоприятный день для важных решений. Доверьтесь интуиции!\n\n✨ *MysticAI*`;
}

// === НАТАЛЬНАЯ КАРТА С КЭШИРОВАНИЕМ ===

// Создание уникального ключа для кэша
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

// Получение из кэша
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

// Сохранение в кэш
function saveCachedInterpretation(cacheKey, content) {
    const cacheData = {
        content: content,
        timestamp: Date.now(),
        version: '1.0'
    };
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

    // Создаём ключ для кэша
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
        const loadingMessages = [
            'Загружаем вашу натальную карту...',
            'Найдена сохранённая интерпретация...',
            'Почти готово...'
        ];
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
            interpretation += '\n\n---\n\n💡 **Совет:** Добавьте API ключ Hugging Face в настройках (⚙️) для подробной AI-интерпретации!';
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

    const systemPrompt = `Ты — профессиональный астролог с 20-летним опытом натальной астрологии. Твоя задача — составить подробную, персонализированную и вдохновляющую интерпретацию натальной карты на РУССКОМ языке.

ПРАВИЛА ИНТЕРПРЕТАЦИИ:
1. Начни с общей характеристики личности (Солнце + Асцендент + Луна)
2. Опиши сильные стороны и таланты человека
3. Проанализируй баланс стихий и что это значит для характера
4. Дай рекомендации по развитию сильных сторон
5. Укажи зоны роста и жизненные вызовы
6. Карьера и предназначение — какие сферы подходят
7. Отношения — какой партнёр подходит, паттерны в отношениях
8. Пиши тепло, поддерживающе, БЕЗ фатализма
9. Подчеркни уникальность человека
10. Объем: 600-900 слов

Форматируй ответ с заголовками (##), списками и разделителями (---) для удобства чтения.
Используй эмодзи для визуального разделения разделов.

ВАЖНО: Для одинаковых данных рождения всегда давай одинаковую интерпретацию.`;

    const userPrompt = `Составь подробную интерпретацию натальной карты:

📋 ДАННЫЕ РОЖДЕНИЯ:
Дата: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}
Время: ${currentBirthInfo.birthTime}
${currentBirthInfo.birthCity ? `Место: ${currentBirthInfo.birthCity}` : ''}

☉ ОСНОВНЫЕ ПОЛОЖЕНИЯ:
• Солнце: ${sunSign?.name || 'Unknown'} (личность, эго)
• Луна: ${moonSign?.name || 'Unknown'} (эмоции, подсознание)
${ascendant?.sign ? `• Асцендент: ${ascendant.sign.name} (внешнее проявление)` : ''}

🔥 БАЛАНС СТИХИЙ:
• Огонь: ${elementDist['Огонь']} планет(ы)
• Земля: ${elementDist['Земля']} планет(ы)
• Воздух: ${elementDist['Воздух']} планет(ы)
• Вода: ${elementDist['Вода']} планет(ы)

🪙 ПОЛОЖЕНИЕ ПЛАНЕТ:
${planetsInfo}

Дай глубокий астрологический портрет с практическими рекомендациями для жизни, карьеры и отношений.`;

    try {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'MiniMaxAI/MiniMax-M2.1:novita',
                stream: false,
                temperature: 0.1,
                max_tokens: 2000,
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
        if (result.choices?.[0]?.message?.content) {
            return result.choices[0].message.content;
        } else if (result.error) {
            throw new Error(result.error.message || result.error);
        } else {
            throw new Error('Неожиданный формат ответа');
        }
    } catch (error) {
        console.error('Natal Chart AI Error:', error);
        throw error;
    }
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
                <h4>Асцендент (восходящий знак)</h4>
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
        'Овен': 'Вы прирожденный лидер, полный энергии и инициативы.',
        'Телец': 'Вы надежны, практичны и цените стабильность.',
        'Близнецы': 'Вы общительны, любознательны и адаптивны.',
        'Рак': 'Вы эмоциональны, интуитивны и заботливы.',
        'Лев': 'Вы харизматичны, творчески и любите быть в центре внимания.',
        'Дева': 'Вы аналитичны, практичны и внимательны к деталям.',
        'Весы': 'Вы дипломатичны, цените гармонию и красоту.',
        'Скорпион': 'Вы интенсивны, страстны и проницательны.',
        'Стрелец': 'Вы оптимистичны, любите свободу и приключения.',
        'Козерог': 'Вы амбициозны, дисциплинированны и практичны.',
        'Водолей': 'Вы независимы, инновационны и гуманны.',
        'Рыбы': 'Вы чувствительны, интуитивны и духовны.'
    };

    const moonInterpretations = {
        'Овен': 'Быстрые, интенсивные эмоции.',
        'Телец': 'Стабильные, устойчивые эмоции.',
        'Близнецы': 'Изменчивые эмоции, потребность в общении.',
        'Рак': 'Глубокие, интенсивные эмоции.',
        'Лев': 'Теплые, щедрые эмоции.',
        'Дева': 'Сдержанные эмоции.',
        'Весы': 'Потребность в гармонии.',
        'Скорпион': 'Интенсивные, глубокие эмоции.',
        'Стрелец': 'Оптимистичные эмоции.',
        'Козерог': 'Сдержанные эмоции, самоконтроль.',
        'Водолей': 'Независимые эмоции.',
        'Рыбы': 'Чувствительные, эмпатичные эмоции.'
    };

    const elementInterpretations = {
        'Огонь': 'Вы энергичны, энтузиастичны и вдохновенны.',
        'Земля': 'Вы практичны, надежны и материалистичны.',
        'Воздух': 'Вы интеллектуальны, общительны и адаптивны.',
        'Вода': 'Вы эмоциональны, интуитивны и чувствительны.'
    };

    let interpretation = `🌟 **НАТАЛЬНАЯ КАРТА**\n\n`;
    if (currentBirthInfo.name) interpretation += `Для: ${currentBirthInfo.name}\n`;
    interpretation += `Дата: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}\n\n---\n\n`;
    interpretation += `☉ **СОЛНЦЕ В ${sunSign.name.toUpperCase()}**\n\n`;
    interpretation += `${sunInterpretations[sunSign.name] || 'Уникальная личность'}\n\n---\n\n`;
    interpretation += `☽ **ЛУНА В ${moonSign.name.toUpperCase()}**\n\n`;
    interpretation += `${moonInterpretations[moonSign.name] || 'Глубокая эмоциональная природа'}\n\n---\n\n`;

    if (ascendant && ascendant.sign) {
        interpretation += `⬆️ **АСЦЕНДЕНТ В ${ascendant.sign.name.toUpperCase()}**\n\n`;
        interpretation += `Вы производите впечатление человека с качествами ${ascendant.sign.name}.\n\n---\n\n`;
    }

    interpretation += `🔥 **БАЛАНС СТИХИЙ**\n\n`;
    interpretation += `• 🔥 Огонь: ${elementDist['Огонь']} планет\n`;
    interpretation += `• 🌍 Земля: ${elementDist['Земля']} планет\n`;
    interpretation += `• 💨 Воздух: ${elementDist['Воздух']} планет\n`;
    interpretation += `• 💧 Вода: ${elementDist['Вода']} планет\n\n`;
    interpretation += `**Доминирует: ${dominantElement}**\n\n`;
    interpretation += `${elementInterpretations[dominantElement]}\n\n`;
    interpretation += `---\n\n✨ *Натальная карта от MysticAI*`;

    return interpretation;
}

function generateSmartInterpretation() {
    const [card1, card2, card3] = currentCards;
    const templates = {
        career: {
            title: "🔮 Расклад на карьеру",
            intro: `Карты говорят о важных процессах в вашей профессиональной сфере.`,
            card1: `**${card1.name}** — текущая ситуация: ${card1.meaning}.`,
            card2: `**${card2.name}** — вызовы: ${card2.meaning}.`,
            card3: `**${card3.name}** — совет: ${card3.meaning}.`,
            advice: `**Рекомендации:**\n• Доверьтесь интуиции\n• Не бойтесь просить о помощи\n• Сфокусируйтесь на долгосрочных целях`
        },
        love: {
            title: "💖 Расклад на отношения",
            intro: `В сфере отношений назревают важные перемены.`,
            card1: `**${card1.name}** — текущая энергия: ${card1.meaning}.`,
            card2: `**${card2.name}** — скрытые аспекты: ${card2.meaning}.`,
            card3: `**${card3.name}** — путь к гармонии: ${card3.meaning}.`,
            advice: `**Что делать:**\n• Будьте честны с собой и партнером\n• Позвольте себе быть уязвимым\n• Практикуйте активное слушание`
        },
        money: {
            title: "💰 Финансовый расклад",
            intro: `Финансовая сфера требует вашего внимания.`,
            card1: `**${card1.name}** — ситуация: ${card1.meaning}.`,
            card2: `**${card2.name}** — предупреждение: ${card2.meaning}.`,
            card3: `**${card3.name}** — стратегия: ${card3.meaning}.`,
            advice: `**Практические шаги:**\n• Проанализируйте расходы\n• Создайте финансовую подушку\n• Инвестируйте в образование`
        },
        general: {
            title: "🌟 Общий расклад",
            intro: `Целостная картина текущего периода вашей жизни.`,
            card1: `**${card1.name}** — ваша позиция: ${card1.meaning}.`,
            card2: `**${card2.name}** — вызов: ${card2.meaning}.`,
            card3: `**${card3.name}** — совет: ${card3.meaning}.`,
            advice: `**Направления:**\n• Практикуйте осознанность\n• Записывайте инсайты\n• Доверьтесь процессу жизни`
        }
    };

    const t = templates[currentCategory];
    return `${t.title}\n\n${t.intro}\n\n---\n\n${t.card1}\n\n${t.card2}\n\n${t.card3}\n\n---\n\n${t.advice}\n\n---\n\n✨ *Расклад создан с помощью MysticAI*`;
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