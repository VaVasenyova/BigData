const zodiacSigns = [
    { id: 1, name: 'Овен', nameEn: 'Aries', symbol: '♈', dates: '21 марта - 19 апреля', element: 'Огонь', planet: 'Марс' },
    { id: 2, name: 'Телец', nameEn: 'Taurus', symbol: '♉', dates: '20 апреля - 20 мая', element: 'Земля', planet: 'Венера' },
    { id: 3, name: 'Близнецы', nameEn: 'Gemini', symbol: '♊', dates: '21 мая - 20 июня', element: 'Воздух', planet: 'Меркурий' },
    { id: 4, name: 'Рак', nameEn: 'Cancer', symbol: '♋', dates: '21 июня - 22 июля', element: 'Вода', planet: 'Луна' },
    { id: 5, name: 'Лев', nameEn: 'Leo', symbol: '♌', dates: '23 июля - 22 августа', element: 'Огонь', planet: 'Солнце' },
    { id: 6, name: 'Дева', nameEn: 'Virgo', symbol: '♍', dates: '23 августа - 22 сентября', element: 'Земля', planet: 'Меркурий' },
    { id: 7, name: 'Весы', nameEn: 'Libra', symbol: '♎', dates: '23 сентября - 22 октября', element: 'Воздух', planet: 'Венера' },
    { id: 8, name: 'Скорпион', nameEn: 'Scorpio', symbol: '♏', dates: '23 октября - 21 ноября', element: 'Вода', planet: 'Плутон' },
    { id: 9, name: 'Стрелец', nameEn: 'Sagittarius', symbol: '♐', dates: '22 ноября - 21 декабря', element: 'Огонь', planet: 'Юпитер' },
    { id: 10, name: 'Козерог', nameEn: 'Capricorn', symbol: '♑', dates: '22 декабря - 19 января', element: 'Земля', planet: 'Сатурн' },
    { id: 11, name: 'Водолей', nameEn: 'Aquarius', symbol: '♒', dates: '20 января - 18 февраля', element: 'Воздух', planet: 'Уран' },
    { id: 12, name: 'Рыбы', nameEn: 'Pisces', symbol: '♓', dates: '19 февраля - 20 марта', element: 'Вода', planet: 'Нептун' }
];

function getZodiacSignById(id) {
    return zodiacSigns.find(sign => sign.id === parseInt(id));
}