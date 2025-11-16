# Sustainable Food Tracker - EcoBite

A web-based application that helps users make informed food choices by providing sustainability and nutrition insights. Scan or search for products to discover their nutritional value and environmental impact.

## Features

### 🔍 Search & Scanner
- **Text Search**: Enter product name or barcode to search
- **Barcode Scanner**: Live camera scanning using QuaggaJS
- **Auto-fetch**: Automatically fetches product data on successful scan

### 📊 Product Insights
- **Product Information**: Name, image, brand
- **NutriScore**: A-E rating for nutritional quality (color-coded)
- **EcoScore**: A-E rating for environmental impact
- **CO₂ Impact**: Carbon footprint in g or kg
- **Ingredients**: Complete ingredients list
- **Additives**: List of additives detected
- **Nutrition Facts**: Detailed nutritional table (per 100g)
  - Calories
  - Proteins
  - Carbohydrates
  - Fats
  - Sugars
  - Salt
  - Fiber
  - Saturated Fat

### 📈 Data Visualization
- **Nutrition Chart**: Interactive bar chart using Chart.js comparing all nutritional values

### 📜 History Tracking
- Stores scan/search history in localStorage
- Tracks: name, image, NutriScore, EcoScore, timestamp
- Clickable history items to view products again
- Clear history functionality

### 🎮 Gamification (Eco-Points)
- **Points System**:
  - NutriScore A/B + EcoScore A/B → +5 points
  - Grade C → +2 points
  - Grade D/E → 0 points
- **Level System**: Every 100 points = 1 level
- **Profile Page**: Shows total points, level, progress bar, and recent activity

### 📱 Pages
1. **Home** (`index.html`): Search and scanner interface
2. **Product** (`product.html`): Detailed product information
3. **History** (`history.html`): View scan history
4. **Profile** (`profile.html`): Eco-points, level, and activity

## Tech Stack

- **HTML5**: Structure
- **CSS3**: Styling with CSS variables, responsive design
- **JavaScript (Vanilla)**: Application logic
- **OpenFoodFacts API**: Product data source
- **Chart.js**: Data visualization
- **QuaggaJS**: Barcode scanning
- **FontAwesome**: Icons
- **localStorage**: Data persistence

## Setup Instructions

### 1. Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local server) OR Node.js (alternative)
- Internet connection (for API calls)

### 2. Installation

#### Option A: Using Python (Recommended)
```bash
# Navigate to project directory
cd Sustainable-Food-Tracker

# Start local server
python -m http.server 8000
```

#### Option B: Using Node.js
```bash
# Install http-server globally (if not installed)
npm install -g http-server

# Navigate to project directory
cd Sustainable-Food-Tracker

# Start server
http-server -p 8000
```

#### Option C: Using npx (No installation needed)
```bash
# Navigate to project directory
cd Sustainable-Food-Tracker

# Start server
npx --yes serve -s . -l 8000
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:8000
```

**Important**: The app must be accessed via `http://localhost` (not `file://`) for:
- API calls to work (CORS)
- Camera access for barcode scanning
- localStorage to function properly

## File Structure

```
Sustainable-Food-Tracker/
├── index.html          # Home page (search & scanner)
├── product.html        # Product details page
├── history.html        # History page
├── profile.html        # Profile page
├── app.js              # Main application logic
├── storage.js          # localStorage management
├── scanner.js          # Barcode scanner (QuaggaJS)
├── style.css           # All styles
├── placeholder.svg     # Placeholder image
└── README.md           # This file
```

## External Libraries (CDN)

The following libraries are loaded via CDN:

### Chart.js
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```
- **Purpose**: Create nutrition charts
- **Version**: 4.4.0
- **Usage**: Bar charts for nutritional values comparison

### QuaggaJS
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js"></script>
```
- **Purpose**: Barcode scanning from camera
- **Version**: 0.12.1
- **Usage**: Live camera scanning for product barcodes

### FontAwesome
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```
- **Purpose**: Icons throughout the UI
- **Version**: 6.4.0

## API Integration

### OpenFoodFacts API
- **Base URL**: `https://world.openfoodfacts.org`
- **Endpoints Used**:
  - Product by barcode: `/api/v2/product/{barcode}`
  - Product search: `/cgi/search.pl?search_terms={query}&json=1`
  - Product details: `/api/v0/product/{barcode}.json`

The app tries multiple API endpoints for maximum compatibility.

## Testing the Scanner

### Browser Requirements
- **HTTPS or localhost**: Required for camera access
- **Camera permissions**: Browser will prompt for permission

### Testing Steps
1. Open the app at `http://localhost:8000`
2. Click "Scan Barcode" button
3. Allow camera permissions when prompted
4. Point camera at a barcode (EAN-8, EAN-13, UPC, etc.)
5. The scanner will automatically detect and navigate to product page

### Test Barcodes
If you don't have physical products, try these test barcodes:
- `3017620422003` - Nutella
- `7622210945078` - Oreo
- `3017620429484` - Coca Cola
- `5000159461125` - Kit Kat

Enter these in the search box or scan if you have the products.

## Features Breakdown

### Storage Module (`storage.js`)
- `saveToHistory(product)`: Save product to history
- `getHistory()`: Retrieve scan history
- `clearHistory()`: Clear all history
- `getEcoPoints()`: Get current eco-points
- `addEcoPoints(points)`: Add points
- `getLevel()`: Calculate current level
- `calculatePoints(nutriScore, ecoScore)`: Calculate points based on scores

### Scanner Module (`scanner.js`)
- Initializes QuaggaJS scanner
- Handles camera access
- Detects barcodes and navigates to product page
- Modal interface for scanning

### Main App (`app.js`)
- Search functionality
- Product fetching from API
- Product display with all details
- History page loading
- Profile page loading
- Chart creation

## UI Components

### Grade Badges
Color-coded badges for scores:
- **A**: Green (`--grade-a`)
- **B**: Light Green (`--grade-b`)
- **C**: Yellow (`--grade-c`)
- **D**: Orange (`--grade-d`)
- **E**: Red (`--grade-e`)

### Cards
Modern card-based design with:
- Rounded corners
- Soft shadows
- Border styling
- Responsive layout

### Navigation
Fixed bottom navigation bar with:
- Home icon
- History icon
- Profile icon
- Active state indication

## Troubleshooting

### Scanner Not Working
- Ensure you're using `http://localhost:8000` (not `file://`)
- Check browser camera permissions
- Try a different browser
- Ensure good lighting for barcode scanning

### API Errors
- Check internet connection
- OpenFoodFacts API might be temporarily down
- Try a different product/barcode
- Check browser console (F12) for detailed errors

### Styling Issues
- Hard refresh: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Check if all CSS files are loading

### localStorage Not Working
- Ensure you're using `http://localhost` (not `file://`)
- Check browser settings (some browsers block localStorage in private mode)
- Clear browser data if needed

## Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

**Note**: Camera access requires HTTPS or localhost in all browsers.

## Development

### Adding New Features
1. **New Page**: Create HTML file and add navigation link
2. **New Function**: Add to `app.js` or create new module
3. **New Style**: Add to `style.css` using CSS variables

### CSS Variables
All colors are defined in `:root`:
```css
--primary: hsl(158, 64%, 35%);
--primary-light: hsl(158, 64%, 45%);
--primary-dark: hsl(158, 64%, 25%);
--secondary: hsl(158, 30%, 95%);
--accent: hsl(170, 55%, 50%);
/* ... and more */
```

## License

This project is open source and available for educational purposes.

## Credits

- **OpenFoodFacts**: Product data API
- **Chart.js**: Chart library
- **QuaggaJS**: Barcode scanning library
- **FontAwesome**: Icons

---

**Made with ❤️ for sustainable food choices**
