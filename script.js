// OpenFoodFacts API
const API_BASE = 'https://world.openfoodfacts.org';

// Validate search query
function validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
        return { valid: false, error: 'Search query is required' };
    }
    
    const trimmed = query.trim();
    
    if (trimmed.length === 0) {
        return { valid: false, error: 'Search query cannot be empty' };
    }
    
    if (trimmed.length > 200) {
        return { valid: false, error: 'Search query is too long (max 200 characters)' };
    }
    

    const dangerousPatterns = /<script|javascript:|onerror=|onclick=/i;
    if (dangerousPatterns.test(trimmed)) {
        return { valid: false, error: 'Invalid search query' };
    }
    
    return { valid: true, query: trimmed };
}


const STORAGE_KEYS = {
    HISTORY: 'foodTracker_history',
    STATS: 'foodTracker_stats'
};

// Get element by ID
const $ = (id) => document.getElementById(id);

// Initialize stats
function initStats() {
    const stats = getStats();
    if (!stats.totalScans) {
        saveStats({
            totalScans: 0,
            ecoPoints: 0,
            healthyChoices: 0,
            achievementsUnlocked: []
        });
    }
}


function getStats() {
    const stats = localStorage.getItem(STORAGE_KEYS.STATS);
    return stats ? JSON.parse(stats) : {
        totalScans: 0,
        ecoPoints: 0,
        healthyChoices: 0,
        achievementsUnlocked: []
    };
}


function saveStats(stats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}


function updateStats(product) {
    const stats = getStats();
    stats.totalScans++;
    
    // Award eco points for good eco-score
    if (product.ecoscore_grade && ['a', 'b'].includes(product.ecoscore_grade.toLowerCase())) {
        stats.ecoPoints += 10;
    }
    
    // Track healthy choices
    if (product.nutriscore_grade && ['a', 'b'].includes(product.nutriscore_grade.toLowerCase())) {
        stats.healthyChoices++;
    }
    
    saveStats(stats);
}


function getHistory() {
    const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return history ? JSON.parse(history) : [];
}


function addToHistory(product) {
    const history = getHistory();
    const existingIndex = history.findIndex(item => item.code === product.code);
    
    const historyItem = {
        code: product.code,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: product.image_url || product.image_front_url || '',
        nutriscoreGrade: product.nutriscore_grade || product.nutrition_grades || 'N/A',
        ecoscoreGrade: product.ecoscore_grade || 'N/A',
        timestamp: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
        history[existingIndex] = historyItem;
    } else {
        history.unshift(historyItem);
    }
    

    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        loadHistory();
    }
}

// Search product
async function searchProduct(query, pageSize = 20) {
    try {
        // Validate input
        const validation = validateSearchQuery(query);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        
        const q = validation.query;
        const isBarcode = /^\d+$/.test(q);
        
        if (isBarcode) {
            // Validate barcode length
            if (q.length < 8 || q.length > 13) {
                alert('Invalid barcode format');
                return;
            }
            
            const response = await fetch(`${API_BASE}/api/v2/product/${encodeURIComponent(q)}`);
            const data = await response.json();
            
            if (data.status === 1 && data.product) {
                // Redirect to product page with validated barcode
                window.location.href = `product.html?barcode=${encodeURIComponent(q)}`;
            } else {
                alert('Product not found with this barcode');
            }
        } else {
            // Use the specified API format with search_simple parameter
            const response = await fetch(
                `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=${pageSize}`
            );
            const data = await response.json();
            
            if (data.products && data.products.length > 0) {
                displaySearchResults(data.products);
            } else {
                alert('No products found');
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed. Please try again.');
    }
}

// Display search results
function displaySearchResults(products) {
    const resultsSection = $('searchResults');
    const resultsGrid = $('resultsGrid');
    const loadingState = $('loadingState');
    
    if (!resultsSection || !resultsGrid) return;
    
    loadingState.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    resultsGrid.innerHTML = products.map(product => `
        <div class="product-item" onclick="viewProduct('${product.code}')">
            <img 
                src="${product.image_url || product.image_front_url || 'placeholder.svg'}" 
                alt="${product.product_name || 'Product'}"
                class="product-item-image"
                onerror="this.src='placeholder.svg'"
            >
            <div class="product-item-content">
                <h3 class="product-item-name">${product.product_name || 'Unknown Product'}</h3>
                <p class="product-item-brand">${product.brands || 'Unknown Brand'}</p>
                <div class="product-item-grades">
                    ${createGradeBadge(product.nutriscore_grade || product.nutrition_grades, 'small')}
                    ${createGradeBadge(product.ecoscore_grade, 'small')}
                </div>
            </div>
        </div>
    `).join('');
}

// Create grade badge HTML
function createGradeBadge(grade, size = '') {
    const gradeValue = grade ? grade.toLowerCase() : 'na';
    const gradeClass = gradeValue === 'na' ? 'grade-na' : `grade-${gradeValue}`;
    const sizeClass = size ? 'small' : '';
    return `<span class="grade-badge ${gradeClass} ${sizeClass}">${gradeValue.toUpperCase()}</span>`;
}

// View product
function viewProduct(barcode) {
    window.location.href = `product.html?barcode=${barcode}`;
}

// Go back
function goBack() {
    window.history.back();
}

// Load product details
async function loadProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const barcode = urlParams.get('barcode');
    
    if (!barcode) {
        window.location.href = 'index.html';
        return;
    }
    
 
    const validation = validateSearchQuery(barcode);
    if (!validation.valid || !/^\d{8,13}$/.test(barcode)) {
        alert('Invalid barcode');
        window.location.href = 'index.html';
        return;
    }
    
    const loadingState = $('productLoading');
    const detailsSection = $('productDetails');
    
    try {
        const response = await fetch(`${API_BASE}/api/v2/product/${encodeURIComponent(barcode)}`);
        const data = await response.json();
        
        if (data.status === 1 && data.product) {
            const product = data.product;
            
            
            updateStats(product);
            addToHistory(product);
            
            
            displayProduct(product);
            
            loadingState.classList.add('hidden');
            detailsSection.classList.remove('hidden');
        } else {
            alert('Product not found');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Load product error:', error);
        alert('Failed to load product');
        window.location.href = 'index.html';
    }
}

// Display product details
function displayProduct(product) {
    // Image and basic info
    const productImage = $('productImage');
    const productName = $('productName');
    const productBrand = $('productBrand');
    
    if (productImage) {
        productImage.src = product.image_front_url || product.image_url || 'placeholder.svg';
        productImage.alt = product.product_name || 'Product';
    }
    
    if (productName) {
        productName.textContent = product.product_name || 'Unknown Product';
    }
    
    if (productBrand && product.brands) {
        productBrand.textContent = product.brands;
    }
    
    // Scores
    const nutriScore = $('nutriScore');
    const ecoScore = $('ecoScore');
    
    if (nutriScore) {
        const grade = product.nutriscore_grade || product.nutrition_grades || 'N/A';
        nutriScore.innerHTML = createGradeBadge(grade);
    }
    
    if (ecoScore) {
        const grade = product.ecoscore_grade || 'N/A';
        ecoScore.innerHTML = createGradeBadge(grade);
    }
    
    // Alerts
    const hasAdditives = product.additives_tags && product.additives_tags.length > 0;
    const hasAllergens = product.allergens_tags && product.allergens_tags.length > 0;
    
    if (hasAdditives || hasAllergens) {
        const alertsCard = $('alertsCard');
        if (alertsCard) {
            alertsCard.classList.remove('hidden');
        }
        
        if (hasAdditives) {
            const additivesSection = $('additivesSection');
            const additivesList = $('additivesList');
            
            if (additivesSection && additivesList) {
                additivesSection.classList.remove('hidden');
                additivesList.innerHTML = product.additives_tags.slice(0, 5).map(additive => 
                    `<span class="badge badge-destructive">${additive.replace('en:', '')}</span>`
                ).join('');
            }
        }
        
        if (hasAllergens) {
            const allergensSection = $('allergensSection');
            const allergensList = $('allergensList');
            
            if (allergensSection && allergensList) {
                allergensSection.classList.remove('hidden');
                allergensList.innerHTML = product.allergens_tags.map(allergen => 
                    `<span class="badge badge-outline">${allergen.replace('en:', '')}</span>`
                ).join('');
            }
        }
    }
    
    // Nutrition facts
    if (product.nutriments) {
        const nutritionSection = $('nutritionSection');
        const nutritionGrid = $('nutritionGrid');
        
        if (nutritionSection && nutritionGrid) {
            const nutrients = [
                { key: 'energy-kcal_100g', label: 'Energy', unit: 'kcal' },
                { key: 'fat_100g', label: 'Fat', unit: 'g' },
                { key: 'saturated-fat_100g', label: 'Saturated Fat', unit: 'g' },
                { key: 'carbohydrates_100g', label: 'Carbohydrates', unit: 'g' },
                { key: 'sugars_100g', label: 'Sugars', unit: 'g' },
                { key: 'proteins_100g', label: 'Proteins', unit: 'g' },
                { key: 'salt_100g', label: 'Salt', unit: 'g' },
                { key: 'fiber_100g', label: 'Fiber', unit: 'g' }
            ];
            
            const nutritionHTML = nutrients
                .filter(nutrient => product.nutriments[nutrient.key] !== undefined)
                .map(nutrient => `
                    <div class="nutrition-item">
                        <div class="nutrition-item-label">${nutrient.label}</div>
                        <div class="nutrition-item-value">
                            ${product.nutriments[nutrient.key].toFixed(1)}
                            <span class="nutrition-item-unit">${nutrient.unit}</span>
                        </div>
                    </div>
                `).join('');
            
            if (nutritionHTML) {
                nutritionGrid.innerHTML = nutritionHTML;
                nutritionSection.classList.remove('hidden');
            }
        }
    }
    
    // Categories
    if (product.categories) {
        const categoriesSection = $('categoriesSection');
        const categoriesList = $('categoriesList');
        
        if (categoriesSection && categoriesList) {
            const categories = product.categories.split(',').slice(0, 8);
            categoriesList.innerHTML = categories.map(category => 
                `<span class="badge badge-secondary">${category.trim()}</span>`
            ).join('');
            categoriesSection.classList.remove('hidden');
        }
    }
}


function loadHistory() {
    const historyList = $('historyList');
    const emptyState = $('emptyState');
    
    if (!historyList || !emptyState) return;
    
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        displayHistoryItems(history);
    }
}


function displayHistoryItems(items) {
    const historyList = $('historyList');
    
    if (!historyList) return;
    
    historyList.innerHTML = items.map(item => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        return `
            <div class="history-item" onclick="viewProduct('${item.code}')">
                <img 
                    src="${item.imageUrl || 'placeholder.svg'}" 
                    alt="${item.name}"
                    class="history-item-image"
                    onerror="this.src='placeholder.svg'"
                >
                <div class="history-item-content">
                    <div class="history-item-header">
                        <h3 class="history-item-name">${item.name}</h3>
                        <span class="history-item-date">${dateStr}</span>
                    </div>
                    ${item.brand ? `<p class="history-item-brand">${item.brand}</p>` : ''}
                    <div class="history-item-grades">
                        ${createGradeBadge(item.nutriscoreGrade, 'small')}
                        ${createGradeBadge(item.ecoscoreGrade, 'small')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}


function filterHistory(filter) {
    const history = getHistory();
    let filtered = history;
    
    if (filter === 'healthy') {
        filtered = history.filter(item => 
            item.nutriscoreGrade && ['a', 'b'].includes(item.nutriscoreGrade.toLowerCase())
        );
    } else if (filter === 'eco') {
        filtered = history.filter(item => 
            item.ecoscoreGrade && ['a', 'b'].includes(item.ecoscoreGrade.toLowerCase())
        );
    }
    
    displayHistoryItems(filtered);
}


function loadProfile() {
    const stats = getStats();
    
    const totalScans = $('totalScans');
    const ecoPoints = $('ecoPoints');
    const healthyChoices = $('healthyChoices');
    const achievementsCount = $('achievementsCount');
    
    if (totalScans) totalScans.textContent = stats.totalScans;
    if (ecoPoints) ecoPoints.textContent = stats.ecoPoints;
    if (healthyChoices) healthyChoices.textContent = stats.healthyChoices;
    if (achievementsCount) achievementsCount.textContent = stats.achievementsUnlocked.length;
    
 
    const recentActivity = $('recentActivity');
    if (recentActivity) {
        const history = getHistory().slice(0, 5);
        
        if (history.length === 0) {
            recentActivity.innerHTML = '<p class="empty-state">No recent activity. Start scanning products!</p>';
        } else {
            recentActivity.innerHTML = history.map(item => {
                const date = new Date(item.timestamp);
                const timeStr = date.toLocaleTimeString();
                
                return `
                    <div class="activity-item">
                        <span class="activity-item-text">Scanned ${item.name}</span>
                        <span class="activity-item-time">${timeStr}</span>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Update achievements
    updateAchievements();
}

// Update achievements
function updateAchievements() {
    const stats = getStats();
    const achievementsList = $('achievementsList');
    
    if (!achievementsList) return;
    
    const achievements = [
        {
            id: 'first_scan',
            icon: 'fa-seedling',
            title: 'Eco Beginner',
            description: 'Scan your first product',
            unlocked: stats.totalScans >= 1
        },
        {
            id: 'eco_warrior',
            icon: 'fa-leaf',
            title: 'Green Warrior',
            description: 'Scan 10 eco-friendly products',
            unlocked: stats.ecoPoints >= 100
        },
        {
            id: 'health_conscious',
            icon: 'fa-heart',
            title: 'Health Conscious',
            description: 'Scan 5 products with A grade',
            unlocked: stats.healthyChoices >= 5
        },
        {
            id: 'streak_master',
            icon: 'fa-fire',
            title: 'Streak Master',
            description: 'Scan products 7 days in a row',
            unlocked: false
        }
    ];
    
    achievementsList.innerHTML = achievements.map(achievement => `
        <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
            <i class="fas ${achievement.icon}"></i>
            <h3>${achievement.title}</h3>
            <p>${achievement.description}</p>
        </div>
    `).join('');
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initStats();
    
    // Search form
    const searchForm = $('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchInput = $('searchInput');
            const query = searchInput.value.trim();
            
            if (query) {
                const loadingState = $('loadingState');
                const searchResults = $('searchResults');
                
                if (loadingState) loadingState.classList.remove('hidden');
                if (searchResults) searchResults.classList.add('hidden');
                
                searchProduct(query);
            }
        });
    }
    
    // Filter buttons in history
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            filterHistory(filter);
        });
    });
});
