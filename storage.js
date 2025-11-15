// Storage module for localStorage management

const storage = {
    // History storage
    HISTORY_KEY: 'sustainable_food_history',
    POINTS_KEY: 'sustainable_food_points',
    LEVEL_KEY: 'sustainable_food_level',

    // Save product to history
    saveToHistory(product) {
        const history = this.getHistory();
        const historyItem = {
            name: product.product_name || 'Unknown Product',
            image: product.image_front_url || product.image_url || '',
            nutriScore: product.nutriscore_grade || product.nutrition_grades || 'N/A',
            ecoScore: product.ecoscore_grade || 'N/A',
            barcode: product.code || '',
            timestamp: new Date().toISOString()
        };
        
        // Add to beginning of array
        history.unshift(historyItem);
        
        // Keep only last 100 items
        if (history.length > 100) {
            history.pop();
        }
        
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
        return historyItem;
    },

    // Get history
    getHistory() {
        const history = localStorage.getItem(this.HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    },

    // Clear history
    clearHistory() {
        localStorage.removeItem(this.HISTORY_KEY);
    },

    // Get eco points
    getEcoPoints() {
        const points = localStorage.getItem(this.POINTS_KEY);
        return points ? parseInt(points) : 0;
    },

    // Add eco points
    addEcoPoints(points) {
        const currentPoints = this.getEcoPoints();
        const newPoints = currentPoints + points;
        localStorage.setItem(this.POINTS_KEY, newPoints.toString());
        return newPoints;
    },

    // Get level
    getLevel() {
        const points = this.getEcoPoints();
        // Level calculation: every 100 points = 1 level
        return Math.floor(points / 100) + 1;
    },

    // Get points for next level
    getPointsForNextLevel() {
        const points = this.getEcoPoints();
        const currentLevel = this.getLevel();
        const nextLevelPoints = currentLevel * 100;
        return nextLevelPoints - points;
    },

    // Calculate points based on scores
    calculatePoints(nutriScore, ecoScore) {
        const nutri = nutriScore ? nutriScore.toLowerCase() : '';
        const eco = ecoScore ? ecoScore.toLowerCase() : '';
        
        // Both A or B
        if ((nutri === 'a' || nutri === 'b') && (eco === 'a' || eco === 'b')) {
            return 5;
        }
        // One is C
        if (nutri === 'c' || eco === 'c') {
            return 2;
        }
        // D or E
        if (nutri === 'd' || nutri === 'e' || eco === 'd' || eco === 'e') {
            return 0;
        }
        // Default
        return 0;
    }
};

// Make storage available globally
window.storage = storage;
