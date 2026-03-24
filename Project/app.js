// Глобальные переменные
let currentCategory = '';
let currentCards = [];
let currentZodiacSign = null;
let currentNatalData = null;
let currentBirthInfo = {};
let hfApiKey = localStorage.getItem('hf_api_key') || '';

// DOM элементы
const mainScreen = document.getElementById('mainScreen');
const categoryScreen = document.getElementById('categoryScreen');
const spreadScreen = document.getElementById('spreadScreen');
const interpretationScreen = document.getElementById('interpretationScreen');
const zodiacScreen = document.getElementById('zodiacScreen');
const horoscopeScreen = document.getElementById('horoscopeScreen');
const natalInputScreen = document.getElementById('natalInputScreen');
const natalChartScreen = document.getElementById('natalChartScreen');
const apiSettingsBtn = document.getElementById('apiSettingsBtn');
const apiSettingsModal = document.getElementById('apiSettingsModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const closeSettingsBtn = document.getElementById('closeSettings');

document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('backToMainFromTarot').addEventListener('click', () => showScreen('main'));
    document.getElementById('backToMainFromHoroscope').addEventListener('click', () => showScreen('main'));
    document.getElementById('backToMainFromNatal').addEventListener('click', () => showScreen('main'));
    document.getElementById('newSpreadBtn').addEventListener('click', () => showScreen('category'));
    document.getElementById('newHoroscopeBtn').addEventListener('click', () => showZodiacScreen());
    document.getElementById('newNatalBtn').addEventListener('click', () => showScreen('natalInput'));
    document.getElementById('revealBtn').addEventListener('click', revealCards);
    document.getElementById('calculateNatalBtn').addEventListener('click', calculateNatalChartHandler);

    // Настройки API
    apiSettingsBtn.addEventListener('click', showAPISettings);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    closeSettingsBtn.addEventListener('click', () => {
        apiSettingsModal.classList.remove('active');
    });

    // Закрытие модального окна по клику вне
    apiSettingsModal.addEventListener('click', (e) => {
        if (e.target === apiSettingsModal) {
            apiSettingsModal.classList.remove('active');
        }
    });

    initZodiacGrid();

    // Проверка API ключа при запуске
    if (!hfApiKey) {
        console.log('💡 Подсказка: Приложение работает без API ключа (локальная интерпретация)');
        console.log('🔑 Для AI-интерпретаций добавьте Hugging Face API ключ в настройках (⚙️)');
    }
});

function showAPISettings() {
    apiKeyInput.value = hfApiKey;
    apiSettingsModal.classList.add('active');
}

function saveApiKey() {
    hfApiKey = apiKeyInput.value.trim();
    localStorage.setItem('hf_api_key', hfApiKey);
    apiSettingsModal.classList.remove('active');

    if (hfApiKey) {
        alert('✅ API ключ сохранен! Теперь AI-интерпретации будут работать через Hugging Face.');
    } else {
        alert('⚠️ API ключ удален. Интерпретации будут работать в базовом режиме.');
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
    document.getElementById('categoryTitle').textContent = `Расклад: ${categoryTranslations[category]}`;

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

    loading.style.display = 'block';
    interpretationDiv.innerHTML = '';
    showScreen('interpretation');

    document.getElementById('cardsDisplay').innerHTML = currentCards.map(card => `
        <div class="card-info">
            <div class="card-symbol">🎴</div>
            <div class="card-name">${card.name}</div>
        </div>
    `).join('');

    // Анимация "мышления" AI
    const loadingMessages = [
        'AI анализирует ваш расклад...',
        'Связываем значения карт...',
        'Генерируем персонализированную интерпретацию...',
        'Почти готово...'
    ];

    for (let i = 0; i < loadingMessages.length; i++) {
        loadingText.textContent = loadingMessages[i];
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
        let interpretation;

        if (hfApiKey) {
            // Пытаемся использовать Hugging Face API
            interpretation = await callHuggingFaceAPI();
        } else {
            // Fallback на локальную генерацию
            interpretation = generateSmartInterpretation();
            interpretation += '\n\n---\n\n💡 **Совет:** Добавьте API ключ Hugging Face в настройках (⚙️) для AI-интерпретации!';
        }

        loading.style.display = 'none';
        await typeWriterEffect(interpretationDiv, interpretation);
        saveToHistory('tarot', currentCategory, currentCards, interpretation);

    } catch (error) {
        console.error('AI Error:', error);
        loading.style.display = 'none';

        // Fallback на локальную генерацию при ошибке
        const fallbackInterpretation = generateSmartInterpretation();
        await typeWriterEffect(interpretationDiv, fallbackInterpretation);
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
        const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3', {
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

    document.getElementById('zodiacSymbol').textContent = currentZodiacSign.symbol;
    document.getElementById('zodiacName').textContent = currentZodiacSign.name;

    const loading = document.getElementById('loadingHoroscope');
    const contentDiv = document.getElementById('horoscopeContent');

    loading.style.display = 'block';
    contentDiv.innerHTML = '';
    showScreen('horoscope');

    await new Promise(resolve => setTimeout(resolve, 2500));
    loading.style.display = 'none';

    const horoscope = generateSmartHoroscope();
    await typeWriterEffect(contentDiv, horoscope);
    saveToHistory('horoscope', currentZodiacSign.name, null, horoscope);
}

function generateSmartHoroscope() {
    const sign = currentZodiacSign;
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const luckyNumber = Math.floor(Math.random() * 9) + 1;
    const luckyColor = ['красный', 'синий', 'зеленый', 'золотой', 'фиолетовый', 'серебряный'][Math.floor(Math.random() * 6)];
    const compatibility = zodiacSigns[Math.floor(Math.random() * 12)].name;

    return `♈ **${sign.name}** (${sign.dates})\nСтихия: ${sign.element} | Планета: ${sign.planet}\n\n---\n\n🌟 **Общий прогноз на ${today}**\n\nСегодня ${sign.name} находится под влиянием ${sign.planet}. Энергия дня благоприятствует ${sign.element === 'Огонь' ? 'активным действиям и новым начинаниям' : sign.element === 'Земля' ? 'практическим делам и материальным вопросам' : sign.element === 'Воздух' ? 'общению и интеллектуальной деятельности' : 'эмоциональным вопросам и интуиции'}.\n\n---\n\n💼 **Карьера и работа**\n\nВ профессиональной сфере сегодня важный день. Звезды рекомендуют проявить инициативу и не бояться брать на себя ответственность. Возможны новые проекты или важные переговоры.\n\n---\n\n❤️ **Любовь и отношения**\n\nВ личной жизни благоприятный период. Если вы в отношениях — уделите время партнеру. Если в поиске — обратите внимание на ${compatibility}, возможна интересная встреча.\n\n---\n\n🧘 **Здоровье**\n\nУделите время физической активности и отдыху. Ваша энергия на высоте, но не стоит ее растрачивать попусту.\n\n---\n\n💰 **Финансы**\n\nФинансовый день обещает быть интересным. Возможно неожиданное поступление денег или выгодное предложение. Избегайте импульсивных трат.\n\nСчастливое число: ${luckyNumber}\nСчастливый цвет: ${luckyColor}\n\n---\n\n✨ **Совет дня:** Доверьтесь вселенной, но не забывайте действовать.\n\n*Гороскоп составлен с помощью MysticAI*`;
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

    displayNatalChart();

    const loading = document.getElementById('loadingNatal');
    const interpretationDiv = document.getElementById('natalInterpretation');

    loading.style.display = 'block';
    interpretationDiv.innerHTML = '';
    showScreen('natalChart');

    await new Promise(resolve => setTimeout(resolve, 3000));
    loading.style.display = 'none';

    const interpretation = generateNatalInterpretation();
    await typeWriterEffect(interpretationDiv, interpretation);
    saveToHistory('natal', `${name || 'User'}'s Natal Chart`, currentNatalData, interpretation);
}

function displayNatalChart() {
    if (!currentNatalData) {
        console.error('Natal data is not calculated!');
        alert('Ошибка: данные натальной карты не рассчитаны');
        return;
    }

    document.getElementById('natalUserInfo').innerHTML = `
        <div class="birth-info">
            <h3>${currentBirthInfo.name || 'Натальная карта'}</h3>
            <p>📅 ${new Date(currentBirthInfo.birthDate).toLocaleDateString('ru-RU')}</p>
            <p>🕐 ${currentBirthInfo.birthTime}</p>
            ${currentBirthInfo.birthCity ? `<p>📍 ${currentBirthInfo.birthCity}</p>` : ''}
        </div>
    `;

    const wheel = document.getElementById('natalChartWheel');
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

    const planetsList = document.getElementById('planetsList');
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

    if (currentNatalData.ascendant) {
        const ascDiv = document.createElement('div');
        ascDiv.className = 'ascendant-highlight';
        ascDiv.innerHTML = `
            <h4>Асцендент (восходящий знак)</h4>
            <div class="ascendant-sign">
                <span class="zodiac-symbol-large">${currentNatalData.ascendant.sign?.symbol || '♈'}</span>
                <span>${currentNatalData.ascendant.sign?.name || 'Unknown'}</span>
            </div>
        `;
        planetsList.appendChild(ascDiv);
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
        interpretation += `⬆️ **АСЦЕНДЕНТ: ${ascendant.sign.name.toUpperCase()}**\n\n`;
        interpretation += `Вы производите впечатление человека с качествами ${ascendant.sign.name}.\n\n---\n\n`;
    }

    interpretation += `🔥 **БАЛАНС СТИХИЙ**\n\n`;
    interpretation += `• 🔥 Огонь: ${elementDist['Огонь']} планет\n`;
    interpretation += `• 🌍 Земля: ${elementDist['Земля']} планет\n`;
    interpretation += `• 💨 Воздух: ${elementDist['Воздух']} планет\n`;
    interpretation += `• 💧 Вода: ${elementDist['Вода']} планет\n\n`;
    interpretation += `**Доминирует: ${dominantElement}**\n\n`;
    interpretation += `${elementInterpretations[dominantElement]}\n\n`;

    interpretation += `---\n\n✨ *Натальная карта рассчитана с помощью MysticAI*`;

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