const zodiacSigns = [
    { id: 1, name: 'Aries', nameEn: 'Aries', symbol: '♈', dates: 'Mar 21 - Apr 19', element: 'Fire', planet: 'Mars' },
    { id: 2, name: 'Taurus', nameEn: 'Taurus', symbol: '♉', dates: 'Apr 20 - May 20', element: 'Earth', planet: 'Venus' },
    { id: 3, name: 'Gemini', nameEn: 'Gemini', symbol: '♊', dates: 'May 21 - Jun 20', element: 'Air', planet: 'Mercury' },
    { id: 4, name: 'Cancer', nameEn: 'Cancer', symbol: '♋', dates: 'Jun 21 - Jul 22', element: 'Water', planet: 'Moon' },
    { id: 5, name: 'Leo', nameEn: 'Leo', symbol: '♌', dates: 'Jul 23 - Aug 22', element: 'Fire', planet: 'Sun' },
    { id: 6, name: 'Virgo', nameEn: 'Virgo', symbol: '♍', dates: 'Aug 23 - Sep 22', element: 'Earth', planet: 'Mercury' },
    { id: 7, name: 'Libra', nameEn: 'Libra', symbol: '♎', dates: 'Sep 23 - Oct 22', element: 'Air', planet: 'Venus' },
    { id: 8, name: 'Scorpio', nameEn: 'Scorpio', symbol: '♏', dates: 'Oct 23 - Nov 21', element: 'Water', planet: 'Pluto' },
    { id: 9, name: 'Sagittarius', nameEn: 'Sagittarius', symbol: '♐', dates: 'Nov 22 - Dec 21', element: 'Fire', planet: 'Jupiter' },
    { id: 10, name: 'Capricorn', nameEn: 'Capricorn', symbol: '♑', dates: 'Dec 22 - Jan 19', element: 'Earth', planet: 'Saturn' },
    { id: 11, name: 'Aquarius', nameEn: 'Aquarius', symbol: '♒', dates: 'Jan 20 - Feb 18', element: 'Air', planet: 'Uranus' },
    { id: 12, name: 'Pisces', nameEn: 'Pisces', symbol: '♓', dates: 'Feb 19 - Mar 20', element: 'Water', planet: 'Neptune' }
];

function getZodiacSignById(id) {
    return zodiacSigns.find(sign => sign.id === parseInt(id));
}