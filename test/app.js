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
        apiSettingsModal.classList.remove('active');
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
        console.log('💡 Для AI-интерпретаций добавьте Hugging Face API ключ в настройках (⚙️)');
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
    if (categoryTitle) {
        categoryTitle.textContent = `Расклад: ${categoryTranslations[category]}`;
    }

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

Дай подробную интерпретацию на русском языке (300-500 слов).`;

    try {
        const response = await fetch('https://huggingface.co/mistralai/Mistral-7B-v0.3', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 800,
                    temperature: 0.7,
                    return_full_text: false,
                    top_p: 0.95
                }
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Неверный API ключ');
            } else if (response.status === 503) {
                throw new Error('Модель загружается');
            }
            throw new Error(`Ошибка API: ${response.status}`);
        }

        const result = await response.json();

        if (Array.isArray(result) && result[0]?.generated_text) {
            return result[0].generated_text;
        } else if (result.error) {
            throw new Error(result.error);
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
    const contentDiv = document.getElementById('horoscopeContent');

    if (loading) loading.style.display = 'block';
    if (contentDiv) contentDiv.innerHTML = '';

    showScreen('horoscope');

    await new Promise(resolve => setTimeout(resolve, 2500));

    if (loading) loading.style.display = 'none';

    const horoscope = generateSmartHoroscope();
    if (contentDiv) await typeWriterEffect(contentDiv, horoscope);
    saveToHistory('horoscope', currentZodiacSign.name, null, horoscope);
}

function generateSmartHoroscope() {
    const sign = currentZodiacSign;
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const luckyNumber = Math.floor(Math.random() * 9) + 1;
    const luckyColor = ['красный', 'синий', 'зеленый', 'золотой', 'фиолетовый', 'серебряный'][Math.floor(Math.random() * 6)];
    const compatibility = zodiacSigns[Math.floor(Math.random() * 12)].name;

    return `♈ **${sign.name}** (${sign.dates})\nСтихия: ${sign.element} | Планета: ${sign.planet}\n\n---\n\n🌟 **Общий прогноз на ${today}**\n\nСегодня ${sign.name} находится под влиянием ${sign.planet}.\n\n---\n\n✨ **Совет дня:** Доверьтесь вселенной!\n\n*Гороскоп составлен с помощью MysticAI*`;
}

async function calculateNatalChartHandler() {
    const birthName = document.getElementById('birthName');
    const birthDate = document.getElementById('birthDate');
    const birthTime = document.getElementById('birthTime');
    const birthCity = document.getElementById('birthCity');

    if (!birthDate || !birthDate.value) {
        alert('Пожалуйста, введите дату рождения');
        return;
    }

    currentBirthInfo = {
        name: birthName ? birthName.value : '',
        birthDate: birthDate.value,
        birthTime: birthTime ? birthTime.value : '12:00',
        birthCity: birthCity ? birthCity.value : ''
    };

    currentNatalData = calculateNatalChart(currentBirthInfo.birthDate, currentBirthInfo.birthTime);

    displayNatalChart();

    const loading = document.getElementById('loadingNatal');
    const interpretationDiv = document.getElementById('natalInterpretation');

    if (loading) loading.style.display = 'block';
    if (interpretationDiv) interpretationDiv.innerHTML = '';

    showScreen('natalChart');

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (loading) loading.style.display = 'none';

    const interpretation = generateNatalInterpretation();
    if (interpretationDiv) await typeWriterEffect(interpretationDiv, interpretation);
    saveToHistory('natal', `${currentBirthInfo.name || 'User'}'s Natal Chart`, currentNatalData, interpretation);
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
        'Овен': 'Вы прирожденный лидер.',
        'Телец': 'Вы надежны и практичны.',
        'Близнецы': 'Вы общительны и адаптивны.',
        'Рак': 'Вы эмоциональны и интуитивны.',
        'Лев': 'Вы харизматичны и творчески.',
        'Дева': 'Вы аналитичны и внимательны.',
        'Весы': 'Вы дипломатичны.',
        'Скорпион': 'Вы интенсивны и страстны.',
        'Стрелец': 'Вы оптимистичны.',
        'Козерог': 'Вы амбициозны.',
        'Водолей': 'Вы независимы.',
        'Рыбы': 'Вы чувствительны.'
    };

    let interpretation = `🌟 **НАТАЛЬНАЯ КАРТА**\n\n`;
    if (currentBirthInfo.name) interpretation += `Для: ${currentBirthInfo.name}\n`;
    interpretation += `Дата: ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}\n\n---\n\n`;

    interpretation += `☉ **СОЛНЦЕ В ${sunSign.name.toUpperCase()}**\n\n`;
    interpretation += `${sunInterpretations[sunSign.name] || 'Уникальная личность'}\n\n---\n\n`;

    interpretation += `☽ **ЛУНА В ${moonSign.name.toUpperCase()}**\n\n`;
    interpretation += `Глубокая эмоциональная природа\n\n---\n\n`;

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

    interpretation += `---\n\n✨ *Натальная карта рассчитана с помощью MysticAI*`;

    return interpretation;
}

function generateSmartInterpretation() {
    const [card1, card2, card3] = currentCards;
    const categoryName = categoryTranslations[currentCategory];

    let interpretation = `## 🔮 Расклад на тему: **${categoryName}**\n\n`;

    interpretation += `### 🌟 Общая энергия расклада\n\n`;
    interpretation += `Карты показывают важный период в вашей жизни. Обратите внимание на сочетание энергий.\n\n`;

    interpretation += `---\n\n### 🎴 Толкование карт\n\n`;

    const positions = ['Прошлое', 'Настоящее', 'Будущее'];
    [card1, card2, card3].forEach((card, index) => {
        interpretation += `**${index + 1}. ${positions[index]}: ${card.name}**\n\n`;
        interpretation += `${card.meaning}\n\n`;
        interpretation += `**Ключевые аспекты**: ${card.keywords.slice(0, 3).join(', ')}\n\n`;
    });

    interpretation += `---\n\n### 💫 Рекомендации\n\n`;
    interpretation += `• Доверьтесь своей интуиции\n`;
    interpretation += `• Обратите внимание на знаки судьбы\n`;
    interpretation += `• Действуйте осознанно\n\n`;

    interpretation += `---\n\n✨ *Расклад создан с помощью MysticAI*`;

    return interpretation;
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
    const entry = {
        date: new Date().toISOString(),
        type: type,
        category: category,
        cards: cards ? cards.map(c => ({ name: c.name, nameEn: c.nameEn })) : null,
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