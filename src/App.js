const API_BASE = 'https://world.openfoodfacts.org';


const $ = (id) => document.getElementById(id);


document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
});


function initHomePage() {
    const searchForm = $('searchForm');
    const searchInput = $('searchInput');
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                handleSearch(query);
            }
        });
    }
}


async function handleSearch(query) {
    const loadingState = $('loadingState');
    const searchResults = $('searchResults');
    
    if (loadingState) loadingState.classList.remove('hidden');
    if (searchResults) searchResults.classList.add('hidden');
    
    
    if (/^\d+$/.test(query)) {
        
        window.location.href = product.html?barcode=${query};
    } else {
    
        await searchProducts(query);
    }
}


async function searchProducts(query) {
    try {
        const response = await fetch(
            ${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=20
        );
        
        if (!response.ok) {
            throw new Error(API error: ${response.status});
        }
        
        const data = await response.json();
        displaySearchResults(data.products || []);
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed. Please try again.');
    } finally {
        const loadingState = $('loadingState');
        if (loadingState) loadingState.classList.add('hidden');
    }
}


function displaySearchResults(products) {
    const resultsSection = $('searchResults');
    const resultsGrid = $('resultsGrid');
    
    if (!resultsSection || !resultsGrid) return;
    
    if (products.length === 0) {
        resultsGrid.innerHTML = '<p class="empty-state">No products found. Try a different search term.</p>';
        resultsSection.classList.remove('hidden');
        return;
    }
    
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
    
    resultsSection.classList.remove('hidden');
}


function createGradeBadge(grade, size = '') {
    if (!grade || grade === 'N/A') {
        return <span class="grade-badge grade-na ${size}">N/A</span>;
    }
    
    const gradeValue = String(grade).toLowerCase().trim();
    const validGrades = ['a', 'b', 'c', 'd', 'e'];
    const normalizedGrade = gradeValue.length === 1 ? gradeValue : gradeValue.charAt(0);
    const gradeClass = validGrades.includes(normalizedGrade) ? grade-${normalizedGrade} : 'grade-na';
    const displayGrade = validGrades.includes(normalizedGrade) ? normalizedGrade.toUpperCase() : 'N/A';
    
    return <span class="grade-badge ${gradeClass} ${size}">${displayGrade}</span>;
}


window.viewProduct = function(barcode) {
    window.location.href = product.html?barcode=${barcode};
};


window.goBack = function() {
    window.history.back();
};


async function loadProduct(barcode) {
    const loadingState = $('productLoading');
    const detailsSection = $('productDetails');
    
    if (!barcode) {
        alert('No barcode provided');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        console.log('Loading product with barcode:', barcode);
        
        
        let response;
        let data;
        let success = false;
        
      
        try {
            console.log('Trying API v2...');
            const url = ${API_BASE}/api/v2/product/${encodeURIComponent(barcode)};
            console.log('Fetching from:', url);
            
            response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(HTTP ${response.status}: ${response.statusText});
            }
            
            data = await response.json();
            console.log('API v2 response:', data);
            
            if (data.status === 1 && data.product) {
                success = true;
            }
        } catch (fetchError) {
            console.warn('API v2 failed:', fetchError.message);
        }
        
        
        if (!success) {
            try {
                console.log('Trying API v0...');
                const url = ${API_BASE}/api/v0/product/${encodeURIComponent(barcode)}.json;
                console.log('Fetching from:', url);
                
                response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(HTTP ${response.status}: ${response.statusText});
                }
                
                data = await response.json();
                console.log('API v0 response:', data);
                
                if (data.product) {
                    success = true;
                }
            } catch (v0Error) {
                console.warn('API v0 failed:', v0Error.message);
            }
        }
        
        
        if (!success) {
            try {
                console.log('Trying JSON endpoint...');
                const url = ${API_BASE}/cgi/product.pl?code=${encodeURIComponent(barcode)}&action=display&json=1;
                console.log('Fetching from:', url);
                
                response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(HTTP ${response.status}: ${response.statusText});
                }
                
                data = await response.json();
                console.log('JSON endpoint response:', data);
                
                if (data.product) {
                    success = true;
                }
            } catch (jsonError) {
                console.warn('JSON endpoint failed:', jsonError.message);
            }
        }
        
        
        if (!success) {
            try {
                console.log('Trying search by barcode as fallback...');
                const url = ${API_BASE}/cgi/search.pl?code=${encodeURIComponent(barcode)}&json=1&page_size=1;
                console.log('Fetching from:', url);
                
                response = await fetch(url);
                
                if (response.ok) {
                    data = await response.json();
                    console.log('Search by barcode response:', data);
                    
                    if (data.products && data.products.length > 0) {
                       
                        const exactMatch = data.products.find(p => p.code === barcode);
                        if (exactMatch) {
                            data = { product: exactMatch };
                            success = true;
                        } else if (data.products[0]) {
                            
                            data = { product: data.products[0] };
                            success = true;
                        }
                    }
                }
            } catch (searchError) {
                console.warn('Search by barcode failed:', searchError.message);
            }
        }
        
        
        if (!success && barcode.length === 8) {
            try {
                console.log('Trying with padded zeros for EAN-8...');
                
                const paddedBarcodes = [
                    '0' + barcode, 
                    '00' + barcode,
                    '000' + barcode, 
                    '0000' + barcode, 
                    '00000' + barcode 
                ];
                
                for (const paddedBarcode of paddedBarcodes) {
                    try {
                        const url = ${API_BASE}/api/v2/product/${encodeURIComponent(paddedBarcode)};
                        response = await fetch(url);
                        
                        if (response.ok) {
                            const paddedData = await response.json();
                            if (paddedData.status === 1 && paddedData.product) {
                                data = paddedData;
                                success = true;
                                console.log('Found product with padded barcode:', paddedBarcode);
                                break;
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                }
            } catch (padError) {
                console.warn('Padded barcode search failed:', padError.message);
            }
        }
        
        if (success && data && data.product) {
            const product = data.product;
            
            console.log('Product loaded successfully:', product);
            console.log('Product keys:', Object.keys(product));
            
            
            const historyItem = storage.saveToHistory(product);
            
            
            const nutriGrade = product.nutriscore_grade || product.nutrition_grades || product.nutriscore_data?.grade;
            const ecoGrade = product.ecoscore_grade || product.ecoscore_data?.grade;
            const points = storage.calculatePoints(nutriGrade, ecoGrade);
            storage.addEcoPoints(points);
            
            
            displayProduct(product);
            
            if (loadingState) loadingState.classList.add('hidden');
            if (detailsSection) detailsSection.classList.remove('hidden');
        } else {
            console.error('Product not found. Final data:', data);
            console.error('Barcode tried:', barcode);
            
            
            const testBarcodes = [
                '3017620422003',
                '7622210945078', 
                '3017620429484', 
                '5000159461125'  
            ];
            
            let message = Product not found for barcode: ${barcode}\n\n;
            
            if (barcode.length < 8) {
                message += ⚠️ This barcode is too short (${barcode.length} digits).\n;
                message += Valid barcodes are usually 8-13 digits.\n\n;
            } else if (barcode.length === 8) {
                message += ⚠️ This is an EAN-8 barcode.\n;
                message += The product might not be in the database, or the barcode format might be different.\n\n;
            }
            
            message += Options:\n;
            message += 1. Try these test barcodes: ${testBarcodes.join(', ')}\n;
            message += 2. Search by product name instead\n;
            message += 3. Try scanning a different product;
            
            
            if (confirm(message + '\n\nClick OK to go back to search, or Cancel to stay here.')) {
                window.location.href = 'index.html';
            } else {
                if (loadingState) loadingState.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Load product error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        
        let errorMessage = 'Failed to load product. ';
        
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') || 
            error.name === 'TypeError' ||
            error.message.includes('network')) {
            errorMessage += 'Network error detected.\n\n';
            errorMessage += 'Possible causes:\n';
            errorMessage += '1. No internet connection\n';
            errorMessage += '2. OpenFoodFacts API is temporarily down\n';
            errorMessage += '3. Firewall or security software blocking requests\n';
            errorMessage += '4. Make sure you are using http://localhost:8000\n\n';
            errorMessage += 'Please:\n';
            errorMessage += '- Check your internet connection\n';
            errorMessage += '- Try again in a few moments\n';
            errorMessage += '- Or search by product name instead';
        } else if (error.message.includes('CORS')) {
            errorMessage += 'CORS error detected.\n\n';
            errorMessage += 'Make sure you are accessing the app via:\n';
            errorMessage += '- http://localhost:8000 (not file://)\n';
            errorMessage += '- Or a proper web server';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
            errorMessage += '\n\nCheck browser console (F12) for more details.';
        }
        
        alert(errorMessage);
        if (loadingState) loadingState.classList.add('hidden');
    }
}


function displayProduct(product) {
    console.log('Displaying product with full data:', product);
    
   
    const productImage = $('productImage');
    const productName = $('productName');
    const productBrand = $('productBrand');
    
    if (productImage) {
        productImage.src = product.image_front_url || 
                          product.image_url || 
                          product.image_front_small_url ||
                          product.image_small_url ||
                          'placeholder.svg';
        productImage.alt = product.product_name || 'Product';
        productImage.onerror = function() {
            this.src = 'placeholder.svg';
        };
    }
    
    if (productName) {
        productName.textContent = product.product_name || 
                                  product.product_name_en || 
                                  product.product_name_fr ||
                                  'Unknown Product';
    }
    
    if (productBrand) {
        const brands = product.brands || 
                      product.brand || 
                      (product.brands_tags ? product.brands_tags.join(', ') : '') ||
                      '';
        productBrand.textContent = brands;
    }
    
    
    const scoresCard = document.querySelector('.scores-card');
    if (scoresCard) {
        scoresCard.style.display = 'block';
    }
    
    const nutriScore = $('nutriScore');
    const ecoScore = $('ecoScore');
    const co2Score = $('co2Value');
    
    
    console.log('=== SCORE EXTRACTION DEBUG ===');
    console.log('nutriscore_grade:', product.nutriscore_grade);
    console.log('nutrition_grades:', product.nutrition_grades);
    console.log('nutrition_grade_fr:', product.nutrition_grade_fr);
    console.log('nutriscore_data:', product.nutriscore_data);
    console.log('ecoscore_grade:', product.ecoscore_grade);
    console.log('ecoscore_data:', product.ecoscore_data);
    console.log('nutriments:', product.nutriments ? Object.keys(product.nutriments) : 'none');
    
    if (nutriScore) {
        
        let grade = product.nutriscore_grade || 
                   product.nutrition_grades || 
                   product.nutrition_grade_fr ||
                   product.nutriscore_data?.grade;
        
        
        if (!grade && product.nutriscore_data) {
            grade = product.nutriscore_data.grade || product.nutriscore_data.score;
        }
        
        
        if (!grade && product.nutriments) {
            const score = product.nutriments['nutrition-score-fr'] || 
                         product.nutriments['nutrition-score-fr_100g'] ||
                         product.nutriments['nutrition-score-fr_value'];
            
            if (score !== undefined && score !== null) {
                
                const numScore = parseFloat(score);
                if (!isNaN(numScore)) {
                    if (numScore <= -1) grade = 'a';
                    else if (numScore <= 2) grade = 'b';
                    else if (numScore <= 10) grade = 'c';
                    else if (numScore <= 18) grade = 'd';
                    else grade = 'e';
                }
            }
        }
        
        console.log('Final NutriScore:', grade);
        nutriScore.innerHTML = createGradeBadge(grade || 'N/A');
    }
    
    if (ecoScore) {
        
        let grade = product.ecoscore_grade || 
                   product.ecoscore_data?.grade ||
                   product.environment_impact_level;
        
        
        if (!grade && product.ecoscore_data) {
            grade = product.ecoscore_data.grade || 
                   product.ecoscore_data.adjusted_grade ||
                   product.ecoscore_data.score;
        }
        
        console.log('Final EcoScore:', grade);
        ecoScore.innerHTML = createGradeBadge(grade || 'N/A');
    }
    
  
    if (co2Score) {
        const co2 = product.ecoscore_data?.agribalyse?.co2_total || 
                    product.ecoscore_data?.co2_total ||
                    product.environment_impact_level || 
                    null;
        
        if (co2) {
            const co2Value = typeof co2 === 'number' ? co2 : parseFloat(co2);
            if (!isNaN(co2Value)) {
                if (co2Value >= 1000) {
                    co2Score.textContent = (co2Value / 1000).toFixed(2) + ' kg';
                } else {
                    co2Score.textContent = co2Value.toFixed(0) + ' g';
                }
            } else {
                co2Score.textContent = 'N/A';
            }
        } else {
            co2Score.textContent = 'N/A';
        }
    }
    
    
    const ingredientsSection = $('ingredientsSection');
    const ingredientsList = $('ingredientsList');
    
    if (ingredientsSection && ingredientsList) {
        if (product.ingredients_text) {
            ingredientsList.textContent = product.ingredients_text;
        } else if (product.ingredients && product.ingredients.length > 0) {
            
            const ingredientsText = product.ingredients.map(ing => ing.text || ing.id || '').join(', ');
            ingredientsList.textContent = ingredientsText || 'Ingredients information not available';
        } else {
            ingredientsList.textContent = 'Ingredients information not available for this product.';
        }
        ingredientsSection.classList.remove('hidden');
    }
    
   
    const additivesSection = $('additivesSection');
    const additivesList = $('additivesList');
    
    if (additivesSection && additivesList) {
        if (product.additives_tags && product.additives_tags.length > 0) {
            additivesList.innerHTML = product.additives_tags.slice(0, 10).map(additive => {
                const cleanName = additive.replace(/^(en|fr|de|es):/, '').replace(/-/g, ' ');
                return <span class="badge badge-warning">${cleanName}</span>;
            }).join('');
        } else if (product.additives && product.additives.length > 0) {
            additivesList.innerHTML = product.additives.slice(0, 10).map(additive => {
                const name = additive.name || additive.id || additive;
                return <span class="badge badge-warning">${name}</span>;
            }).join('');
        } else {
            additivesList.innerHTML = '<span class="badge badge-success">No additives detected</span>';
        }
        additivesSection.classList.remove('hidden');
    }
    
    
    const nutritionSection = $('nutritionSection');
    const nutritionGrid = $('nutritionGrid');
    
    if (nutritionSection && nutritionGrid) {
        const nutrients = [
            { key: 'energy-kcal_100g', label: 'Calories', unit: 'kcal' },
            { key: 'proteins_100g', label: 'Proteins', unit: 'g' },
            { key: 'carbohydrates_100g', label: 'Carbohydrates', unit: 'g' },
            { key: 'fat_100g', label: 'Fats', unit: 'g' },
            { key: 'sugars_100g', label: 'Sugars', unit: 'g' },
            { key: 'salt_100g', label: 'Salt', unit: 'g' },
            { key: 'fiber_100g', label: 'Fiber', unit: 'g' },
            { key: 'saturated-fat_100g', label: 'Saturated Fat', unit: 'g' }
        ];
        
        if (product.nutriments) {
            const availableNutrients = nutrients.filter(n => {
                const value = product.nutriments[n.key];
                return value !== undefined && value !== null && !isNaN(value) && value !== '';
            });
            
            if (availableNutrients.length > 0) {
                nutritionGrid.innerHTML = availableNutrients.map(nutrient => `
                    <div class="nutrition-item">
                        <div class="nutrition-item-label">${nutrient.label}</div>
                        <div class="nutrition-item-value">
                            ${product.nutriments[nutrient.key].toFixed(1)}
                            <span class="nutrition-item-unit">${nutrient.unit}</span>
                        </div>
                    </div>
                `).join('');
                
                nutritionSection.classList.remove('hidden');
                
                
                createNutritionChart(product.nutriments, availableNutrients);
            } else {
                nutritionGrid.innerHTML = '<p class="empty-state">Nutrition information not available for this product.</p>';
                nutritionSection.classList.remove('hidden');
            }
        } else {
            nutritionGrid.innerHTML = '<p class="empty-state">Nutrition information not available for this product.</p>';
            nutritionSection.classList.remove('hidden');
        }
    }
}


function createNutritionChart(nutriments, nutrients) {
    const chartSection = $('nutritionChartSection');
    if (!chartSection || typeof Chart === 'undefined') return;
    
    chartSection.classList.remove('hidden');
    
    const ctx = document.getElementById('nutritionChart');
    if (!ctx) return;
    
    const labels = nutrients.map(n => n.label);
    const data = nutrients.map(n => nutriments[n.key]);
    const colors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)'
    ];
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Amount per 100g',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Nutritional Values Comparison'
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


function loadHistoryPage() {
    const historyList = $('historyList');
    const emptyState = $('emptyState');
    
    if (!historyList || !emptyState) return;
    
    const history = storage.getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        historyList.innerHTML = history.map(item => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            return `
                <div class="history-item" onclick="viewProduct('${item.barcode}')">
                    <img 
                        src="${item.image || 'placeholder.svg'}" 
                        alt="${item.name}"
                        class="history-item-image"
                        onerror="this.src='placeholder.svg'"
                    >
                    <div class="history-item-content">
                        <div class="history-item-header">
                            <h3 class="history-item-name">${item.name}</h3>
                            <span class="history-item-date">${dateStr}</span>
                        </div>
                        <div class="history-item-grades">
                            ${createGradeBadge(item.nutriScore, 'small')}
                            ${createGradeBadge(item.ecoScore, 'small')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}


function loadProfilePage() {
    const ecoPoints = $('ecoPoints');
    const totalScans = $('totalScans');
    const level = $('level');
    const currentPoints = $('currentPoints');
    const nextLevelPoints = $('nextLevelPoints');
    const progressFill = $('progressFill');
    const recentActivity = $('recentActivity');
    
    const points = storage.getEcoPoints();
    const levelNum = storage.getLevel();
    const pointsForNext = storage.getPointsForNextLevel();
    const history = storage.getHistory();
    
    if (ecoPoints) ecoPoints.textContent = points;
    if (totalScans) totalScans.textContent = history.length;
    if (level) level.textContent = levelNum;
    if (currentPoints) currentPoints.textContent = points;
    if (nextLevelPoints) nextLevelPoints.textContent = levelNum * 100;
    

    if (progressFill) {
        const progress = (points % 100) / 100 * 100;
        progressFill.style.width = progress + '%';
    }
    
 
    if (recentActivity) {
        const recent = history.slice(0, 5);
        if (recent.length === 0) {
            recentActivity.innerHTML = '<p class="empty-state">No recent activity. Start scanning products!</p>';
        } else {
            recentActivity.innerHTML = recent.map(item => {
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
}
