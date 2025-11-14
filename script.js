const API_BASE = 'https://world.openfoodfacts.org';


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

const $ = (id) => document.getElementById(id);

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
    

    if (product.ecoscore_grade && ['a', 'b'].includes(product.ecoscore_grade.toLowerCase())) {
        stats.ecoPoints += 10;
    }

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


window.clearHistory = function() {
    if (confirm('Are you sure you want to clear all history?')) {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
        loadHistory();
    }
}


function extractKeywords(query) {

    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
    return words;
}


function highlightKeywords(text, keywords) {
    if (!text || !keywords || keywords.length === 0) return text;
    
    let highlighted = text;
    keywords.forEach(keyword => {
        const regex = new RegExp((${keyword}), 'gi');
        highlighted = highlighted.replace(regex, '<mark class="keyword-highlight">$1</mark>');
    });
    return highlighted;
}


async function searchProduct(query, pageSize = 20) {
    try {
     
        const validation = validateSearchQuery(query);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        
        const q = validation.query;
        const isBarcode = /^\d+$/.test(q);
        
        
        const keywords = extractKeywords(q);
        
        if (isBarcode) {
           
            if (q.length < 8 || q.length > 13) {
                alert('Invalid barcode format');
                return;
            }
            
            const response = await fetch(${API_BASE}/api/v2/product/${encodeURIComponent(q)});
            const data = await response.json();
            
            if (data.status === 1 && data.product) {
                
                window.location.href = product.html?barcode=${encodeURIComponent(q)};
            } else {
                alert('Product not found with this barcode');
            }
        } else {
            
            const response = await fetch(
                ${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=${pageSize}
            );
            
            if (!response.ok) {
                throw new Error(API error: ${response.status});
            }
            
            const data = await response.json();
            
            if (data.products && data.products.length > 0) {
                displaySearchResults(data.products, keywords);
            } else {
                alert('No products found');
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed. Please try again.');
    }
}


function displaySearchResults(products, keywords = []) {
    const resultsSection = $('searchResults');
    const resultsGrid = $('resultsGrid');
    const loadingState = $('loadingState');
    
    if (!resultsSection || !resultsGrid) return;
    
    loadingState.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    resultsGrid.innerHTML = products.map(product => {
        const productName = product.product_name || 'Unknown Product';
        const brand = product.brands || 'Unknown Brand';
        const highlightedName = highlightKeywords(productName, keywords);
        const highlightedBrand = highlightKeywords(brand, keywords);
        
        return `
        <div class="product-item" onclick="viewProduct('${product.code}')">
            <img 
                src="${product.image_url || product.image_front_url || 'placeholder.svg'}" 
                alt="${productName}"
                class="product-item-image"
                onerror="this.src='placeholder.svg'"
            >
            <div class="product-item-content">
                <h3 class="product-item-name">${highlightedName}</h3>
                <p class="product-item-brand">${highlightedBrand}</p>
                <div class="product-item-grades">
                    ${createGradeBadge(product.nutriscore_grade || product.nutrition_grades, 'small')}
                    ${createGradeBadge(product.ecoscore_grade, 'small')}
                </div>
            </div>
        </div>
        `;
    }).join('');
}


function getNutriScoreFromValue(score) {
    if (score === null || score === undefined) return null;
    // Nutri-Score ranges: A: -15 to -1, B: 0 to 2, C: 3 to 10, D: 11 to 18, E: 19+
    if (score <= -1) return 'a';
    if (score <= 2) return 'b';
    if (score <= 10) return 'c';
    if (score <= 18) return 'd';
    return 'e';
}


function createGradeBadge(grade, size = '') {
    if (!grade || grade === 'N/A' || grade === 'null' || grade === 'undefined') {
        const sizeClass = size ? 'small' : '';
        return <span class="grade-badge grade-na ${sizeClass}">N/A</span>;
    }
    
    const gradeValue = String(grade).toLowerCase().trim();
    
    if (!isNaN(gradeValue) && gradeValue !== '') {
        const numGrade = parseInt(gradeValue);
        const letterGrade = getNutriScoreFromValue(numGrade);
        if (letterGrade) {
            const gradeClass = grade-${letterGrade};
            const sizeClass = size ? 'small' : '';
            return <span class="grade-badge ${gradeClass} ${sizeClass}">${letterGrade.toUpperCase()}</span>;
        }
    }
    

    const validGrades = ['a', 'b', 'c', 'd', 'e'];
    const normalizedGrade = gradeValue.length === 1 ? gradeValue : gradeValue.charAt(0);
    const gradeClass = validGrades.includes(normalizedGrade) ? grade-${normalizedGrade} : 'grade-na';
    const sizeClass = size ? 'small' : '';
    const displayGrade = validGrades.includes(normalizedGrade) ? normalizedGrade.toUpperCase() : 'N/A';
    
    return <span class="grade-badge ${gradeClass} ${sizeClass}">${displayGrade}</span>;
}


window.viewProduct = function(barcode) {
    window.location.href = product.html?barcode=${barcode};
}


window.goBack = function() {
    window.history.back();
}

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
        const response = await fetch(${API_BASE}/api/v2/product/${encodeURIComponent(barcode)});
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


function displayProduct(product) {
    console.log('Displaying product:', product);
    
    
    const productImage = $('productImage');
    const productName = $('productName');
    const productBrand = $('productBrand');
    
    if (productImage) {
        productImage.src = product.image_front_url || product.image_url || product.image_front_small_url || 'placeholder.svg';
        productImage.alt = product.product_name || 'Product';
        productImage.onerror = function() {
            this.src = 'placeholder.svg';
        };
    }
    
    if (productName) {
        productName.textContent = product.product_name || product.product_name_en || 'Unknown Product';
    }
    
    if (productBrand) {
        const brands = product.brands || product.brands_tags?.join(', ') || product.brand || '';
        productBrand.textContent = brands;
    }
    
    
    const nutriScore = $('nutriScore');
    const ecoScore = $('ecoScore');
    
    if (nutriScore) {
       
        let grade = product.nutriscore_grade || 
                   product.nutrition_grades || 
                   product.nutrition_grade_fr ||
                   product.nutriscore_data?.grade;
        
       
        if (!grade && product.nutriments && product.nutriments['nutrition-score-fr'] !== undefined) {
            grade = getNutriScoreFromValue(product.nutriments['nutrition-score-fr']);
        }
        
        
        if (!grade && product.nutriscore_data) {
            grade = product.nutriscore_data.grade || 
                   (product.nutriscore_data.score !== undefined ? 
                    getNutriScoreFromValue(product.nutriscore_data.score) : null);
        }
        
        console.log('Nutri-Score grade:', grade, 'Product data:', {
            nutriscore_grade: product.nutriscore_grade,
            nutrition_grades: product.nutrition_grades,
            nutriscore_data: product.nutriscore_data,
            nutrition_score: product.nutriments?.['nutrition-score-fr']
        });
        nutriScore.innerHTML = createGradeBadge(grade || 'N/A');
    }
    
    if (ecoScore) {
        
        let grade = product.ecoscore_grade || 
                   product.ecoscore_data?.grade ||
                   product.environment_impact_level;
        
        
        if (!grade && product.ecoscore_data) {
            grade = product.ecoscore_data.grade || 
                   product.ecoscore_data.score ||
                   product.ecoscore_data.adjusted_grade;
        }
        
        console.log('Eco-Score grade:', grade, 'Product data:', {
            ecoscore_grade: product.ecoscore_grade,
            ecoscore_data: product.ecoscore_data,
            environment_impact_level: product.environment_impact_level
        });
        ecoScore.innerHTML = createGradeBadge(grade || 'N/A');
    }
    
    
    const scoresCard = document.querySelector('.scores-card');
    if (scoresCard) {
        scoresCard.style.display = 'block';
    }
    
  
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
                    <span class="badge badge-destructive">${additive.replace('en:', '')}</span>
                ).join('');
            }
        }
        
        if (hasAllergens) {
            const allergensSection = $('allergensSection');
            const allergensList = $('allergensList');
            
            if (allergensSection && allergensList) {
                allergensSection.classList.remove('hidden');
                allergensList.innerHTML = product.allergens_tags.map(allergen => 
                    <span class="badge badge-outline">${allergen.replace('en:', '')}</span>
                ).join('');
            }
        }
    }
    
    
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
        
        if (product.nutriments) {
            const availableNutrients = nutrients.filter(nutrient => 
                product.nutriments[nutrient.key] !== undefined && 
                product.nutriments[nutrient.key] !== null &&
                !isNaN(product.nutriments[nutrient.key])
            );
            
            if (availableNutrients.length > 0) {
                const nutritionHTML = availableNutrients
                    .map(nutrient => `
                        <div class="nutrition-item">
                            <div class="nutrition-item-label">${nutrient.label}</div>
                            <div class="nutrition-item-value">
                                ${product.nutriments[nutrient.key].toFixed(1)}
                                <span class="nutrition-item-unit">${nutrient.unit}</span>
                            </div>
                        </div>
                    `).join('');
                
                nutritionGrid.innerHTML = nutritionHTML;
                nutritionSection.classList.remove('hidden');
                
                
                createNutritionCharts(product.nutriments, availableNutrients);
            } else {
               
                nutritionGrid.innerHTML = '<p class="empty-state">Nutrition information not available for this product.</p>';
                nutritionSection.classList.remove('hidden');
            }
        } else {
            
            nutritionGrid.innerHTML = '<p class="empty-state">Nutrition information not available for this product.</p>';
            nutritionSection.classList.remove('hidden');
        }
    }
    
   
    if (product.categories) {
        const categoriesSection = $('categoriesSection');
        const categoriesList = $('categoriesList');
        
        if (categoriesSection && categoriesList) {
            const categories = product.categories.split(',').slice(0, 8);
            categoriesList.innerHTML = categories.map(category => 
                <span class="badge badge-secondary">${category.trim()}</span>
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
                    ${item.brand ? <p class="history-item-brand">${item.brand}</p> : ''}
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
    
    
    updateAchievements();
}


function createNutritionCharts(nutriments, nutrients) {
    
    const existingCharts = document.querySelectorAll('.nutrition-chart-container');
    existingCharts.forEach(chart => chart.remove());
    
    const nutritionSection = $('nutritionSection');
    if (!nutritionSection) return;
    
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'nutrition-chart-container';
    chartContainer.innerHTML = `
        <h3 class="section-title">
            <i class="fas fa-chart-pie"></i>
            Nutrition Visualization
        </h3>
        <div class="charts-grid">
            <div class="chart-wrapper">
                <canvas id="macronutrientsChart"></canvas>
            </div>
            <div class="chart-wrapper">
                <canvas id="nutritionBarChart"></canvas>
            </div>
        </div>
    `;
    nutritionSection.appendChild(chartContainer);
    
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    
    const macroData = {
        fat: nutriments['fat_100g'] || 0,
        carbs: nutriments['carbohydrates_100g'] || 0,
        protein: nutriments['proteins_100g'] || 0,
        fiber: nutriments['fiber_100g'] || 0
    };
    
    const macroCtx = document.getElementById('macronutrientsChart');
    if (macroCtx) {
        new Chart(macroCtx, {
            type: 'doughnut',
            data: {
                labels: ['Fat', 'Carbohydrates', 'Protein', 'Fiber'],
                datasets: [{
                    data: [macroData.fat, macroData.carbs, macroData.protein, macroData.fiber],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Macronutrients Distribution (per 100g)'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
   
    const barCtx = document.getElementById('nutritionBarChart');
    if (barCtx) {
        const barLabels = nutrients
            .filter(n => ['fat_100g', 'saturated-fat_100g', 'sugars_100g', 'salt_100g'].includes(n.key))
            .map(n => n.label);
        const barData = nutrients
            .filter(n => ['fat_100g', 'saturated-fat_100g', 'sugars_100g', 'salt_100g'].includes(n.key))
            .map(n => nutriments[n.key]);
        
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [{
                    label: 'Amount (g)',
                    data: barData,
                    backgroundColor: 'rgba(34, 139, 34, 0.8)',
                    borderColor: 'rgba(34, 139, 34, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Key Nutrients (per 100g)'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}


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


document.addEventListener('DOMContentLoaded', () => {
    initStats();
    
   
    const searchForm = $('searchForm');
    const searchInput = $('searchInput');
    const searchButton = searchForm ? searchForm.querySelector('.search-button') : null;
    
    
    if (searchInput) {
        searchInput.removeAttribute('disabled');
        searchInput.removeAttribute('readonly');
        searchInput.style.pointerEvents = 'auto';
        searchInput.style.cursor = 'text';
        
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
        
       
        searchInput.addEventListener('input', (e) => {
           
            console.log('Input value:', e.target.value);
        });
    }
    
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSearch();
        });
    }
    
    
    if (searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleSearch();
        });
    }
    
    
    function handleSearch() {
        if (!searchInput) return;
        
        const query = searchInput.value.trim();
        console.log('Search query:', query);
        
        if (query) {
            const loadingState = $('loadingState');
            const searchResults = $('searchResults');
            
            if (loadingState) loadingState.classList.remove('hidden');
            if (searchResults) searchResults.classList.add('hidden');
            
            searchProduct(query);
        } else {
            alert('Please enter a product name or barcode');
        }
    }
    
    
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
