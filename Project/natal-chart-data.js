const zodiacSignsNatal = [
    { id: 0, name: 'Овен', nameEn: 'Aries', symbol: '♈', element: 'Огонь', quality: 'Кардинальный', ruler: 'Марс', startDegree: 0 },
    { id: 1, name: 'Телец', nameEn: 'Taurus', symbol: '♉', element: 'Земля', quality: 'Фиксированный', ruler: 'Венера', startDegree: 30 },
    { id: 2, name: 'Близнецы', nameEn: 'Gemini', symbol: '♊', element: 'Воздух', quality: 'Мутабельный', ruler: 'Меркурий', startDegree: 60 },
    { id: 3, name: 'Рак', nameEn: 'Cancer', symbol: '♋', element: 'Вода', quality: 'Кардинальный', ruler: 'Луна', startDegree: 90 },
    { id: 4, name: 'Лев', nameEn: 'Leo', symbol: '♌', element: 'Огонь', quality: 'Фиксированный', ruler: 'Солнце', startDegree: 120 },
    { id: 5, name: 'Дева', nameEn: 'Virgo', symbol: '♍', element: 'Земля', quality: 'Мутабельный', ruler: 'Меркурий', startDegree: 150 },
    { id: 6, name: 'Весы', nameEn: 'Libra', symbol: '♎', element: 'Воздух', quality: 'Кардинальный', ruler: 'Венера', startDegree: 180 },
    { id: 7, name: 'Скорпион', nameEn: 'Scorpio', symbol: '♏', element: 'Вода', quality: 'Фиксированный', ruler: 'Плутон', startDegree: 210 },
    { id: 8, name: 'Стрелец', nameEn: 'Sagittarius', symbol: '♐', element: 'Огонь', quality: 'Мутабельный', ruler: 'Юпитер', startDegree: 240 },
    { id: 9, name: 'Козерог', nameEn: 'Capricorn', symbol: '♑', element: 'Земля', quality: 'Кардинальный', ruler: 'Сатурн', startDegree: 270 },
    { id: 10, name: 'Водолей', nameEn: 'Aquarius', symbol: '♒', element: 'Воздух', quality: 'Фиксированный', ruler: 'Уран', startDegree: 300 },
    { id: 11, name: 'Рыбы', nameEn: 'Pisces', symbol: '♓', element: 'Вода', quality: 'Мутабельный', ruler: 'Нептун', startDegree: 330 }
];

const planets = [
    { id: 'sun', name: 'Солнце', symbol: '☉', meaning: 'Личность, эго, жизненная сила', orbitDays: 365.25 },
    { id: 'moon', name: 'Луна', symbol: '☽', meaning: 'Эмоции, подсознание, инстинкты', orbitDays: 27.3 },
    { id: 'mercury', name: 'Меркурий', symbol: '☿', meaning: 'Коммуникация, интеллект, мышление', orbitDays: 88 },
    { id: 'venus', name: 'Венера', symbol: '♀', meaning: 'Любовь, красота, ценности', orbitDays: 225 },
    { id: 'mars', name: 'Марс', symbol: '♂', meaning: 'Энергия, действие, агрессия', orbitDays: 687 },
    { id: 'jupiter', name: 'Юпитер', symbol: '♃', meaning: 'Расширение, удача, философия', orbitDays: 4333 },
    { id: 'saturn', name: 'Сатурн', symbol: '♄', meaning: 'Дисциплина, ограничения, карма', orbitDays: 10759 },
    { id: 'uranus', name: 'Уран', symbol: '♅', meaning: 'Инновации, неожиданности, свобода', orbitDays: 30687 },
    { id: 'neptune', name: 'Нептун', symbol: '♆', meaning: 'Мечты, иллюзии, духовность', orbitDays: 60190 },
    { id: 'pluto', name: 'Плутон', symbol: '♇', meaning: 'Трансформация, сила, подсознание', orbitDays: 90560 }
];

function calculatePlanetaryPosition(planet, birthDate) {
    const referenceDate = new Date('2000-01-01');
    const targetDate = new Date(birthDate);
    const daysDiff = (targetDate - referenceDate) / (1000 * 60 * 60 * 24);
    const orbitDays = planet.orbitDays;
    const position = ((daysDiff % orbitDays) / orbitDays) * 360;
    return Math.floor(Math.abs(position)) % 360;
}

function getZodiacSignByDegree(degree) {
    const signIndex = Math.floor(degree / 30);
    const degreeInSign = degree % 30;
    return {
        sign: zodiacSignsNatal[signIndex],
        degree: degreeInSign
    };
}

function calculateNatalChart(birthDate, birthTime) {
    const natalData = {
        planets: {},
        ascendant: null,
        sunSign: null,
        moonSign: null
    };

    if (typeof planets === 'undefined' || !planets) {
        console.error('planets array is not defined!');
        return natalData;
    }

    planets.forEach(planet => {
        try {
            const degree = calculatePlanetaryPosition(planet, birthDate);
            const zodiacInfo = getZodiacSignByDegree(degree);

            natalData.planets[planet.id] = {
                planet: planet,
                degree: degree,
                zodiacSign: zodiacInfo.sign,
                degreeInSign: zodiacInfo.degree
            };

            if (planet.id === 'sun') {
                natalData.sunSign = zodiacInfo.sign;
            }
            if (planet.id === 'moon') {
                natalData.moonSign = zodiacInfo.sign;
            }
        } catch (error) {
            console.error(`Error calculating position for ${planet.name}:`, error);
        }
    });

    if (birthTime) {
        try {
            const [hours, minutes] = birthTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            const ascendantDegree = (totalMinutes / 4) % 360;
            natalData.ascendant = getZodiacSignByDegree(ascendantDegree);
        } catch (error) {
            console.error('Error calculating ascendant:', error);
        }
    }

    return natalData;
}

function getElementDistribution(natalData) {
    const distribution = { 'Огонь': 0, 'Земля': 0, 'Воздух': 0, 'Вода': 0 };
    if (natalData && natalData.planets) {
        Object.values(natalData.planets).forEach(planetData => {
            if (planetData && planetData.zodiacSign && planetData.zodiacSign.element) {
                distribution[planetData.zodiacSign.element]++;
            }
        });
    }
    return distribution;
}