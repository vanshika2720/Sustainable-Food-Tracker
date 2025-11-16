// Main Application Logic for Sustainable Food Tracker

const API_BASE = 'https://world.openfoodfacts.org';

// Utility function
const $ = (id) => document.getElementById(id);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initHomePage();
});

// Initialize home page
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

// Handle search
async function handleSearch(query) {
    const loadingState = $('loadingState');
    const searchResults = $('searchResults');
    
    if (loadingState) loadingState.classList.remove('hidden');
    if (searchResults) searchResults.classList.add('hidden');
    
    // Check if it's a barcode (all digits)
    if (/^\d+$/.test(query)) {
        // Direct to product page
        window.location.href = `product.html?barcode=${query}`;
    } else {
        // Search for products
        await searchProducts(query);
    }
}

// Search products
async function searchProducts(query) {
    try {
        const response = await fetch(
            `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=20`
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
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

// Display search results
function displaySearchResults(products) {
    const resultsSection = $('searchResults');
    const resultsGrid = $('resultsGrid');
    
    if (!resultsSection || !resultsGrid) return;
    
    if (products.length === 0) {
        resultsGrid.innerHTML = '<p class="empty-state">No products found. Try a different search term.</p>';
        resultsSection.classList.remove('hidden');
        return;
    }
    
    resultsGrid.innerHTML = products.map(product => {
        // Enhanced image source - try multiple image sources
        const imageSrc = product.image_url || 
                        product.image_front_url || 
                        product.image_front_small_url ||
                        product.image_small_url ||
                        product.image_front_thumb_url ||
                        product.image_thumb_url ||
                        product.selected_images?.front?.display?.url ||
                        product.selected_images?.front?.small?.url ||
                        'placeholder.svg';
        
        return `
        <div class="product-item" onclick="viewProduct('${product.code}')">
            <img 
                src="${imageSrc}" 
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
    `;
    }).join('');
    
    resultsSection.classList.remove('hidden');
}

// Create grade badge
function createGradeBadge(grade, size = '') {
    if (!grade || grade === 'N/A') {
        return `<span class="grade-badge grade-na ${size}">N/A</span>`;
    }
    
    const gradeValue = String(grade).toLowerCase().trim();
    const validGrades = ['a', 'b', 'c', 'd', 'e'];
    const normalizedGrade = gradeValue.length === 1 ? gradeValue : gradeValue.charAt(0);
    const gradeClass = validGrades.includes(normalizedGrade) ? `grade-${normalizedGrade}` : 'grade-na';
    const displayGrade = validGrades.includes(normalizedGrade) ? normalizedGrade.toUpperCase() : 'N/A';
    
    return `<span class="grade-badge ${gradeClass} ${size}">${displayGrade}</span>`;
}

// View product
window.viewProduct = function(barcode) {
    window.location.href = `product.html?barcode=${barcode}`;
};

// Go back
window.goBack = function() {
    window.history.back();
};

// Load product details
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
        
        // Try API v2 first (simplified fetch without explicit CORS mode)
        let response;
        let data;
        let success = false;
        
        // Try v2 API
        try {
            console.log('Trying API v2...');
            const url = `${API_BASE}/api/v2/product/${encodeURIComponent(barcode)}`;
            console.log('Fetching from:', url);
            
            response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            data = await response.json();
            console.log('API v2 response:', data);
            
            if (data.status === 1 && data.product) {
                success = true;
            }
        } catch (fetchError) {
            console.warn('API v2 failed:', fetchError.message);
        }
        
        // If v2 failed or no product, try v0 API
        if (!success) {
            try {
                console.log('Trying API v0...');
                const url = `${API_BASE}/api/v0/product/${encodeURIComponent(barcode)}.json`;
                console.log('Fetching from:', url);
                
                response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        
        // If still no product, try JSON endpoint
        if (!success) {
            try {
                console.log('Trying JSON endpoint...');
                const url = `${API_BASE}/cgi/product.pl?code=${encodeURIComponent(barcode)}&action=display&json=1`;
                console.log('Fetching from:', url);
                
                response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        
        // If still no product, try searching by barcode
        if (!success) {
            try {
                console.log('Trying search by barcode as fallback...');
                const url = `${API_BASE}/cgi/search.pl?code=${encodeURIComponent(barcode)}&json=1&page_size=1`;
                console.log('Fetching from:', url);
                
                response = await fetch(url);
                
                if (response.ok) {
                    data = await response.json();
                    console.log('Search by barcode response:', data);
                    
                    if (data.products && data.products.length > 0) {
                        // Find exact barcode match
                        const exactMatch = data.products.find(p => p.code === barcode);
                        if (exactMatch) {
                            data = { product: exactMatch };
                            success = true;
                        } else if (data.products[0]) {
                            // Use first result if no exact match
                            data = { product: data.products[0] };
                            success = true;
                        }
                    }
                }
            } catch (searchError) {
                console.warn('Search by barcode failed:', searchError.message);
            }
        }
        
        // If still no product, try with padded zeros (for EAN-8 to EAN-13 conversion)
        if (!success && barcode.length === 8) {
            try {
                console.log('Trying with padded zeros for EAN-8...');
                // Try different padding combinations
                const paddedBarcodes = [
                    '0' + barcode, // 9 digits
                    '00' + barcode, // 10 digits
                    '000' + barcode, // 11 digits
                    '0000' + barcode, // 12 digits
                    '00000' + barcode // 13 digits
                ];
                
                for (const paddedBarcode of paddedBarcodes) {
                    try {
                        const url = `${API_BASE}/api/v2/product/${encodeURIComponent(paddedBarcode)}`;
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
            
            // Log full API response for debugging
            console.log('=== FULL API RESPONSE ===');
            console.log('Complete product data:', product);
            console.log('Product keys:', Object.keys(product));
            console.log('NutriScore fields:', {
                nutriscore_grade: product.nutriscore_grade,
                nutrition_grades: product.nutrition_grades,
                nutriscore_data: product.nutriscore_data,
                nutriscore_score: product.nutriscore_score
            });
            console.log('EcoScore fields:', {
                ecoscore_grade: product.ecoscore_grade,
                ecoscore_data: product.ecoscore_data,
                ecoscore_score: product.ecoscore_score
            });
            console.log('CO2 fields:', {
                ecoscore_data_agribalyse: product.ecoscore_data?.agribalyse,
                carbon_footprint: product.carbon_footprint
            });
            console.log('Additives fields:', {
                additives_tags: product.additives_tags,
                additives: product.additives,
                additives_original_tags: product.additives_original_tags
            });
            
            // Save to history and calculate points
            const historyItem = storage.saveToHistory(product);
            
            // Extract scores for points calculation
            const nutriGrade = product.nutriscore_grade || product.nutrition_grades || product.nutriscore_data?.grade;
            const ecoGrade = product.ecoscore_grade || product.ecoscore_data?.grade;
            const points = storage.calculatePoints(nutriGrade, ecoGrade);
            storage.addEcoPoints(points);
            
            // Display product
            displayProduct(product);
            
            if (loadingState) loadingState.classList.add('hidden');
            if (detailsSection) detailsSection.classList.remove('hidden');
        } else {
            console.error('Product not found. Final data:', data);
            console.error('Barcode tried:', barcode);
            
            // Show helpful error with options
            const testBarcodes = [
                '3017620422003', // Nutella
                '7622210945078', // Oreo
                '3017620429484', // Coca Cola
                '5000159461125'  // Kit Kat
            ];
            
            let message = `Product not found for barcode: ${barcode}\n\n`;
            
            if (barcode.length < 8) {
                message += `⚠ This barcode is too short (${barcode.length} digits).\n`;
                message += `Valid barcodes are usually 8-13 digits.\n\n`;
            } else if (barcode.length === 8) {
                message += `⚠ This is an EAN-8 barcode.\n`;
                message += `The product might not be in the database, or the barcode format might be different.\n\n`;
            }
            
            message += `Options:\n`;
            message += `1. Try these test barcodes: ${testBarcodes.join(', ')}\n`;
            message += `2. Search by product name instead\n`;
            message += `3. Try scanning a different product`;
            
            // Show error but allow user to go back
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
        
        // Better error messages based on error type
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

// Display product details
function displayProduct(product) {
    console.log('Displaying product with full data:', product);
    
    // Product header
    const productImage = $('productImage');
    const productName = $('productName');
    const productBrand = $('productBrand');
    
    // Enhanced image loading - try multiple image sources
    if (productImage) {
        const imageSources = [
            product.image_front_url,
            product.image_url,
            product.image_front_small_url,
            product.image_small_url,
            product.image_front_thumb_url,
            product.image_thumb_url,
            product.images?.front?.display?.en || product.images?.front?.display?.fr,
            product.images?.front?.small?.en || product.images?.front?.small?.fr,
            product.images?.front?.thumb?.en || product.images?.front?.thumb?.fr,
            product.selected_images?.front?.display?.url,
            product.selected_images?.front?.small?.url,
            product.selected_images?.front?.thumb?.url
        ].filter(Boolean); // Remove null/undefined values
        
        // Try first available image
        if (imageSources.length > 0) {
            productImage.src = imageSources[0];
            productImage.alt = product.product_name || 'Product';
            
            // Fallback chain if image fails to load
            let currentIndex = 0;
            productImage.onerror = function() {
                currentIndex++;
                if (currentIndex < imageSources.length) {
                    this.src = imageSources[currentIndex];
                } else {
                    // All images failed, use placeholder
                    this.src = 'placeholder.svg';
                    this.onerror = null; // Prevent infinite loop
                }
            };
        } else {
            productImage.src = 'placeholder.svg';
        }
        
        productImage.alt = product.product_name || 'Product';
        console.log('Loading product image from:', imageSources[0] || 'placeholder.svg');
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
    
    // Scores - Enhanced extraction with multiple field checks
    // Always show scores section
    const scoresCard = document.querySelector('.scores-card');
    if (scoresCard) {
        scoresCard.style.display = 'block';
    }
    
    const nutriScore = $('nutriScore');
    const ecoScore = $('ecoScore');
    const co2Score = $('co2Value');
    
    // Log all possible score fields for debugging
    console.log('=== SCORE EXTRACTION DEBUG ===');
    console.log('nutriscore_grade:', product.nutriscore_grade);
    console.log('nutrition_grades:', product.nutrition_grades);
    console.log('nutrition_grade_fr:', product.nutrition_grade_fr);
    console.log('nutriscore_data:', product.nutriscore_data);
    console.log('ecoscore_grade:', product.ecoscore_grade);
    console.log('ecoscore_data:', product.ecoscore_data);
    console.log('nutriments:', product.nutriments ? Object.keys(product.nutriments) : 'none');
    
    if (nutriScore) {
        // Enhanced NutriScore extraction from multiple API response structures
        console.log('=== NUTRISCORE EXTRACTION DEBUG ===');
        console.log('nutriscore_grade:', product.nutriscore_grade);
        console.log('nutrition_grades:', product.nutrition_grades);
        console.log('nutrition_grade_fr:', product.nutrition_grade_fr);
        console.log('nutriscore_data:', product.nutriscore_data);
        console.log('nutriscore_score:', product.nutriscore_score);
        
        let grade = null;
        
        // Method 1: Direct nutriscore_grade (most common)
        if (product.nutriscore_grade) {
            grade = product.nutriscore_grade;
            console.log('Found NutriScore in nutriscore_grade:', grade);
        }
        // Method 2: nutrition_grades
        else if (product.nutrition_grades) {
            grade = product.nutrition_grades;
            console.log('Found NutriScore in nutrition_grades:', grade);
        }
        // Method 3: nutrition_grade_fr
        else if (product.nutrition_grade_fr) {
            grade = product.nutrition_grade_fr;
            console.log('Found NutriScore in nutrition_grade_fr:', grade);
        }
        // Method 4: nutriscore_data.grade
        else if (product.nutriscore_data?.grade) {
            grade = product.nutriscore_data.grade;
            console.log('Found NutriScore in nutriscore_data.grade:', grade);
        }
        // Method 5: Calculate from nutriscore_data.score
        else if (product.nutriscore_data?.score !== undefined) {
            const score = product.nutriscore_data.score;
            // NutriScore scale: -15 to 40, lower is better
            if (score <= -1) grade = 'a';
            else if (score <= 2) grade = 'b';
            else if (score <= 10) grade = 'c';
            else if (score <= 18) grade = 'd';
            else grade = 'e';
            console.log('Calculated NutriScore from nutriscore_data.score:', score, '->', grade);
        }
        // Method 6: nutriscore_score (direct)
        else if (product.nutriscore_score !== undefined) {
            const score = product.nutriscore_score;
            if (score <= -1) grade = 'a';
            else if (score <= 2) grade = 'b';
            else if (score <= 10) grade = 'c';
            else if (score <= 18) grade = 'd';
            else grade = 'e';
            console.log('Calculated NutriScore from nutriscore_score:', score, '->', grade);
        }
        // Method 7: Calculate from nutriments nutrition-score-fr
        else if (product.nutriments) {
            const score = product.nutriments['nutrition-score-fr'] || 
                         product.nutriments['nutrition-score-fr_100g'] ||
                         product.nutriments['nutrition-score-fr_value'] ||
                         product.nutriments['nutrition-score'] ||
                         product.nutriments['nutrition_score_fr'];
            
            if (score !== undefined && score !== null) {
                const numScore = parseFloat(score);
                if (!isNaN(numScore)) {
                    if (numScore <= -1) grade = 'a';
                    else if (numScore <= 2) grade = 'b';
                    else if (numScore <= 10) grade = 'c';
                    else if (numScore <= 18) grade = 'd';
                    else grade = 'e';
                    console.log('Calculated NutriScore from nutriments score:', numScore, '->', grade);
                }
            }
        }
        
        // Normalize grade
        if (grade) {
            grade = String(grade).toLowerCase().trim();
            // Extract first character if it's a longer string
            if (grade.length > 1 && !['a', 'b', 'c', 'd', 'e'].includes(grade)) {
                grade = grade.charAt(0).toLowerCase();
            }
            if (!['a', 'b', 'c', 'd', 'e'].includes(grade)) {
                grade = null;
            }
        }
        
        // If still no grade, try to estimate from nutritional values
        if (!grade && product.nutriments) {
            const fat = product.nutriments.fat_100g || 0;
            const satFat = product.nutriments['saturated-fat_100g'] || 0;
            const sugar = product.nutriments.sugars_100g || 0;
            const salt = product.nutriments.salt_100g || 0;
            const fiber = product.nutriments.fiber_100g || 0;
            const protein = product.nutriments.proteins_100g || 0;
            
            // Simple estimation based on key nutrients
            let estimatedScore = 0;
            if (fat > 20 || satFat > 10) estimatedScore += 10;
            if (sugar > 22.5) estimatedScore += 10;
            if (salt > 1.5) estimatedScore += 10;
            if (fiber > 3) estimatedScore -= 5;
            if (protein > 10) estimatedScore -= 2;
            
            if (estimatedScore <= -1) grade = 'a';
            else if (estimatedScore <= 2) grade = 'b';
            else if (estimatedScore <= 10) grade = 'c';
            else if (estimatedScore <= 18) grade = 'd';
            else grade = 'e';
            
            console.log('Estimated NutriScore from nutrients:', estimatedScore, '->', grade);
        }
        
        // Final fallback - show estimated if available
        if (!grade) {
            grade = 'c'; // Default to C if nothing found
            console.log('Using default NutriScore: C');
        }
        
        console.log('Final NutriScore:', grade);
        nutriScore.innerHTML = createGradeBadge(grade);
        
        // Store for impact score calculation
        window.currentNutriScore = grade;
    }
    
    if (ecoScore) {
        // Enhanced EcoScore extraction from multiple API response structures
        console.log('=== ECOSCORE EXTRACTION DEBUG ===');
        console.log('ecoscore_grade:', product.ecoscore_grade);
        console.log('ecoscore_data:', product.ecoscore_data);
        console.log('ecoscore_score:', product.ecoscore_score);
        console.log('environment_impact_level:', product.environment_impact_level);
        
        let grade = null;
        
        // Method 1: Direct ecoscore_grade
        if (product.ecoscore_grade) {
            grade = product.ecoscore_grade;
            console.log('Found EcoScore in ecoscore_grade:', grade);
        }
        // Method 2: ecoscore_data.grade
        else if (product.ecoscore_data?.grade) {
            grade = product.ecoscore_data.grade;
            console.log('Found EcoScore in ecoscore_data.grade:', grade);
        }
        // Method 3: ecoscore_data.adjusted_grade
        else if (product.ecoscore_data?.adjusted_grade) {
            grade = product.ecoscore_data.adjusted_grade;
            console.log('Found EcoScore in ecoscore_data.adjusted_grade:', grade);
        }
        // Method 4: Calculate from ecoscore_score
        else if (product.ecoscore_data?.score !== undefined) {
            const score = product.ecoscore_data.score;
            // Convert numeric score to grade (0-100 scale, lower is better)
            if (score <= 20) grade = 'a';
            else if (score <= 40) grade = 'b';
            else if (score <= 60) grade = 'c';
            else if (score <= 80) grade = 'd';
            else grade = 'e';
            console.log('Calculated EcoScore from score:', score, '->', grade);
        }
        // Method 5: ecoscore_score (direct)
        else if (product.ecoscore_score !== undefined) {
            const score = product.ecoscore_score;
            if (score <= 20) grade = 'a';
            else if (score <= 40) grade = 'b';
            else if (score <= 60) grade = 'c';
            else if (score <= 80) grade = 'd';
            else grade = 'e';
            console.log('Calculated EcoScore from ecoscore_score:', score, '->', grade);
        }
        // Method 6: environment_impact_level (if it's a grade)
        else if (product.environment_impact_level && /^[a-e]$/i.test(product.environment_impact_level)) {
            grade = product.environment_impact_level.toLowerCase();
            console.log('Found EcoScore in environment_impact_level:', grade);
        }
        
        // Normalize grade
        if (grade) {
            grade = String(grade).toLowerCase().trim();
            if (!['a', 'b', 'c', 'd', 'e'].includes(grade)) {
                grade = null;
            }
        }
        
        // If still no grade, try to estimate from packaging and origin
        if (!grade) {
            const packaging = product.packaging || '';
            const origins = product.origins || '';
            const labels = product.labels_tags || [];
            
            // Estimate based on eco-friendly indicators
            let ecoIndicators = 0;
            if (packaging.toLowerCase().includes('recycl') || packaging.toLowerCase().includes('biodegrad')) ecoIndicators += 2;
            if (labels.some(l => l.includes('organic') || l.includes('bio') || l.includes('fair-trade'))) ecoIndicators += 3;
            if (origins && origins.length > 0) ecoIndicators += 1; // Local origin is better
            
            if (ecoIndicators >= 4) grade = 'a';
            else if (ecoIndicators >= 3) grade = 'b';
            else if (ecoIndicators >= 2) grade = 'c';
            else if (ecoIndicators >= 1) grade = 'd';
            else grade = 'c'; // Default to C
            
            console.log('Estimated EcoScore from indicators:', ecoIndicators, '->', grade);
        }
        
        // Final fallback
        if (!grade) {
            grade = 'c'; // Default to C if nothing found
            console.log('Using default EcoScore: C');
        }
        
        console.log('Final EcoScore:', grade);
        ecoScore.innerHTML = createGradeBadge(grade);
        
        // Store for impact score calculation
        window.currentEcoScore = grade;
    }
    
    // CO₂ Impact - Enhanced extraction from multiple API response structures
    if (co2Score) {
        console.log('=== CO2 EXTRACTION DEBUG ===');
        console.log('ecoscore_data:', product.ecoscore_data);
        console.log('ecoscore_data.agribalyse:', product.ecoscore_data?.agribalyse);
        console.log('environment_impact_level:', product.environment_impact_level);
        
        let co2 = null;
        
        // Try multiple paths for CO2 data
        if (product.ecoscore_data) {
            // Path 1: ecoscore_data.agribalyse.co2_total
            if (product.ecoscore_data.agribalyse?.co2_total) {
                co2 = product.ecoscore_data.agribalyse.co2_total;
                console.log('Found CO2 in agribalyse.co2_total:', co2);
            }
            // Path 2: ecoscore_data.co2_total
            else if (product.ecoscore_data.co2_total) {
                co2 = product.ecoscore_data.co2_total;
                console.log('Found CO2 in ecoscore_data.co2_total:', co2);
            }
            // Path 3: ecoscore_data.agribalyse.ef_agriculture
            else if (product.ecoscore_data.agribalyse?.ef_agriculture) {
                co2 = product.ecoscore_data.agribalyse.ef_agriculture;
                console.log('Found CO2 in agribalyse.ef_agriculture:', co2);
            }
            // Path 4: ecoscore_data.agribalyse.ef_consumption
            else if (product.ecoscore_data.agribalyse?.ef_consumption) {
                co2 = product.ecoscore_data.agribalyse.ef_consumption;
                console.log('Found CO2 in agribalyse.ef_consumption:', co2);
            }
        }
        
        // Path 5: Direct environment_impact_level (if it's a number)
        if (!co2 && product.environment_impact_level) {
            const envImpact = parseFloat(product.environment_impact_level);
            if (!isNaN(envImpact) && envImpact > 0) {
                co2 = envImpact;
                console.log('Found CO2 in environment_impact_level:', co2);
            }
        }
        
        // Path 6: Check for carbon_footprint fields
        if (!co2 && product.carbon_footprint) {
            co2 = product.carbon_footprint;
            console.log('Found CO2 in carbon_footprint:', co2);
        }
        
        // Path 7: Check for carbon_footprint_per_kg
        if (!co2 && product.carbon_footprint_per_kg_of_product) {
            co2 = product.carbon_footprint_per_kg_of_product;
            console.log('Found CO2 in carbon_footprint_per_kg_of_product:', co2);
        }
        
        // Display CO2 value - always show a value, estimate if needed
        if (co2 !== null && co2 !== undefined) {
            const co2Value = typeof co2 === 'number' ? co2 : parseFloat(co2);
            if (!isNaN(co2Value) && co2Value > 0) {
                if (co2Value >= 1000) {
                    co2Score.textContent = (co2Value / 1000).toFixed(2) + ' kg CO₂';
                } else {
                    co2Score.textContent = co2Value.toFixed(1) + ' g CO₂';
                }
                co2Score.style.color = 'var(--foreground)';
                console.log('Final CO2 value displayed:', co2Value);
            } else {
                // Estimate CO2 based on product category
                const estimatedCo2 = estimateCO2FromProduct(product);
                if (estimatedCo2 >= 1000) {
                    co2Score.textContent = (estimatedCo2 / 1000).toFixed(2) + ' kg CO₂ (est.)';
                } else {
                    co2Score.textContent = estimatedCo2.toFixed(1) + ' g CO₂ (est.)';
                }
                co2Score.style.color = 'var(--muted-foreground)';
                console.log('Estimated CO2 value:', estimatedCo2);
            }
        } else {
            // Estimate CO2 based on product category
            const estimatedCo2 = estimateCO2FromProduct(product);
            if (estimatedCo2 >= 1000) {
                co2Score.textContent = (estimatedCo2 / 1000).toFixed(2) + ' kg CO₂ (est.)';
            } else {
                co2Score.textContent = estimatedCo2.toFixed(1) + ' g CO₂ (est.)';
            }
            co2Score.style.color = 'var(--muted-foreground)';
            console.log('Estimated CO2 value:', estimatedCo2);
        }
        
        // Store CO2 value for impact score calculation
        if (co2 !== null && co2 !== undefined) {
            const co2Value = typeof co2 === 'number' ? co2 : parseFloat(co2);
            if (!isNaN(co2Value) && co2Value > 0) {
                window.currentCo2Value = co2Value;
            } else {
                window.currentCo2Value = null;
            }
        } else {
            window.currentCo2Value = null;
        }
    }
    
    // Ingredients - Always show section, even if empty
    const ingredientsSection = $('ingredientsSection');
    const ingredientsList = $('ingredientsList');
    
    if (ingredientsSection && ingredientsList) {
        if (product.ingredients_text) {
            ingredientsList.textContent = product.ingredients_text;
        } else if (product.ingredients && product.ingredients.length > 0) {
            // Try to build from ingredients array
            const ingredientsText = product.ingredients.map(ing => ing.text || ing.id || '').join(', ');
            ingredientsList.textContent = ingredientsText || 'Ingredients information not available';
        } else {
            ingredientsList.textContent = 'Ingredients information not available for this product.';
        }
        ingredientsSection.classList.remove('hidden');
    }
    
    // Additives - Enhanced extraction with detailed information
    const additivesSection = $('additivesSection');
    const additivesList = $('additivesList');
    
    if (additivesSection && additivesList) {
        console.log('=== ADDITIVES EXTRACTION DEBUG ===');
        console.log('additives_tags:', product.additives_tags);
        console.log('additives:', product.additives);
        console.log('additives_original_tags:', product.additives_original_tags);
        console.log('additives_debug:', product.additives_debug);
        
        let additivesFound = [];
        
        // Method 1: additives_tags (most common)
        if (product.additives_tags && product.additives_tags.length > 0) {
            additivesFound = product.additives_tags.map(tag => {
                // Clean tag format: "en:e100" -> "E100"
                const cleanName = tag
                    .replace(/^(en|fr|de|es|it|pt|nl):/, '') // Remove language prefix
                    .replace(/^e/, 'E') // Capitalize E
                    .replace(/-/g, ' '); // Replace hyphens with spaces
                return cleanName;
            });
            console.log('Found additives from additives_tags:', additivesFound);
        }
        
        // Method 2: additives array with objects
        else if (product.additives && Array.isArray(product.additives) && product.additives.length > 0) {
            additivesFound = product.additives.map(additive => {
                if (typeof additive === 'string') {
                    return additive.replace(/^e/i, 'E').replace(/-/g, ' ');
                } else if (typeof additive === 'object') {
                    return additive.name || 
                           additive.id || 
                           additive.text ||
                           (additive.id ? additive.id.replace(/^e/i, 'E') : 'Unknown');
                }
                return String(additive).replace(/^e/i, 'E').replace(/-/g, ' ');
            });
            console.log('Found additives from additives array:', additivesFound);
        }
        
        // Method 3: additives_original_tags
        else if (product.additives_original_tags && product.additives_original_tags.length > 0) {
            additivesFound = product.additives_original_tags.map(tag => {
                return tag.replace(/^(en|fr|de|es|it|pt|nl):/, '').replace(/^e/i, 'E').replace(/-/g, ' ');
            });
            console.log('Found additives from additives_original_tags:', additivesFound);
        }
        
        // Method 4: Check ingredients for additives (E numbers)
        if (additivesFound.length === 0 && product.ingredients) {
            const eNumberRegex = /\bE\d{3}[a-z]?\b/gi;
            const ingredientsText = product.ingredients_text || 
                                   (Array.isArray(product.ingredients) ? 
                                    product.ingredients.map(i => i.text || i.id || '').join(' ') : '');
            
            if (ingredientsText) {
                const matches = ingredientsText.match(eNumberRegex);
                if (matches) {
                    additivesFound = [...new Set(matches)]; // Remove duplicates
                    console.log('Found additives from ingredients text:', additivesFound);
                }
            }
        }
        
        // Display additives
        if (additivesFound.length > 0) {
            // Remove duplicates and limit to 15
            const uniqueAdditives = [...new Set(additivesFound)].slice(0, 15);
            additivesList.innerHTML = uniqueAdditives.map(additive => {
                return `<span class="badge badge-warning" title="Additive: ${additive}">${additive}</span>`;
            }).join('');
            
            // Show count if more than displayed
            if (additivesFound.length > 15) {
                additivesList.innerHTML += `<span class="badge badge-secondary">+${additivesFound.length - 15} more</span>`;
            }
            
            console.log('Displaying additives:', uniqueAdditives);
        } else {
            additivesList.innerHTML = '<span class="badge badge-success">No additives detected</span>';
            console.log('No additives found');
        }
        
        additivesSection.classList.remove('hidden');
    }
    
    // Health Initiatives Section
    displayHealthInitiatives(product);
    
    // Nutrition facts - Always show section
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
                
                // Create nutrition chart
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

// Create nutrition chart
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

// Load history page
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
            
            // Enhanced image loading for history
            const imageSrc = item.image || 'placeholder.svg';
            
            return `
                <div class="history-item" onclick="viewProduct('${item.barcode}')">
                    <img 
                        src="${imageSrc}" 
                        alt="${item.name}"
                        class="history-item-image"
                        onerror="this.src='placeholder.svg'"
                        loading="lazy"
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

// Calculate Impact Score based on NutriScore, EcoScore, and CO2
function calculateImpactScore() {
    const impactScoreValue = $('impactScoreValue');
    const impactScoreTitle = $('impactScoreTitle');
    const impactScoreRange = $('impactScoreRange');
    const impactNutriScore = $('impactNutriScore');
    const impactEcoScore = $('impactEcoScore');
    const impactCo2 = $('impactCo2');
    
    if (!impactScoreValue || !impactScoreTitle) return;
    
    const nutriScore = window.currentNutriScore;
    const ecoScore = window.currentEcoScore;
    const co2Value = window.currentCo2Value;
    
    console.log('=== IMPACT SCORE CALCULATION ===');
    console.log('NutriScore:', nutriScore);
    console.log('EcoScore:', ecoScore);
    console.log('CO2 Value:', co2Value);
    
    // Convert grades to numeric values (A=5, B=4, C=3, D=2, E=1, N/A=0)
    const gradeToNumber = (grade) => {
        if (!grade || grade === 'N/A') return 0;
        const g = String(grade).toLowerCase();
        if (g === 'a') return 5;
        if (g === 'b') return 4;
        if (g === 'c') return 3;
        if (g === 'd') return 2;
        if (g === 'e') return 1;
        return 0;
    };
    
    const nutriNum = gradeToNumber(nutriScore);
    const ecoNum = gradeToNumber(ecoScore);
    
    // CO2 scoring: Lower is better
    // Scale: 0-500g = 5 points, 500-1000g = 4, 1000-2000g = 3, 2000-5000g = 2, 5000+ = 1, N/A = 0
    let co2Num = 0;
    if (co2Value !== null && co2Value !== undefined && co2Value > 0) {
        if (co2Value <= 500) co2Num = 5;
        else if (co2Value <= 1000) co2Num = 4;
        else if (co2Value <= 2000) co2Num = 3;
        else if (co2Value <= 5000) co2Num = 2;
        else co2Num = 1;
    }
    
    // Calculate weighted impact score (out of 100)
    // NutriScore: 40%, EcoScore: 40%, CO2: 20%
    let totalScore = 0;
    let maxScore = 0;
    
    if (nutriNum > 0) {
        totalScore += nutriNum * 8; // 5 * 8 = 40 max
        maxScore += 40;
    }
    
    if (ecoNum > 0) {
        totalScore += ecoNum * 8; // 5 * 8 = 40 max
        maxScore += 40;
    }
    
    if (co2Num > 0) {
        totalScore += co2Num * 4; // 5 * 4 = 20 max
        maxScore += 20;
    }
    
    // Calculate percentage
    const impactPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // Determine title and range based on score
    let title, range, colorClass;
    
    if (impactPercentage >= 90) {
        title = 'Excellent';
        range = '90-100';
        colorClass = 'impact-excellent';
    } else if (impactPercentage >= 75) {
        title = 'Very Good';
        range = '75-89';
        colorClass = 'impact-very-good';
    } else if (impactPercentage >= 60) {
        title = 'Good';
        range = '60-74';
        colorClass = 'impact-good';
    } else if (impactPercentage >= 45) {
        title = 'Fair';
        range = '45-59';
        colorClass = 'impact-fair';
    } else if (impactPercentage >= 30) {
        title = 'Poor';
        range = '30-44';
        colorClass = 'impact-poor';
    } else {
        title = 'Very Poor';
        range = '0-29';
        colorClass = 'impact-very-poor';
    }
    
    // Display impact score
    impactScoreValue.textContent = impactPercentage;
    impactScoreValue.className = `impact-score-value ${colorClass}`;
    impactScoreTitle.textContent = title;
    impactScoreTitle.className = `impact-score-title ${colorClass}`;
    impactScoreRange.textContent = `Range: ${range}`;
    
    // Display breakdown
    if (impactNutriScore) {
        impactNutriScore.innerHTML = nutriScore ? createGradeBadge(nutriScore, 'small') : '<span class="impact-na">N/A</span>';
    }
    if (impactEcoScore) {
        impactEcoScore.innerHTML = ecoScore ? createGradeBadge(ecoScore, 'small') : '<span class="impact-na">N/A</span>';
    }
    if (impactCo2) {
        if (co2Value !== null && co2Value !== undefined && co2Value > 0) {
            const co2Display = co2Value >= 1000 ? (co2Value / 1000).toFixed(2) + ' kg' : co2Value.toFixed(1) + ' g';
            impactCo2.textContent = co2Display;
        } else {
            impactCo2.textContent = 'N/A';
            impactCo2.className = 'impact-co2 impact-na';
        }
    }
    
    console.log('Impact Score:', impactPercentage, title, range);
}

// Load profile page with real-time impact score calculation
async function loadProfilePage() {
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
    
    // Progress bar
    if (progressFill) {
        const progress = (points % 100) / 100 * 100;
        progressFill.style.width = progress + '%';
    }
    
    // Recent activity
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
    
    // Calculate and display overall impact score from history
    await calculateProfileImpactScore(history);
}

// Calculate overall impact score from history by fetching real-time data
async function calculateProfileImpactScore(history) {
    const profileImpactScore = $('profileImpactScore');
    const profileImpactTitle = $('profileImpactTitle');
    const profileImpactRange = $('profileImpactRange');
    const impactTag = $('impactTag');
    const profileAvgNutri = $('profileAvgNutri');
    const profileAvgEco = $('profileAvgEco');
    const profileAvgCo2 = $('profileAvgCo2');
    
    if (!profileImpactScore || history.length === 0) {
        if (profileImpactScore) profileImpactScore.textContent = '0';
        if (profileImpactTitle) profileImpactTitle.textContent = 'No data yet';
        if (profileImpactRange) profileImpactRange.textContent = 'Start scanning products!';
        if (impactTag) impactTag.textContent = 'Beginner';
        return;
    }
    
    // Fetch real-time data for all products in history
    console.log('Calculating profile impact score from', history.length, 'products');
    
    let totalNutriScore = 0;
    let totalEcoScore = 0;
    let totalCo2 = 0;
    let validNutriCount = 0;
    let validEcoCount = 0;
    let validCo2Count = 0;
    
    // Process history items (limit to last 50 for performance)
    const itemsToProcess = history.slice(0, 50);
    
    for (const item of itemsToProcess) {
        // Validate barcode - must be 8-13 digits
        if (!item.barcode || !/^\d{8,13}$/.test(String(item.barcode))) {
            console.warn('Invalid barcode in history:', item.barcode);
            continue;
        }
        
        try {
            // Fetch latest product data from API
            const barcode = String(item.barcode).trim();
            const response = await fetch(`${API_BASE}/api/v2/product/${encodeURIComponent(barcode)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 1 && data.product) {
                    const product = data.product;
                    
                    // Extract NutriScore
                    let nutriGrade = product.nutriscore_grade || 
                                   product.nutrition_grades || 
                                   product.nutriscore_data?.grade;
                    if (nutriGrade) {
                        const nutriNum = gradeToNumber(nutriGrade);
                        if (nutriNum > 0) {
                            totalNutriScore += nutriNum;
                            validNutriCount++;
                        }
                    }
                    
                    // Extract EcoScore
                    let ecoGrade = product.ecoscore_grade || 
                                  product.ecoscore_data?.grade ||
                                  product.ecoscore_data?.adjusted_grade;
                    if (ecoGrade) {
                        const ecoNum = gradeToNumber(ecoGrade);
                        if (ecoNum > 0) {
                            totalEcoScore += ecoNum;
                            validEcoCount++;
                        }
                    }
                    
                    // Extract CO2
                    let co2 = product.ecoscore_data?.agribalyse?.co2_total || 
                             product.ecoscore_data?.co2_total ||
                             product.carbon_footprint;
                    if (co2) {
                        const co2Value = typeof co2 === 'number' ? co2 : parseFloat(co2);
                        if (!isNaN(co2Value) && co2Value > 0) {
                            totalCo2 += co2Value;
                            validCo2Count++;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to fetch product', item.barcode, error);
            // Use stored data as fallback
            if (item.nutriScore && item.nutriScore !== 'N/A') {
                const nutriNum = gradeToNumber(item.nutriScore);
                if (nutriNum > 0) {
                    totalNutriScore += nutriNum;
                    validNutriCount++;
                }
            }
            if (item.ecoScore && item.ecoScore !== 'N/A') {
                const ecoNum = gradeToNumber(item.ecoScore);
                if (ecoNum > 0) {
                    totalEcoScore += ecoNum;
                    validEcoCount++;
                }
            }
        }
    }
    
    // Calculate averages
    const avgNutriNum = validNutriCount > 0 ? totalNutriScore / validNutriCount : 0;
    const avgEcoNum = validEcoCount > 0 ? totalEcoScore / validEcoCount : 0;
    const avgCo2 = validCo2Count > 0 ? totalCo2 / validCo2Count : 0;
    
    // Convert back to grades
    const avgNutriGrade = numberToGrade(avgNutriNum);
    const avgEcoGrade = numberToGrade(avgEcoNum);
    
    // Calculate CO2 score
    let co2Num = 0;
    if (avgCo2 > 0) {
        if (avgCo2 <= 500) co2Num = 5;
        else if (avgCo2 <= 1000) co2Num = 4;
        else if (avgCo2 <= 2000) co2Num = 3;
        else if (avgCo2 <= 5000) co2Num = 2;
        else co2Num = 1;
    }
    
    // Calculate weighted impact score
    let totalScore = 0;
    let maxScore = 0;
    
    if (avgNutriNum > 0) {
        totalScore += avgNutriNum * 8;
        maxScore += 40;
    }
    if (avgEcoNum > 0) {
        totalScore += avgEcoNum * 8;
        maxScore += 40;
    }
    if (co2Num > 0) {
        totalScore += co2Num * 4;
        maxScore += 20;
    }
    
    const impactPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // Determine title, range, and tag
    let title, range, colorClass, tag;
    
    if (impactPercentage >= 90) {
        title = 'Excellent';
        range = '90-100';
        colorClass = 'impact-excellent';
        tag = 'Eco Champion';
    } else if (impactPercentage >= 75) {
        title = 'Very Good';
        range = '75-89';
        colorClass = 'impact-very-good';
        tag = 'Green Warrior';
    } else if (impactPercentage >= 60) {
        title = 'Good';
        range = '60-74';
        colorClass = 'impact-good';
        tag = 'Eco Conscious';
    } else if (impactPercentage >= 45) {
        title = 'Fair';
        range = '45-59';
        colorClass = 'impact-fair';
        tag = 'Getting Better';
    } else if (impactPercentage >= 30) {
        title = 'Poor';
        range = '30-44';
        colorClass = 'impact-poor';
        tag = 'Needs Improvement';
    } else {
        title = 'Very Poor';
        range = '0-29';
        colorClass = 'impact-very-poor';
        tag = 'Beginner';
    }
    
    // Display impact score
    if (profileImpactScore) {
        profileImpactScore.textContent = impactPercentage;
        profileImpactScore.className = `profile-impact-value ${colorClass}`;
    }
    if (profileImpactTitle) {
        profileImpactTitle.textContent = title;
        profileImpactTitle.className = `profile-impact-title ${colorClass}`;
    }
    if (profileImpactRange) {
        profileImpactRange.textContent = `Range: ${range}`;
    }
    if (impactTag) {
        impactTag.textContent = tag;
        impactTag.className = `impact-tag ${colorClass}`;
    }
    
    // Display breakdown
    if (profileAvgNutri) {
        profileAvgNutri.innerHTML = avgNutriGrade ? createGradeBadge(avgNutriGrade, 'small') : '<span class="impact-na">N/A</span>';
    }
    if (profileAvgEco) {
        profileAvgEco.innerHTML = avgEcoGrade ? createGradeBadge(avgEcoGrade, 'small') : '<span class="impact-na">N/A</span>';
    }
    if (profileAvgCo2) {
        if (avgCo2 > 0) {
            const co2Display = avgCo2 >= 1000 ? (avgCo2 / 1000).toFixed(2) + ' kg' : avgCo2.toFixed(1) + ' g';
            profileAvgCo2.textContent = co2Display;
        } else {
            profileAvgCo2.textContent = 'N/A';
            profileAvgCo2.className = 'profile-impact-co2 impact-na';
        }
    }
    
    console.log('Profile Impact Score:', impactPercentage, title, range, tag);
}

// Estimate CO2 from product category and characteristics
function estimateCO2FromProduct(product) {
    const categories = product.categories_tags || [];
    const categoryStr = categories.join(' ').toLowerCase();
    
    // Base estimates by category (in g CO2 per 100g)
    if (categoryStr.includes('meat') || categoryStr.includes('beef') || categoryStr.includes('lamb')) {
        return 2500; // High impact
    } else if (categoryStr.includes('pork') || categoryStr.includes('chicken')) {
        return 1200; // Medium-high
    } else if (categoryStr.includes('fish') || categoryStr.includes('seafood')) {
        return 800; // Medium
    } else if (categoryStr.includes('cheese') || categoryStr.includes('dairy')) {
        return 1000; // Medium-high
    } else if (categoryStr.includes('fruit') || categoryStr.includes('vegetable')) {
        return 200; // Low
    } else if (categoryStr.includes('grain') || categoryStr.includes('cereal') || categoryStr.includes('bread')) {
        return 300; // Low-medium
    } else if (categoryStr.includes('beverage') || categoryStr.includes('drink')) {
        return 150; // Low
    } else {
        return 500; // Default medium estimate
    }
}

// Display health initiatives based on product scores
function displayHealthInitiatives(product) {
    const healthInitiativesSection = $('healthInitiativesSection');
    const healthInitiativesList = $('healthInitiativesList');
    
    if (!healthInitiativesSection || !healthInitiativesList) return;
    
    const nutriGrade = window.currentNutriScore || product.nutriscore_grade || product.nutrition_grades;
    const ecoGrade = window.currentEcoScore || product.ecoscore_grade;
    const nutriScore = gradeToNumber(nutriGrade);
    const ecoScore = gradeToNumber(ecoGrade);
    
    const initiatives = [];
    
    // NutriScore-based tips
    if (nutriScore >= 4) { // A or B
        initiatives.push({
            icon: 'fa-check-circle',
            text: 'Excellent nutritional quality! This product supports a healthy diet.',
            type: 'success'
        });
        initiatives.push({
            icon: 'fa-apple-alt',
            text: 'Great choice for maintaining balanced nutrition. Keep it up!',
            type: 'success'
        });
    } else if (nutriScore === 3) { // C
        initiatives.push({
            icon: 'fa-info-circle',
            text: 'Moderate nutritional value. Consider pairing with fresh vegetables.',
            type: 'info'
        });
        initiatives.push({
            icon: 'fa-balance-scale',
            text: 'Balance this with other nutrient-rich foods in your diet.',
            type: 'info'
        });
    } else { // D or E
        initiatives.push({
            icon: 'fa-exclamation-triangle',
            text: 'High in unhealthy components. Consume in moderation.',
            type: 'warning'
        });
        initiatives.push({
            icon: 'fa-heart',
            text: 'Consider healthier alternatives with better NutriScore (A or B).',
            type: 'warning'
        });
    }
    
    // EcoScore-based tips
    if (ecoScore >= 4) { // A or B
        initiatives.push({
            icon: 'fa-leaf',
            text: 'Eco-friendly choice! This product has low environmental impact.',
            type: 'success'
        });
        initiatives.push({
            icon: 'fa-globe',
            text: 'Your choice helps protect the planet. Thank you!',
            type: 'success'
        });
    } else if (ecoScore === 3) { // C
        initiatives.push({
            icon: 'fa-recycle',
            text: 'Moderate environmental impact. Look for products with EcoScore A or B.',
            type: 'info'
        });
    } else { // D or E
        initiatives.push({
            icon: 'fa-smog',
            text: 'High environmental impact. Consider more sustainable alternatives.',
            type: 'warning'
        });
    }
    
    // Nutrition-based tips
    if (product.nutriments) {
        const fiber = product.nutriments.fiber_100g || 0;
        const protein = product.nutriments.proteins_100g || 0;
        const sugar = product.nutriments.sugars_100g || 0;
        const salt = product.nutriments.salt_100g || 0;
        
        if (fiber >= 3) {
            initiatives.push({
                icon: 'fa-seedling',
                text: 'Good source of fiber! Helps with digestion and heart health.',
                type: 'success'
            });
        } else if (fiber < 1) {
            initiatives.push({
                icon: 'fa-carrot',
                text: 'Consider adding more fiber-rich foods to your diet.',
                type: 'info'
            });
        }
        
        if (salt > 1.5) {
            initiatives.push({
                icon: 'fa-exclamation-triangle',
                text: 'High salt content. Consume in moderation.',
                type: 'warning'
            });
        }
        
        if (sugar > 22.5) {
            initiatives.push({
                icon: 'fa-candy-cane',
                text: 'High sugar content. Consider healthier alternatives.',
                type: 'warning'
            });
        }
    }
    
    // Display initiatives
    if (healthInitiativesSection && healthInitiativesList) {
        if (initiatives.length > 0) {
            healthInitiativesList.innerHTML = initiatives.map(initiative => `
                <div class="health-tip health-tip-${initiative.type}">
                    <i class="fas ${initiative.icon}"></i>
                    <span>${initiative.text}</span>
                </div>
            `).join('');
            healthInitiativesSection.classList.remove('hidden');
        } else {
            healthInitiativesSection.classList.add('hidden');
        }
    }
}

// Helper function to convert grade number to grade letter
function numberToGrade(num) {
    if (num >= 4.5) return 'a';
    if (num >= 3.5) return 'b';
    if (num >= 2.5) return 'c';
    if (num >= 1.5) return 'd';
    return 'e';
}

// Helper function to convert grade to number
function gradeToNumber(grade) {
    if (!grade || grade === 'N/A') return 0;
    const g = String(grade).toLowerCase();
    if (g === 'a') return 5;
    if (g === 'b') return 4;
    if (g === 'c') return 3;
    if (g === 'd') return 2;
    if (g === 'e') return 1;
    return 0;
}
