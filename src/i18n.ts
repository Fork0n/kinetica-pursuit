import { POLYGON_NAMES } from './polygon-names';
export type Language = 'en' | 'ru' | 'ro';

const en = {
    offCenter: 'Off-center navigation', navigateCentered: 'Scroll to zoom · center locked',
    recenter: 'Center', recenterHint: 'Center the camera and restore auto zoom',
    help: 'Explain', close: 'Close', navigate: 'Scroll to zoom · drag to pan',
    pursuit: 'Cyclic pursuit', language: 'Language', time: 'Time', distance: 'Drone distance',
    radius: 'Radius', travelled: 'Travelled', meeting: 'Meeting', state: 'State', shape: 'Shape',
    speed: 'Speed', measurement: 'Measure by', side: 'Side length', perimeter: 'Perimeter / circumference',
    circumference: 'Circumference', zoom: 'Zoom', autoZoom: 'Auto zoom', trails: 'Drone trails',
    outline: 'Polygon outline', center: 'Center point', vectors: 'Velocity vectors', details: 'Physics & accuracy',
    hint: 'Shape and size changes reset the run. Speed changes apply immediately. Manual zoom disables auto zoom.',
    switch: 'Switch', play: 'Play', pause: 'Pause', replay: 'Replay', stop: 'Stop and reset',
    complete: 'Complete', paused: 'Paused', converging: 'Converging', orbit: 'Stable orbit',
    quasi: 'Quasi-orbit', quasiHint: 'Nearly circular motion; a finite polygon still eventually converges.',
    meetingHint: 'Predicted total simulation time at meeting if the current speed continues.',
    radial: 'Radial velocity', tangential: 'Tangential velocity', drones: 'Drones',
    circleNote: 'Ideal circle limit: 64 display samples. The length is the circumference.',
    radiusError: 'Radius error', initialRadius: 'of initial radius', pathError: 'Path error',
    radiusSpread: 'Radius spread', neighborSpread: 'Neighbor-distance spread',
    pathHint: 'Path length uses numerical displacements; circle mode uses exact arc lengths.',
    canvas: 'Cyclic drone pursuit simulation', title: 'Drone pursuit · Wine Dynamics',
    circle: 'Circle / ∞', ngon: '{n}-gon', m: 'm', s: 's', ms: 'm/s',
};
export type TranslationKey = keyof typeof en;
export const translations: Record<Language, Record<TranslationKey, string>> = {
    en,
    ru: {
        offCenter: 'Свободная камера', navigateCentered: 'Колесо — масштаб · центр закреплён',
        recenter: 'В центр', recenterHint: 'Вернуть камеру в центр и включить автомасштаб',
        help: 'Объяснение', close: 'Закрыть', navigate: 'Колесо — масштаб · перетаскивание — сдвиг',
        pursuit: 'Циклическая погоня', language: 'Язык', time: 'Время', distance: 'Между дронами',
        radius: 'Радиус', travelled: 'Пройдено', meeting: 'Встреча', state: 'Состояние', shape: 'Фигура',
        speed: 'Скорость', measurement: 'Задать через', side: 'Длину стороны', perimeter: 'Периметр / длину окружности',
        circumference: 'Длина окружности', zoom: 'Масштаб', autoZoom: 'Автомасштаб', trails: 'Следы дронов',
        outline: 'Контур фигуры', center: 'Центр', vectors: 'Векторы скорости', details: 'Физика и точность',
        hint: 'Изменение фигуры или размера сбрасывает запуск. Скорость меняется сразу. Ручной масштаб отключает автомасштаб.',
        switch: 'Смена', play: 'Старт', pause: 'Пауза', replay: 'Повторить', stop: 'Остановить и сбросить',
        complete: 'Завершено', paused: 'Пауза', converging: 'Сближение', orbit: 'Устойчивая орбита',
        quasi: 'Квазиорбита', quasiHint: 'Движение почти по окружности; при конечном числе сторон дроны всё равно сойдутся.',
        meetingHint: 'Расчётное время встречи от начала симуляции, если текущая скорость не изменится.',
        radial: 'Радиальная скорость', tangential: 'Касательная скорость', drones: 'Дроны',
        circleNote: 'Идеальный круговой предел: 64 точки для отображения. Размер задаёт длину окружности.',
        radiusError: 'Ошибка радиуса', initialRadius: 'от начального радиуса', pathError: 'Ошибка пути',
        radiusSpread: 'Разброс радиусов', neighborSpread: 'Разброс расстояний между соседями',
        pathHint: 'Путь складывается из численных перемещений; для окружности используется точная длина дуги.',
        canvas: 'Симуляция циклической погони дронов', title: 'Погоня дронов · Wine Dynamics',
        circle: 'Окружность / ∞', ngon: '{n}-угольник', m: 'м', s: 'с', ms: 'м/с',
    },
    ro: {
        offCenter: 'Navigare liberă', navigateCentered: 'Derulează pentru scară · centru fix',
        recenter: 'Centrează', recenterHint: 'Recentrează camera și reactivează scara automată',
        help: 'Explicație', close: 'Închide', navigate: 'Derulează pentru scară · trage pentru deplasare',
        pursuit: 'Urmărire ciclică', language: 'Limbă', time: 'Timp', distance: 'Între drone',
        radius: 'Rază', travelled: 'Parcurs', meeting: 'Întâlnire', state: 'Stare', shape: 'Figură',
        speed: 'Viteză', measurement: 'Definește prin', side: 'Lungimea laturii', perimeter: 'Perimetru / circumferință',
        circumference: 'Circumferință', zoom: 'Scară', autoZoom: 'Scară automată', trails: 'Urmele dronelor',
        outline: 'Conturul figurii', center: 'Centru', vectors: 'Vectorii vitezei', details: 'Fizică și precizie',
        hint: 'Schimbarea figurii sau a dimensiunii resetează simularea. Viteza se schimbă imediat. Scara manuală dezactivează ajustarea automată.',
        switch: 'Schimb', play: 'Pornește', pause: 'Pauză', replay: 'Reia de la început', stop: 'Oprește și resetează',
        complete: 'Încheiat', paused: 'Pauză', converging: 'Convergență', orbit: 'Orbită stabilă',
        quasi: 'Cvasi-orbită', quasiHint: 'Mișcare aproape circulară; un poligon finit converge în cele din urmă.',
        meetingHint: 'Timpul total estimat până la întâlnire, dacă viteza curentă rămâne constantă.',
        radial: 'Viteză radială', tangential: 'Viteză tangențială', drones: 'Drone',
        circleNote: 'Limita circulară ideală: 64 de puncte afișate. Dimensiunea reprezintă circumferința.',
        radiusError: 'Eroarea razei', initialRadius: 'din raza inițială', pathError: 'Eroarea drumului',
        radiusSpread: 'Dispersia razelor', neighborSpread: 'Dispersia distanțelor dintre vecini',
        pathHint: 'Drumul însumează deplasările numerice; în modul Cerc se folosește lungimea exactă a arcului.',
        canvas: 'Simularea urmăririi ciclice a dronelor', title: 'Urmărirea dronelor · Wine Dynamics',
        circle: 'Cerc / ∞', ngon: 'Poligon cu {n} laturi', m: 'm', s: 's', ms: 'm/s',
    },
};

export function polygonName(count: number, language: Language) {
    const name = POLYGON_NAMES[count]?.[language];
    if (!name) throw new RangeError('Unsupported polygon count');
    return `${name} · ${count}`;
}
export function savedLanguage(): Language {
    try {
        const value = localStorage.getItem('pursuit-language');
        if (value === 'ru' || value === 'ro') return value;
    } catch { /* Storage can be blocked in private or embedded views. */ }
    return 'en';
}

