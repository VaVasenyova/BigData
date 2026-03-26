const zodiacSignsNatal = [
    { id: 0, name: 'Aries', nameEn: 'Aries', symbol: '♈', element: 'Fire', quality: 'Cardinal', ruler: 'Mars', startDegree: 0 },
    { id: 1, name: 'Taurus', nameEn: 'Taurus', symbol: '♉', element: 'Earth', quality: 'Fixed', ruler: 'Venus', startDegree: 30 },
    { id: 2, name: 'Gemini', nameEn: 'Gemini', symbol: '♊', element: 'Air', quality: 'Mutable', ruler: 'Mercury', startDegree: 60 },
    { id: 3, name: 'Cancer', nameEn: 'Cancer', symbol: '♋', element: 'Water', quality: 'Cardinal', ruler: 'Moon', startDegree: 90 },
    { id: 4, name: 'Leo', nameEn: 'Leo', symbol: '♌', element: 'Fire', quality: 'Fixed', ruler: 'Sun', startDegree: 120 },
    { id: 5, name: 'Virgo', nameEn: 'Virgo', symbol: '♍', element: 'Earth', quality: 'Mutable', ruler: 'Mercury', startDegree: 150 },
    { id: 6, name: 'Libra', nameEn: 'Libra', symbol: '♎', element: 'Air', quality: 'Cardinal', ruler: 'Venus', startDegree: 180 },
    { id: 7, name: 'Scorpio', nameEn: 'Scorpio', symbol: '♏', element: 'Water', quality: 'Fixed', ruler: 'Pluto', startDegree: 210 },
    { id: 8, name: 'Sagittarius', nameEn: 'Sagittarius', symbol: '♐', element: 'Fire', quality: 'Mutable', ruler: 'Jupiter', startDegree: 240 },
    { id: 9, name: 'Capricorn', nameEn: 'Capricorn', symbol: '♑', element: 'Earth', quality: 'Cardinal', ruler: 'Saturn', startDegree: 270 },
    { id: 10, name: 'Aquarius', nameEn: 'Aquarius', symbol: '♒', element: 'Air', quality: 'Fixed', ruler: 'Uranus', startDegree: 300 },
    { id: 11, name: 'Pisces', nameEn: 'Pisces', symbol: '♓', element: 'Water', quality: 'Mutable', ruler: 'Neptune', startDegree: 330 }
];

const planets = [
    { id: 'sun', name: 'Sun', symbol: '☉', meaning: 'Personality, ego, life force', orbitDays: 365.25 },
    { id: 'moon', name: 'Moon', symbol: '☽', meaning: 'Emotions, subconscious, instincts', orbitDays: 27.3 },
    { id: 'mercury', name: 'Mercury', symbol: '☿', meaning: 'Communication, intellect, thinking', orbitDays: 88 },
    { id: 'venus', name: 'Venus', symbol: '♀', meaning: 'Love, beauty, values', orbitDays: 225 },
    { id: 'mars', name: 'Mars', symbol: '♂', meaning: 'Energy, action, drive', orbitDays: 687 },
    { id: 'jupiter', name: 'Jupiter', symbol: '♃', meaning: 'Expansion, luck, philosophy', orbitDays: 4333 },
    { id: 'saturn', name: 'Saturn', symbol: '♄', meaning: 'Discipline, limits, karma', orbitDays: 10759 },
    { id: 'uranus', name: 'Uranus', symbol: '♅', meaning: 'Innovation, surprises, freedom', orbitDays: 30687 },
    { id: 'neptune', name: 'Neptune', symbol: '♆', meaning: 'Dreams, illusions, spirituality', orbitDays: 60190 },
    { id: 'pluto', name: 'Pluto', symbol: '♇', meaning: 'Transformation, power, subconscious', orbitDays: 90560 }
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
    const distribution = { 'Fire': 0, 'Earth': 0, 'Air': 0, 'Water': 0 };
    if (natalData && natalData.planets) {
        Object.values(natalData.planets).forEach(planetData => {
            if (planetData && planetData.zodiacSign && planetData.zodiacSign.element) {
                distribution[planetData.zodiacSign.element]++;
            }
        });
    }
    return distribution;
}