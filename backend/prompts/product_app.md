## Product Showcase Application Generator

Generate a complete product showcase application with filtering capabilities using our component system. This template provides patterns for AI-driven product display without hardcoded application logic.

**IMPORTANT: Your response MUST follow this structure exactly:**

```json
{
  "app": {
    "name": "Product Showcase",
    "description": "Interactive product catalog with filtering and details",
    "theme": "light"
  },
  "layout": {
    "type": "singlepage",
    "regions": ["header", "filters", "main", "footer"]
  },
  "components": [
    {
      "id": "app-title",
      "type": "text",
      "region": "header",
      "properties": {
        "content": "Product Showcase",
        "variant": "h2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "color": "#333"
      }
    },
    {
      "id": "filter-container",
      "type": "container",
      "region": "filters",
      "styles": {
        "display": "flex",
        "flexWrap": "wrap",
        "gap": "15px",
        "padding": "15px",
        "backgroundColor": "#f5f5f5",
        "borderRadius": "8px",
        "marginBottom": "20px",
        "justifyContent": "center"
      },
      "children": [
        /* Filter components will go here */
      ]
    },
    {
      "id": "products-grid",
      "type": "container",
      "region": "main",
      "styles": {
        "display": "grid",
        "gridTemplateColumns": "repeat(auto-fill, minmax(280px, 1fr))",
        "gap": "20px",
        "padding": "20px",
        "backgroundColor": "#fff"
      },
      "children": [
        /* Product cards will go here */
      ]
    },
    {
      "id": "no-products-message",
      "type": "text",
      "region": "main",
      "properties": {
        "content": "No products match your filter criteria.",
        "variant": "body1",
        "visible": false
      },
      "styles": {
        "textAlign": "center",
        "padding": "40px",
        "color": "#666",
        "backgroundColor": "#f9f9f9",
        "borderRadius": "8px",
        "width": "100%"
      }
    },
    {
      "id": "footer-text",
      "type": "text",
      "region": "footer",
      "properties": {
        "content": "© 2023 Product Showcase",
        "variant": "body2"
      },
      "styles": {
        "textAlign": "center",
        "padding": "20px",
        "fontSize": "0.8rem",
        "color": "#777"
      }
    }
  ]
}
```

### Functional Requirements

1. **Product Display**:
   - Present products in a responsive grid layout
   - Show key product details (image, name, price, rating)
   - Provide interactive product cards with hover effects
   - Support detailed product view on selection

2. **Filtering Capabilities**:
   - Filter products by category, price range, rating, etc.
   - Search products by name or description
   - Sort products by various criteria (price, popularity)
   - Show empty state when no products match filters

3. **User Interaction**:
   - Smooth animations for filtering changes
   - Provide visual feedback for user interactions
   - Support responsive design for different screen sizes
   - Enable product comparison when appropriate

### Implementation Examples

For product filtering and display, use these DOM manipulation patterns:

```javascript
// Initialize product data
window.productState = {
  products: [
    // Sample product data would be provided here
  ],
  filteredProducts: [],
  filters: {
    category: 'all',
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    searchTerm: ''
  }
};

// Render products with dynamic DOM manipulation
function renderProducts($m) {
  const container = $m('#products-grid');
  // Clear existing products
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  const products = window.productState.filteredProducts;
  
  if (products.length === 0) {
    $m('#no-products-message').show();
    return;
  }
  
  $m('#no-products-message').hide();
  
  // Create product cards
  products.forEach(product => {
    createProductCard($m, product, container);
  });
}

// Apply filters using component state
function applyFilters($m) {
  const { products, filters } = window.productState;
  
  const filtered = products.filter(product => {
    // Category filter
    if (filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }
    
    // Price range filter
    if (product.price < filters.minPrice || product.price > filters.maxPrice) {
      return false;
    }
    
    // Rating filter
    if (product.rating < filters.minRating) {
      return false;
    }
    
    // Search term
    if (filters.searchTerm && !product.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Update state
  window.productState.filteredProducts = filtered;
  
  // Re-render products
  renderProducts($m);
}

// Event handlers for filter components
$m('#category-filter').addEventListener('change', function(event) {
  window.productState.filters.category = event.target.value;
  applyFilters($m);
});

$m('#search-input').addEventListener('input', function(event) {
  window.productState.filters.searchTerm = event.target.value;
  applyFilters($m);
});

// Create product cards with all necessary components
function createProductCard($m, product, container) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.style.border = '1px solid #ddd';
  card.style.borderRadius = '8px';
  card.style.overflow = 'hidden';
  card.style.transition = 'all 0.3s ease';
  card.style.cursor = 'pointer';
  
  // Add hover effect
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px)';
    this.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
  });
  
  // Product image
  const image = document.createElement('div');
  image.style.height = '200px';
  image.style.backgroundImage = `url(${product.image})`;
  image.style.backgroundSize = 'cover';
  image.style.backgroundPosition = 'center';
  
  // Product info container
  const info = document.createElement('div');
  info.style.padding = '15px';
  
  // Product name
  const name = document.createElement('h3');
  name.textContent = product.name;
  name.style.margin = '0 0 10px 0';
  name.style.fontSize = '18px';
  
  // Product price
  const price = document.createElement('div');
  price.textContent = `$${product.price.toFixed(2)}`;
  price.style.fontWeight = 'bold';
  price.style.fontSize = '16px';
  price.style.color = '#4CAF50';
  
  // Product rating
  const rating = document.createElement('div');
  rating.style.display = 'flex';
  rating.style.alignItems = 'center';
  rating.style.marginTop = '10px';
  
  // Create star rating
  for (let i = 0; i < 5; i++) {
    const star = document.createElement('span');
    star.textContent = i < Math.round(product.rating) ? '★' : '☆';
    star.style.color = i < Math.round(product.rating) ? '#FFD700' : '#ccc';
    star.style.fontSize = '16px';
    rating.appendChild(star);
  }
  
  // Add elements to card
  info.appendChild(name);
  info.appendChild(price);
  info.appendChild(rating);
  
  card.appendChild(image);
  card.appendChild(info);
  
  // Add click event to show details
  card.addEventListener('click', function() {
    showProductDetails($m, product);
  });
  
  // Add card to container
  container.appendChild(card);
}
```

Generate a complete product showcase configuration with filtering capabilities and detailed product views implemented through generic component manipulation and state management. 