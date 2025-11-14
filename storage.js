export function saveHistory(product){
    if (!product) return;

    const previousHistory = JSON.parse(localStorage.getItem('history')) || [];
    previousHistory.push(product);

    localStorage.setItem('history', JSON.stringify(previousHistory));
}

export function getHistory(){
    return JSON.parse(localStorage.getItem('history')) || [];
}

export function saveEcopoints(points){
    if (typeof points !== 'number') return;
    localStorage.setItem('ecopoints', points);
}

export function getEcopoints(){
    return Number(localStorage.getItem('ecopoints')) || 0;
}

export function clearHistory(){
    localStorage.removeItem('history');
}

export function clearEcopoints(){
    localStorage.removeItem('ecopoints');
};

