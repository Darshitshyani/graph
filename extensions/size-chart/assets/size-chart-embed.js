/**
 * Size Chart App Embed JavaScript
 * This script handles the App Embed functionality for the size chart
 * It can display size charts on product pages or as a floating button
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const config = window.SizeChartEmbed?.config;
    
    if (!config || !config.enabled) {
      return;
    }

    // Get shop domain
    const shopDomain = config.shop || window.Shopify?.shop || document.querySelector('[data-shop]')?.dataset?.shop;
    if (!shopDomain) {
      console.warn('Size Chart Embed: Could not determine shop domain');
      return;
    }

    // Get app URL
    const appUrl = config.appUrl || window.sizeChartAppUrl || detectAppUrl();

    // Load the main size chart sync script if available
    // This reuses the existing size-chart-sync.js functionality
    loadSizeChartScript(shopDomain, appUrl);

    // Handle different display modes
    switch (config.displayMode) {
      case 'floating':
        initFloatingButton(config, shopDomain, appUrl);
        break;
      case 'auto':
        // Auto mode - the size-chart-sync.js will handle showing on product pages
        initAutoMode(shopDomain, appUrl);
        break;
      case 'hidden':
        // Hidden mode - only available via manual trigger
        // Size chart sync script will still work if buttons are manually added
        break;
    }
  }

  function detectAppUrl() {
    // Try to detect app URL from common patterns
    // This is a fallback - ideally set via block settings
    const metaAppUrl = document.querySelector('meta[name="size-chart-app-url"]');
    if (metaAppUrl) {
      return metaAppUrl.getAttribute('content');
    }
    return null;
  }

  function loadSizeChartScript(shopDomain, appUrl) {
    // Check if size-chart-sync.js is already loaded
    if (window.SizeChartSyncLoaded) {
      return;
    }

    // Try to find the existing script tag
    const existingScript = document.querySelector('script[src*="size-chart-sync.js"]');
    if (existingScript) {
      window.SizeChartSyncLoaded = true;
      return;
    }

    // If not found, we'll rely on the existing size-chart-sync.js being loaded
    // by other blocks or snippets
    console.log('Size Chart Embed: Using existing size chart functionality');
  }

  function initAutoMode(shopDomain, appUrl) {
    // Auto mode - check if we're on a product page
    // The existing size-chart-sync.js should handle this
    // This function just ensures the script is aware of the embed
    if (window.location.pathname.includes('/products/')) {
      console.log('Size Chart Embed: Auto mode enabled on product page');
    }
  }

  function initFloatingButton(config, shopDomain, appUrl) {
    // Create floating button container
    const floatingButton = document.createElement('div');
    floatingButton.id = 'size-chart-embed-floating-button';
    floatingButton.className = 'size-chart-embed-floating';

    // Position classes
    const positionMap = {
      'bottom-right': 'bottom-right',
      'bottom-left': 'bottom-left',
      'top-right': 'top-right',
      'top-left': 'top-left'
    };
    floatingButton.classList.add(positionMap[config.floatingPosition] || 'bottom-right');

    // Create button
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-chart-embed-floating-button';
    button.textContent = config.floatingButtonText || 'Size Chart';
    button.setAttribute('aria-label', config.floatingButtonText || 'Open Size Chart');

    // Get current product ID if on product page
    const productId = getProductId();
    if (productId) {
      button.setAttribute('data-product-id', productId);
    }

    // Add click handler
    button.addEventListener('click', function(e) {
      e.preventDefault();
      openSizeChart(productId, shopDomain, appUrl);
    });

    floatingButton.appendChild(button);
    document.body.appendChild(floatingButton);
  }

  function getProductId() {
    // Try to get product ID from various sources
    const productIdMeta = document.querySelector('meta[property="product:id"]') || 
                         document.querySelector('meta[name="product_id"]');
    if (productIdMeta) {
      return productIdMeta.getAttribute('content');
    }

    // Try to get from product JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        if (data['@type'] === 'Product' && data.productID) {
          return data.productID;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Try to get from URL
    const urlMatch = window.location.pathname.match(/\/products\/([^\/]+)/);
    if (urlMatch) {
      // This is the handle, not the ID, but we can use it
      return urlMatch[1];
    }

    return null;
  }

  function openSizeChart(productId, shopDomain, appUrl) {
    // Use the existing size chart modal functionality
    // Trigger the same event that size-chart-sync.js listens for
    const event = new CustomEvent('sizeChart:open', {
      detail: {
        productId: productId,
        shop: shopDomain,
        appUrl: appUrl
      }
    });
    document.dispatchEvent(event);

    // Fallback: If the event doesn't work, try to manually trigger
    // by finding and clicking the existing size chart button
    setTimeout(() => {
      const existingButton = document.querySelector('.size-chart-button[data-product-id="' + productId + '"]');
      if (existingButton) {
        existingButton.click();
      } else {
        // Last resort: manually open modal using size-chart-sync.js API
        if (window.SizeChartModal && typeof window.SizeChartModal.open === 'function') {
          window.SizeChartModal.open(productId, shopDomain, appUrl);
        }
      }
    }, 100);
  }

})();

