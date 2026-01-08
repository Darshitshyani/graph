/**
 * Size Chart Settings Sync and Modal
 * This script syncs settings from the Theme Integration page to the button
 * and handles opening the size chart modal when the button is clicked
 */

(function() {
  'use strict';
  // Get shop domain from the page
  const shopDomain = window.Shopify?.shop || document.querySelector('[data-shop]')?.dataset?.shop;

  
  if (!shopDomain) {
    console.warn('Size Chart: Could not determine shop domain');
    return;
  }

  // Normalize URL to ensure it has a protocol
  function normalizeUrl(url) {
    if (!url || url.trim() === '') {
      return null;
    }
    
    url = url.trim();
    
    // If URL already has a protocol, return as is
    if (url.match(/^https?:\/\//i)) {
      return url;
    }
    
    // If URL starts with //, add https:
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    // Otherwise, add https://
    return 'https://' + url;
  }

  // App URL - prioritize manually configured URL from block settings
  let appUrl = null;
  let appUrlPromise = null;

  // Get app URL - first check manually configured URL, then try simple fallback
  async function detectAppUrl() {
    if (appUrlPromise) {
      return appUrlPromise;
    }

    appUrlPromise = (async () => {
      // Method 1: Check for manually configured app URL from block settings (highest priority)
      if (window.sizeChartAppUrl && window.sizeChartAppUrl.trim()) {
        const configuredUrl = normalizeUrl(window.sizeChartAppUrl.trim());
        if (configuredUrl) {
          console.log('[Size Chart] Using manually configured app URL:', configuredUrl);
          return configuredUrl;
        }
      }

      // Method 2: Try to get app URL from theme settings API (fallback)
      const apiEndpoints = [
        `/apps/size-chart/api/theme-settings/public?shop=${encodeURIComponent(shopDomain)}`,
        `https://${shopDomain}/apps/size-chart/api/theme-settings/public?shop=${encodeURIComponent(shopDomain)}`,
      ];

      for (const apiUrl of apiEndpoints) {
        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
          });

          if (response.ok) {
            const data = await response.json();
            const savedAppUrl = data.settings?.appUrl || data.appUrl;
            
            if (savedAppUrl && savedAppUrl.trim()) {
              const detectedUrl = normalizeUrl(savedAppUrl.trim());
              console.log('[Size Chart] Using app URL from API:', detectedUrl);
              return detectedUrl;
            }
          }
        } catch (error) {
          console.warn(`[Size Chart] Failed to fetch from ${apiUrl}:`, error.message);
        }
      }

      // If no URL found, return null
      console.error('[Size Chart] No app URL found. Please configure the App URL in the block settings.');
      return null;
    })();

    return appUrlPromise;
  }

  // Get app URL - will detect if not already available
  async function getAppUrl() {
    if (appUrl) {
      return appUrl;
    }
    
    appUrl = await detectAppUrl();
    
    // Final validation - ensure URL is always absolute and has protocol
    if (appUrl && !appUrl.match(/^https?:\/\//i)) {
      console.warn('[Size Chart] App URL missing protocol, adding https://:', appUrl);
      appUrl = 'https://' + appUrl;
    }
    
    // Remove trailing slash for consistent URL construction
    if (appUrl && appUrl.endsWith('/')) {
      appUrl = appUrl.slice(0, -1);
    }
    
    return appUrl;
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function init() {
    try {
      // Detect app URL first
      appUrl = await getAppUrl();
      console.log('[Size Chart] Initialized with app URL:', appUrl);
      
      // Check chart availability and show/hide buttons
      await checkChartAvailability();
      
      // Load and apply settings
      loadSettings();
      
      // Attach click handlers to buttons
      attachClickHandlers();
    } catch (error) {
      console.error('[Size Chart] Initialization error:', error);
      // Even if there's an error, try to continue - the app URL might still work
      if (!appUrl) {
        appUrl = `https://${shopDomain}/apps/size-chart`;
        console.warn('[Size Chart] Using fallback app URL:', appUrl);
      }
      await checkChartAvailability();
      
      loadSettings();
      attachClickHandlers();
    }
  }

  // Check single button block for specific template type
  async function checkSingleButtonBlock(container, productId, templateType) {
    try {
      // Normalize product ID
      let normalizedProductId = String(productId);
      if (normalizedProductId.includes('/')) {
        normalizedProductId = String(normalizedProductId.split('/').pop());
      }
      if (normalizedProductId.match(/^gid:/) || normalizedProductId.match(/^[0-9]+$/)) {
        normalizedProductId = normalizedProductId.replace(/^gid:\/\/shopify\/Product\//, '');
      }

      // Check if using app proxy pattern
      const isAppProxy = appUrl.includes('/apps/');
      
      // Build API URL with templateType parameter
      let apiUrl;
      if (isAppProxy) {
        const urlParts = appUrl.replace(/^https?:\/\//, '').split('/apps/');
        const shopDomainFromUrl = urlParts[0];
        const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
        apiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/size-chart/public?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}&templateType=${encodeURIComponent(templateType)}`;
      } else {
        const apiPath = appUrl.endsWith('/') ? 'api/size-chart/public' : '/api/size-chart/public';
        apiUrl = `${appUrl}${apiPath}?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}&templateType=${encodeURIComponent(templateType)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        cache: 'no-cache',
      });

      if (response.ok) {
        const data = await response.json();
        const hasChart = data.hasChart === true || (data.template && !data.error);
        
        if (hasChart) {
          container.style.display = 'flex';
          container.setAttribute('data-has-chart', 'true');
          console.log(`[Size Chart] Showing ${templateType} button for product`, normalizedProductId);
        } else {
          container.style.display = 'none';
          container.setAttribute('data-has-chart', 'false');
          console.log(`[Size Chart] Hiding ${templateType} button for product`, normalizedProductId, '- no chart found');
        }
      } else if (response.status === 404) {
        container.style.display = 'none';
        container.setAttribute('data-has-chart', 'false');
        console.log(`[Size Chart] Hiding ${templateType} button for product`, normalizedProductId, '- 404 response');
      } else {
        console.warn(`[Size Chart] Error checking ${templateType} chart for product`, normalizedProductId, response.status);
        container.style.display = 'none';
        container.setAttribute('data-has-chart', 'false');
      }
    } catch (error) {
      console.error(`[Size Chart] Error checking ${templateType} chart availability:`, error);
      container.style.display = 'none';
      container.setAttribute('data-has-chart', 'false');
    }
  }

  // Check if chart exists for each product and show/hide buttons accordingly
  async function checkChartAvailability() {
    // Wait a bit for DOM to be fully ready, especially for dynamically loaded content
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check all button container types: single button blocks, buttons container (for multiple buttons), and old containers
    const containers = document.querySelectorAll(`
      .size-chart-guide-button-block[data-product-id],
      .custom-order-button-block[data-product-id],
      .size-chart-button-container[data-product-id],
      .size-chart-buttons-container[data-product-id]
    `);
    
    if (containers.length === 0) {
      console.log('[Size Chart] No button containers found on page');
      return;
    }

    // Ensure app URL is available
    if (!appUrl) {
      appUrl = await getAppUrl();
    }

    if (!appUrl) {
      console.warn('[Size Chart] Cannot check chart availability: app URL not available');
      // Don't hide buttons if URL is not available - they might work when URL is set
      return;
    }
    
    console.log('[Size Chart] Checking chart availability for', containers.length, 'container(s)');

    // Check each button container
    for (const container of containers) {
      const productId = container.dataset.productId;
      if (!productId) {
        console.warn('[Size Chart] Container missing product ID:', container);
        continue;
      }
      
      // Skip if already checked (unless force refresh)
      if (container.dataset.chartCheckPending !== 'true' && (container.dataset.hasChart === 'true' || container.dataset.templateTypesChecked === 'true')) {
        continue;
      }
      
      container.setAttribute('data-chart-check-pending', 'false');
      
      // Check if this is a single-button block (new blocks)
      const templateType = container.dataset.templateType; // 'table' or 'custom'
      const isSingleButtonBlock = container.classList.contains('size-chart-guide-button-block') || 
                                   container.classList.contains('custom-order-button-block');
      
      if (isSingleButtonBlock && templateType) {
        // Handle new single-button blocks - check for specific template type
        await checkSingleButtonBlock(container, productId, templateType);
        continue;
      }

      try {
        // Normalize product ID (extract numeric ID if it's a GID)
        let normalizedProductId = String(productId);
        if (normalizedProductId.includes('/')) {
          normalizedProductId = String(normalizedProductId.split('/').pop());
        }
        if (normalizedProductId.match(/^gid:/) || normalizedProductId.match(/^[0-9]+$/)) {
          normalizedProductId = normalizedProductId.replace(/^gid:\/\/shopify\/Product\//, '');
        }

        // Check if using app proxy pattern
        const isAppProxy = appUrl.includes('/apps/');
        
        // Check for chart types endpoint first (for multiple buttons)
        let typesApiUrl;
        if (isAppProxy) {
          const urlParts = appUrl.replace(/^https?:\/\//, '').split('/apps/');
          const shopDomainFromUrl = urlParts[0];
          const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
          typesApiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/size-chart-types/public?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}`;
        } else {
          const apiPath = appUrl.endsWith('/') ? 'api/size-chart-types/public' : '/api/size-chart-types/public';
          typesApiUrl = `${appUrl}${apiPath}?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}`;
        }

        // Check for both chart types
        const typesResponse = await fetch(typesApiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          cache: 'no-cache',
        });

        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          console.log('[Size Chart] Chart types for product', normalizedProductId, ':', typesData);
          
          const hasTableTemplate = typesData.hasTableTemplate === true;
          const hasCustomTemplate = typesData.hasCustomTemplate === true;
          
          // Check if this is a buttons container (for multiple buttons)
          if (container.classList.contains('size-chart-buttons-container')) {
            // Handle multiple buttons container
            const tableButtonWrapper = container.querySelector('.size-chart-table-button-wrapper');
            const customButtonWrapper = container.querySelector('.size-chart-custom-button-wrapper');
            
            if (hasTableTemplate && tableButtonWrapper) {
              tableButtonWrapper.style.display = 'block';
            } else if (tableButtonWrapper) {
              tableButtonWrapper.style.display = 'none';
            }
            
            if (hasCustomTemplate && customButtonWrapper) {
              customButtonWrapper.style.display = 'block';
            } else if (customButtonWrapper) {
              customButtonWrapper.style.display = 'none';
            }
            
            // Show container if at least one template exists
            if (hasTableTemplate || hasCustomTemplate) {
              container.style.display = 'flex';
              container.setAttribute('data-has-chart', 'true');
            } else {
              container.style.display = 'none';
              container.setAttribute('data-has-chart', 'false');
            }
            
            container.setAttribute('data-template-types-checked', 'true');
            container.setAttribute('data-has-table-template', hasTableTemplate ? 'true' : 'false');
            container.setAttribute('data-has-custom-template', hasCustomTemplate ? 'true' : 'false');
          } else {
            // Handle single button container - check if we should show it
            // For single button containers, we check if there's at least one chart type
            const originalDisplay = container.getAttribute('data-original-display') || 'flex';
            
            if (hasTableTemplate || hasCustomTemplate) {
              container.style.display = originalDisplay;
              container.setAttribute('data-has-chart', 'true');
              console.log('[Size Chart] Showing button for product', normalizedProductId);
            } else {
              container.style.display = 'none';
              container.setAttribute('data-has-chart', 'false');
              console.log('[Size Chart] Hiding button for product', normalizedProductId, '- no chart found');
            }
          }
        } else {
          // Fallback to old API if types endpoint fails
          console.warn('[Size Chart] Chart types API error, falling back to old API');
          
          let apiUrl;
          if (isAppProxy) {
            const urlParts = appUrl.replace(/^https?:\/\//, '').split('/apps/');
            const shopDomainFromUrl = urlParts[0];
            const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
            apiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/size-chart/public?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}`;
          } else {
            const apiPath = appUrl.endsWith('/') ? 'api/size-chart/public' : '/api/size-chart/public';
            apiUrl = `${appUrl}${apiPath}?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}`;
          }

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors',
            cache: 'no-cache',
          });

          if (response.ok) {
            const data = await response.json();
            const originalDisplay = container.getAttribute('data-original-display') || 'flex';
            
            if (data.hasChart === true || data.hasChart === 'true' || (data.template && !data.error)) {
              container.style.display = originalDisplay;
              container.setAttribute('data-has-chart', 'true');
            } else {
              container.style.display = 'none';
              container.setAttribute('data-has-chart', 'false');
            }
          } else if (response.status === 404) {
            container.style.display = 'none';
            container.setAttribute('data-has-chart', 'false');
          } else {
            const originalDisplay = container.getAttribute('data-original-display') || 'flex';
            container.style.display = originalDisplay;
          }
        }
      } catch (error) {
        console.error('[Size Chart] Error checking chart availability for product:', productId, error);
      }
    }
  }

  async function loadSettings() {
    // Ensure app URL is available
    if (!appUrl) {
      appUrl = await getAppUrl();
    }

    // Fetch settings from API
    // Check if using app proxy pattern
    const isAppProxy = appUrl && appUrl.includes('/apps/');
    
    let settingsUrl;
    if (isAppProxy) {
      // For app proxy: use /apps/{handle}/api/theme-settings/public
      const urlParts = appUrl.replace(/^https?:\/\//, '').split('/apps/');
      const shopDomainFromUrl = urlParts[0];
      const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
      settingsUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/theme-settings/public?shop=${encodeURIComponent(shopDomain)}`;
    } else {
      // For direct app URL
      const settingsPath = appUrl.endsWith('/') ? 'api/theme-settings/public' : '/api/theme-settings/public';
      settingsUrl = `${appUrl}${settingsPath}?shop=${encodeURIComponent(shopDomain)}`;
    }
    
    fetch(settingsUrl)
      .then(response => response.json())
      .then(data => {
        // Priority: Use saved appUrl from settings if available
        if (data.appUrl && data.appUrl.trim() && data.appUrl !== `https://${shopDomain}/apps/size-chart`) {
          const savedAppUrl = normalizeUrl(data.appUrl.trim());
          if (savedAppUrl !== appUrl) {
            console.log('[Size Chart] Using saved appUrl from settings:', savedAppUrl);
            appUrl = savedAppUrl;
          }
        } else if (data.settings?.appUrl && data.settings.appUrl.trim() && data.settings.appUrl !== `https://${shopDomain}/apps/size-chart`) {
          const savedAppUrl = normalizeUrl(data.settings.appUrl.trim());
          if (savedAppUrl !== appUrl) {
            console.log('[Size Chart] Using saved appUrl from settings object:', savedAppUrl);
            appUrl = savedAppUrl;
          }
        }
        
        if (data.settings) {
          applySettings(data.settings);
        }
      })
      .catch(error => {
        console.warn('Size Chart: Could not load settings from API', error);
        // Button will use default block settings if API fails
      });
  }

  // Helper function to get theme button font style
  function getThemeButtonFontStyle() {
    try {
      // Try to find theme buttons (common selectors)
      const themeButton = document.querySelector('button:not(.size-chart-button), .btn, [class*="button"]:not(.size-chart-button), input[type="submit"]');
      if (themeButton) {
        const computedStyle = window.getComputedStyle(themeButton);
        return {
          fontFamily: computedStyle.fontFamily,
          fontStyle: computedStyle.fontStyle,
          fontWeight: computedStyle.fontWeight,
          letterSpacing: computedStyle.letterSpacing,
          textTransform: computedStyle.textTransform
        };
      }
    } catch (e) {
      console.warn('[Size Chart] Could not get theme button font style:', e);
    }
    return null;
  }

  function applySettings(settings) {
    // Get theme button font style if available
    const themeFontStyle = getThemeButtonFontStyle();
    
    const containers = document.querySelectorAll('.size-chart-button-container');
    
    containers.forEach(container => {
      const button = container.querySelector('.size-chart-button');
      if (!button) return;

      // Apply alignment
      container.style.justifyContent = 
        settings.alignment === 'left' ? 'flex-start' :
        settings.alignment === 'center' ? 'center' :
        settings.alignment === 'right' ? 'flex-end' : 'center';

      // Apply margins
      container.style.marginTop = `${settings.marginTop || 20}px`;
      container.style.marginBottom = `${settings.marginBottom || 20}px`;
      container.style.marginLeft = `${settings.marginLeft || 20}px`;
      container.style.marginRight = `${settings.marginRight || 20}px`;

      // Apply button styles
      button.style.backgroundColor = settings.backgroundColor || '#ffffff';
      button.style.color = settings.textColor || '#000000';
      button.style.borderColor = settings.borderColor || '#000000';
      button.style.borderRadius = `${settings.borderRadius || 0}px`;
      button.style.width = settings.buttonWidth === 'fill' ? '100%' : 'auto';
      
      // Apply theme font style
      if (themeFontStyle) {
        button.style.fontFamily = themeFontStyle.fontFamily;
        button.style.fontStyle = themeFontStyle.fontStyle;
        button.style.fontWeight = themeFontStyle.fontWeight;
        button.style.letterSpacing = themeFontStyle.letterSpacing;
        button.style.textTransform = themeFontStyle.textTransform;
      } else {
        button.style.fontFamily = 'inherit';
      }

      // Apply button size
      if (settings.buttonSize === 'small') {
        button.style.padding = '6px 12px';
        button.style.fontSize = '14px';
      } else if (settings.buttonSize === 'medium') {
        button.style.padding = '8px 16px';
        button.style.fontSize = '16px';
      } else if (settings.buttonSize === 'large') {
        button.style.padding = '12px 24px';
        button.style.fontSize = '18px';
      }

      // Update button text
      const textSpan = button.querySelector('span');
      if (textSpan) {
        textSpan.textContent = settings.buttonText || 'Size Chart';
      }
    });

    // Apply to multiple buttons containers
    const buttonsContainers = document.querySelectorAll('.size-chart-buttons-container');
    buttonsContainers.forEach(container => {
      // Apply alignment
      container.style.justifyContent = 
        settings.alignment === 'left' ? 'flex-start' :
        settings.alignment === 'center' ? 'center' :
        settings.alignment === 'right' ? 'flex-end' : 'center';

      // Apply margins
      container.style.marginTop = `${settings.marginTop || 20}px`;
      container.style.marginBottom = `${settings.marginBottom || 20}px`;
      container.style.marginLeft = `${settings.marginLeft || 20}px`;
      container.style.marginRight = `${settings.marginRight || 20}px`;

      // Apply styles to both buttons
      const buttons = container.querySelectorAll('.size-chart-button');
      buttons.forEach(button => {
        // Custom Size button gets black background with white text
        if (button.classList.contains('size-chart-custom-button')) {
          button.style.backgroundColor = '#000000';
          button.style.color = '#ffffff';
          button.style.border = 'none';
          button.style.borderRadius = '8px';
        } else {
          // Size Chart button uses settings
          button.style.backgroundColor = settings.backgroundColor || '#ffffff';
          button.style.color = settings.textColor || '#000000';
          button.style.borderColor = settings.borderColor || '#000000';
          button.style.borderRadius = `${settings.borderRadius || 0}px`;
        }
        
        button.style.width = settings.buttonWidth === 'fill' ? '100%' : 'auto';
        
        // Apply theme font style
        if (themeFontStyle) {
          button.style.fontFamily = themeFontStyle.fontFamily;
          button.style.fontStyle = themeFontStyle.fontStyle;
          button.style.fontWeight = themeFontStyle.fontWeight;
          button.style.letterSpacing = themeFontStyle.letterSpacing;
          button.style.textTransform = themeFontStyle.textTransform;
        } else {
          button.style.fontFamily = 'inherit';
        }

        // Apply button size
        if (settings.buttonSize === 'small') {
          button.style.padding = '6px 12px';
          button.style.fontSize = '14px';
        } else if (settings.buttonSize === 'medium') {
          button.style.padding = '8px 16px';
          button.style.fontSize = '16px';
        } else if (settings.buttonSize === 'large') {
          button.style.padding = '12px 24px';
          button.style.fontSize = '18px';
        }

        // Update button text based on button type
        const textSpan = button.querySelector('span');
        if (textSpan) {
          if (button.classList.contains('size-chart-table-button')) {
            textSpan.textContent = settings.buttonText || 'Size Chart';
          } else if (button.classList.contains('size-chart-custom-button')) {
            textSpan.textContent = settings.customSizeButtonText || 'Custom Size';
          }
        }
      });
    });
  }

  function attachClickHandlers() {
    // Use event delegation to handle dynamically added buttons
    document.addEventListener('click', async function(e) {
      const button = e.target.closest('.size-chart-button');
      if (button) {
        e.preventDefault();
        e.stopPropagation();
        const productId = button.dataset.productId;
        const templateType = button.dataset.templateType || null;
        if (productId) {
          await openSizeChartModal(productId, templateType);
        }
      }
    });
    
    // Also attach directly to existing buttons for immediate functionality
    const buttons = document.querySelectorAll('.size-chart-button');
    buttons.forEach(button => {
      // Remove any existing listeners to avoid duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      newButton.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        const productId = this.dataset.productId;
        const templateType = this.dataset.templateType || null;
        if (productId) {
          await openSizeChartModal(productId, templateType);
        }
      });
    });
  }

  async function openSizeChartModal(productId, templateType = null) {
    // Ensure app URL is available
    if (!appUrl) {
      appUrl = await getAppUrl();
    }
    
    // Add responsive styles if not already added
    if (!document.getElementById('size-chart-responsive-styles')) {
      const style = document.createElement('style');
      style.id = 'size-chart-responsive-styles';
      style.textContent = `
        @media (max-width: 768px) {
          .size-chart-modal {
            max-width: 95vw !important;
            min-width: auto !important;
            width: 95vw !important;
            margin: 10px auto !important;
          }
          .size-chart-field-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .size-chart-field-row > div:nth-child(2) {
            min-width: auto !important;
            width: 100% !important;
          }
          .size-chart-field-row > div:last-child {
            min-width: auto !important;
            width: 100% !important;
          }
          .size-chart-modal-header {
            flex-wrap: wrap !important;
            gap: 12px !important;
            padding: 16px !important;
          }
          .size-chart-modal-title {
            font-size: 16px !important;
          }
        }
        @media (max-width: 480px) {
          .size-chart-modal {
            max-width: calc(100vw - 40px) !important;
            min-width: auto !important;
            width: calc(100vw - 40px) !important;
            margin: 0 !important;
            border-radius: 8px !important;
            max-height: calc(100vh - 40px) !important;
          }
          .size-chart-modal-overlay {
            padding: 20px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'size-chart-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'size-chart-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 60%;
      max-width: 60%;
      min-width: 400px;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #e1e3e5;
      margin: 20px auto;
    `;

    // Header with unit toggle and close button
    const header = document.createElement('div');
    header.className = 'size-chart-modal-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 12px;
    `;

    // Store template data in closure for later use
    let templateData = null;
    let currentUnit = 'in';
    
    // Content area (defined early so helper functions can reference it)
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      padding: 0;
      min-height: 0;
    `;

    // Helper function to check if there's unsaved data
    const hasUnsavedData = () => {
      try {
        // Check for form content in the modal - try multiple selectors
        const formContent = content.querySelector('.size-chart-form-content') || 
                           content.querySelector('.size-chart-form-container') ||
                           content.querySelector('form') ||
                           content;
        
        if (!formContent) {
          return false;
        }
        
        // Check if any input fields have values
        const inputs = formContent.querySelectorAll('input[type="number"]');
        for (let input of inputs) {
          const value = input.value;
          if (value !== null && value !== undefined && value !== '' && String(value).trim() !== '') {
            return true;
          }
        }
        
        // Check fit preference
        const fitSelect = formContent.querySelector('select');
        if (fitSelect && fitSelect.value && fitSelect.value.trim() !== '') {
          return true;
        }
        
        // Check stitching notes
        const notesTextarea = formContent.querySelector('textarea');
        if (notesTextarea && notesTextarea.value && notesTextarea.value.trim() !== '') {
          return true;
        }
      } catch (error) {
        console.error('[Size Chart] Error checking for unsaved data:', error);
        return false;
      }
      
      return false;
    };

    // Function to show warning modal
    const showUnsavedChangesWarning = (onConfirm) => {
      const warningOverlay = document.createElement('div');
      warningOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10003;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;

      const warningModal = document.createElement('div');
      warningModal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      `;

      const warningTitle = document.createElement('h3');
      warningTitle.textContent = 'Unsaved Changes';
      warningTitle.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        color: #202223;
        margin: 0 0 12px 0;
      `;
      warningModal.appendChild(warningTitle);

      const warningMessage = document.createElement('p');
      warningMessage.textContent = 'You have unsaved changes. Are you sure you want to leave? You will lose this data.';
      warningMessage.style.cssText = `
        font-size: 14px;
        color: #6d7175;
        margin: 0 0 24px 0;
        line-height: 1.5;
      `;
      warningModal.appendChild(warningMessage);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;

      const cancelWarningBtn = document.createElement('button');
      cancelWarningBtn.textContent = 'Cancel';
      cancelWarningBtn.style.cssText = `
        padding: 10px 20px;
        border: 1px solid #e1e3e5;
        border-radius: 4px;
        background: #ffffff;
        color: #202223;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      `;
      cancelWarningBtn.onmouseover = () => {
        cancelWarningBtn.style.backgroundColor = '#f6f6f7';
      };
      cancelWarningBtn.onmouseout = () => {
        cancelWarningBtn.style.backgroundColor = '#ffffff';
      };
      cancelWarningBtn.onclick = () => {
        warningOverlay.remove();
      };

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Discard Changes';
      confirmBtn.style.cssText = `
        padding: 10px 20px;
        border: 1px solid #d72c0d;
        border-radius: 4px;
        background: transparent;
        color: #d72c0d;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      `;
      confirmBtn.onmouseover = () => {
        confirmBtn.style.backgroundColor = '#fee';
      };
      confirmBtn.onmouseout = () => {
        confirmBtn.style.backgroundColor = 'transparent';
      };
      confirmBtn.onclick = () => {
        warningOverlay.remove();
        if (onConfirm) onConfirm();
      };

      buttonContainer.appendChild(cancelWarningBtn);
      buttonContainer.appendChild(confirmBtn);
      warningModal.appendChild(buttonContainer);

      warningOverlay.appendChild(warningModal);
      
      // Prevent clicks inside warning modal from closing
      warningModal.onclick = (e) => {
        e.stopPropagation();
      };
      
      // Close when clicking outside the warning modal
      warningOverlay.onclick = (e) => {
        if (e.target === warningOverlay) {
          warningOverlay.remove();
        }
      };

      document.body.appendChild(warningOverlay);
    };

    const title = document.createElement('h2');
    title.textContent = 'New Measurement Template';
    title.style.cssText = `
      font-size: clamp(16px, 4vw, 18px);
      font-weight: 600;
      color: #202223;
      margin: 0;
      flex: 1;
      min-width: 0;
    `;

    const headerRight = document.createElement('div');
    headerRight.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
    `;

    // Unit toggle buttons
    const unitToggle = document.createElement('div');
    unitToggle.style.cssText = `
      display: flex;
      border: 1px solid #202223;
      border-radius: 4px;
      overflow: hidden;
    `;

    const createUnitButton = (unit, label) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        background: ${currentUnit === unit ? '#000000' : '#ffffff'};
        color: ${currentUnit === unit ? '#ffffff' : '#000000'};
        cursor: pointer;
        transition: all 0.2s;
      `;
      btn.onclick = () => {
        currentUnit = unit;
        unitButtons.forEach((b, i) => {
          b.style.background = i === (unit === 'in' ? 0 : 1) ? '#000000' : '#ffffff';
          b.style.color = i === (unit === 'in' ? 0 : 1) ? '#ffffff' : '#000000';
        });
        // Re-render form if needed (unit conversion logic can be added here)
        if (updateTabContentFn) updateTabContentFn();
      };
      return btn;
    };

    const unitButtons = [
      createUnitButton('in', 'In'),
      createUnitButton('cm', 'cm')
    ];
    unitButtons.forEach(btn => unitToggle.appendChild(btn));
    headerRight.appendChild(unitToggle);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #202223;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#f5f5f5';
    closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => {
      if (hasUnsavedData()) {
        showUnsavedChangesWarning(() => overlay.remove());
      } else {
        overlay.remove();
      }
    };
    headerRight.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(headerRight);

    // Tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.style.cssText = `
      border-bottom: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      min-height: 48px;
    `;

    let activeTab = 0;
    let updateTabContentFn = null; // Will be set after data is loaded

    const createTab = (index, label) => {
      const tab = document.createElement('button');
      tab.textContent = label;
      tab.style.cssText = `
        flex: 1;
        padding: 0 16px;
        min-height: 48px;
        font-size: 14px;
        font-weight: 600;
        text-transform: none;
        border: none;
        background: none;
        color: ${activeTab === index ? '#202223' : '#6d7175'};
        cursor: pointer;
        border-bottom: 2px solid ${activeTab === index ? '#202223' : 'transparent'};
        transition: all 0.2s;
      `;
      tab.onclick = () => {
        activeTab = index;
        tabs.querySelectorAll('button').forEach((t, i) => {
          t.style.color = i === index ? '#202223' : '#6d7175';
          t.style.borderBottomColor = i === index ? '#202223' : 'transparent';
        });
        if (updateTabContentFn) updateTabContentFn();
      };
      return tab;
    };

    tabs.appendChild(createTab(0, 'Details'));
    tabs.appendChild(createTab(1, 'How to Measure'));
    tabsContainer.appendChild(tabs);

    // Loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      padding: 40px;
      text-align: center;
      color: #6d7175;
    `;
    loadingDiv.innerHTML = 'Loading size chart...';
    content.appendChild(loadingDiv);

    modal.appendChild(header);
    modal.appendChild(tabsContainer);
    modal.appendChild(content);
    overlay.appendChild(modal);
    
    // Close on overlay click (disabled on mobile)
    overlay.onclick = (e) => {
      // Disable outside click on mobile devices
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        return; // Don't close on outside click for mobile
      }
      
      // Only close if clicking directly on the overlay, not on the modal
      if (e.target === overlay) {
        if (hasUnsavedData()) {
          showUnsavedChangesWarning(() => overlay.remove());
        } else {
          overlay.remove();
        }
      }
    };
    
    // Prevent modal clicks from closing
    modal.onclick = (e) => {
      e.stopPropagation();
    };

    document.body.appendChild(overlay);

    // Validate appUrl before constructing API URL
    if (!appUrl || !appUrl.match(/^https?:\/\//i)) {
      const errorMsg = 'App URL could not be detected automatically.';
      console.error('[Size Chart]', errorMsg);
      console.error('[Size Chart] Current appUrl value:', appUrl);
      console.error('[Size Chart] Troubleshooting:');
      console.error('[Size Chart] 1. Make sure SHOPIFY_APP_URL environment variable is set');
      console.error('[Size Chart] 2. If using "shopify app dev", the URL should be set automatically');
      console.error('[Size Chart] 3. Check that your app server is running');
      
      content.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h3 style="color: #202223; margin-bottom: 12px;">Configuration Error</h3>
          <p style="color: #6d7175; margin-bottom: 8px; font-weight: 500;">${errorMsg}</p>
          <div style="color: #6d7175; font-size: 14px; text-align: left; max-width: 500px; margin: 0 auto; margin-top: 16px;">
            <p style="margin-bottom: 8px;"><strong>To fix this:</strong></p>
            <ol style="margin-left: 20px; line-height: 1.8;">
              <li>Make sure you're running <code style="background: #f6f6f7; padding: 2px 6px; border-radius: 3px;">shopify app dev</code></li>
              <li>Check that <code style="background: #f6f6f7; padding: 2px 6px; border-radius: 3px;">SHOPIFY_APP_URL</code> environment variable is set</li>
              <li>Verify your app server is running and accessible</li>
              <li>Check the browser console for more details</li>
            </ol>
          </div>
        </div>
      `;
      return;
    }
    
    // Normalize product ID for API request
    let normalizedProductId = String(productId);
    if (normalizedProductId.includes('/')) {
      // Extract the last segment (numeric ID) if it's a GID
      normalizedProductId = String(normalizedProductId.split('/').pop());
    }
    // Remove gid://shopify/Product/ prefix if present
    normalizedProductId = normalizedProductId.replace(/^gid:\/\/shopify\/Product\//, '');
    
    // Fetch size chart data
    // Check if using app proxy pattern (URL contains /apps/)
    const isAppProxy = appUrl.includes('/apps/');
    
    let apiUrl;
    if (isAppProxy) {
      // For app proxy: Shopify routes /apps/{handle}/* to your app
      // The full path on storefront is: /apps/{handle}/api/size-chart/public
      // Shopify strips /apps/{handle} and forwards /api/size-chart/public to your app
      const urlParts = appUrl.replace(/^https?:\/\//, '').split('/apps/');
      const shopDomainFromUrl = urlParts[0];
      const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
      
      // Construct the full app proxy URL
      let queryParams = `shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}`;
      if (templateType) {
        queryParams += `&templateType=${encodeURIComponent(templateType)}`;
      }
      apiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/size-chart/public?${queryParams}`;
      
      console.warn('[Size Chart] Using app proxy URL. Make sure app proxy is configured in Shopify Partners Dashboard.');
      console.warn('[Size Chart] App proxy subpath should be: /apps/' + appHandle);
    } else {
      // For direct app URL: use the app URL directly
      const apiPath = appUrl.endsWith('/') ? 'api/size-chart/public' : '/api/size-chart/public';
      let queryParams = `shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(normalizedProductId)}`;
      if (templateType) {
        queryParams += `&templateType=${encodeURIComponent(templateType)}`;
      }
      apiUrl = `${appUrl}${apiPath}?${queryParams}`;
    }
    
    console.log('[Size Chart] Template type:', templateType);
    
    console.log('[Size Chart] Fetching from URL:', apiUrl);
    console.log('[Size Chart] Using app proxy:', isAppProxy);
    console.log('[Size Chart] App URL:', appUrl);
    console.log('[Size Chart] Shop Domain:', shopDomain);
    console.log('[Size Chart] Product ID:', productId);
    console.log('[Size Chart] Shop Domain:', shopDomain);
    console.log('[Size Chart] Product ID:', productId);
    
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors', // Explicitly request CORS
    })
      .then(response => {
      
        console.log('[Size Chart] API response status:', response.status);
        console.log('[Size Chart] API response headers:', Object.fromEntries(response.headers.entries()));
        if (!response.ok) {
          console.error('[Size Chart] API response not OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('[Size Chart] API data received:', data);
        // Check for errors or missing chart data
        if (data.error || (!data.hasChart && !data.template)) {
          const errorMessage = data.error || 'No size chart available';
          console.warn('[Size Chart] Error or no chart:', errorMessage);
          content.innerHTML = `
            <div style="padding: 40px; text-align: center;">
              <h3 style="color: #202223; margin-bottom: 12px;">Error Loading Size Chart</h3>
              <p style="color: #6d7175;">${errorMessage}</p>
            </div>
          `;
          return;
        }

        const template = data.template;
        templateData = template;
        const chartData = template.chartData || {};
        const isMeasurementTemplate = chartData.isMeasurementTemplate === true;
        const measurementFields = chartData.measurementFields || [];
        const sizeData = chartData.sizeData || [];
        const columns = chartData.columns || [];

        // Debug logging
        console.log('[Size Chart] Received chart data:', {
          hasSizeData: !!chartData.sizeData,
          sizeDataLength: sizeData.length,
          hasColumns: !!chartData.columns,
          columnsLength: columns.length,
          isMeasurementTemplate: isMeasurementTemplate,
          chartDataKeys: Object.keys(chartData),
          sizeDataSample: sizeData.slice(0, 2)
        });

        // Update title with product name if available, otherwise use template name
        if (data.productName) {
          title.textContent = data.productName;
        } else if (isMeasurementTemplate && template.name) {
          title.textContent = template.name;
        } else {
          title.textContent = 'Size Chart';
        }

        // Function to update tab content
        updateTabContentFn = function() {
          content.innerHTML = '';

          if (activeTab === 0) {
            // Details Tab
            if (isMeasurementTemplate) {
              // Custom Measurement Template - Display as form
              if (measurementFields.length === 0) {
                content.innerHTML = `
                  <div style="padding: 40px; text-align: center; color: #6d7175;">
                    No measurement fields available for this template.
                  </div>
                `;
                return;
              }

              const formContainer = document.createElement('div');
              formContainer.className = 'size-chart-form-container';
              formContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 0;
                width: 100%;
                margin: 0 auto;
                padding: 0;
                box-sizing: border-box;
                min-height: 0;
                flex: 1;
                height: 100%;
                overflow: hidden;
              `;

              // Content wrapper for padding
              const formContent = document.createElement('div');
              formContent.className = 'size-chart-form-content';
              formContent.style.cssText = `
                padding: 24px;
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                min-height: 0;
                max-height: 100%;
                -webkit-overflow-scrolling: touch;
              `;

              // Section title
              const sectionTitle = document.createElement('h3');
              sectionTitle.className = 'size-chart-section-title';
              sectionTitle.textContent = 'Enter Your Measurements';
              sectionTitle.style.cssText = `
                font-size: 16px;
                font-weight: 600;
                color: #202223;
                margin: 0 0 24px 0;
              `;
              formContent.appendChild(sectionTitle);

              // Create fields container
              const fieldsContainer = document.createElement('div');
              fieldsContainer.className = 'size-chart-fields-container';
              fieldsContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 24px;
              `;

              // Helper function to create info icon
              const createInfoIcon = (field) => {
                const infoIcon = document.createElement('button');
                infoIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1 -19.995 .324l-.005 -.324l.004 -.28c.148 -5.393 4.566 -9.72 9.996 -9.72zm0 9h-1l-.117 .007a1 1 0 0 0 0 1.986l.117 .007v3l.007 .117a1 1 0 0 0 .876 .876l.117 .007h1l.117 -.007a1 1 0 0 0 .876 -.876l.007 -.117l-.007 -.117a1 1 0 0 0 -.764 -.857l-.112 -.02l-.117 -.006v-3l-.007 -.117a1 1 0 0 0 -.876 -.876l-.117 -.007zm.01 -3l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007z" />
                </svg>`;
                infoIcon.style.cssText = `
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  padding: 0;
                  color: #6d7175;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 18px;
                  height: 18px;
                  flex-shrink: 0;
                `;
                infoIcon.title = 'Measurement guide';
                infoIcon.onclick = () => {
                  // Format field name for title
                  const fieldName = field.name || field.id;
                  let formattedFieldName = fieldName;
                  if (fieldName.includes('/')) {
                    formattedFieldName = fieldName.split('/').map(part => 
                      part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase()
                    ).join(' / ');
                  } else {
                    formattedFieldName = fieldName.split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  }

                  // Show measurement guide modal
                  const guideModal = document.createElement('div');
                  guideModal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    box-sizing: border-box;
                  `;

                  const guideContent = document.createElement('div');
                  guideContent.className = 'measurement-guide-modal';
                  guideContent.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    max-width: 55%;
                    width: 55%;
                    max-height: 90vh;
                    padding: 0;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                  `;

                  // Header section
                  const header = document.createElement('div');
                  header.className = 'size-chart-modal-header';
                  header.style.cssText = `
                    padding: 24px 24px 16px 24px;
                    border-bottom: 1px solid #e1e3e5;
                    position: relative;
                    flex-shrink: 0;
                  `;

                  const closeBtn = document.createElement('button');
                  closeBtn.innerHTML = '×';
                  closeBtn.style.cssText = `
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #202223;
                    padding: 4px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                  `;
                  closeBtn.onclick = () => guideModal.remove();
                  header.appendChild(closeBtn);

                  const guideTitle = document.createElement('h2');
                  guideTitle.className = 'measurement-guide-title';
                  guideTitle.textContent = `How to Measure: ${formattedFieldName}`;
                  guideTitle.style.cssText = `
                    font-size: 24px;
                    font-weight: 600;
                    color: #202223;
                    margin: 0 0 8px 0;
                    padding-right: 40px;
                  `;
                  header.appendChild(guideTitle);

                  const subtitle = document.createElement('p');
                  subtitle.className = 'measurement-guide-subtitle';
                  subtitle.textContent = 'Follow these instructions to get accurate measurements';
                  subtitle.style.cssText = `
                    font-size: 14px;
                    color: #202223;
                    margin: 0;
                    padding-right: 40px;
                  `;
                  header.appendChild(subtitle);

                  guideContent.appendChild(header);

                  // Body section
                  const body = document.createElement('div');
                  body.className = 'size-chart-modal-body';
                  body.style.cssText = `
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    align-items: center;
                    justify-content: flex-start;
                    overflow-y: auto;
                    flex: 1;
                    min-height: 0;
                  `;

                  // Image placeholder section
                  const imagePlaceholder = document.createElement('div');
                  imagePlaceholder.style.cssText = `
                    width: 250px;
                    min-height: 250px;
                    border: 2px dashed #e1e3e5;
                    border-radius: 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #fafbfb;
                    margin-bottom: 8px;
                  `;

                  const placeholderIcon = document.createElement('div');
                  placeholderIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>`;
                  placeholderIcon.style.cssText = `
                    margin-bottom: 8px;
                    color: #9ca3af;
                  `;
                  imagePlaceholder.appendChild(placeholderIcon);

                  const placeholderText = document.createElement('div');
                  placeholderText.className = 'measurement-guide-placeholder-text';
                  placeholderText.textContent = 'No guide image available';
                  placeholderText.style.cssText = `
                    font-size: 14px;
                    color: #6d7175;
                    text-align: center;
                  `;
                  imagePlaceholder.appendChild(placeholderText);

                  // If there's a guide image, replace placeholder with image
                  if (field.guideImage) {
                    const img = document.createElement('img');
                    img.src = field.guideImage;
                    img.style.cssText = `
                      width: 100%;
                      height: auto;
                      border-radius: 8px;
                      display: block;
                    `;
                    imagePlaceholder.innerHTML = '';
                    imagePlaceholder.style.border = 'none';
                    imagePlaceholder.style.background = 'transparent';
                    imagePlaceholder.appendChild(img);
                  }

                  body.appendChild(imagePlaceholder);

                  // Measurement Instructions card
                  const instructionsCard = document.createElement('div');
                  instructionsCard.style.cssText = `
                    background: white;
                    border: 1px solid #e1e3e5;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  `;

                  const instructionsHeader = document.createElement('div');
                  instructionsHeader.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                  `;

                  const instructionsIcon = document.createElement('div');
                  instructionsIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>`;
                  instructionsIcon.style.cssText = `
                    color: #202223;
                    flex-shrink: 0;
                  `;
                  instructionsHeader.appendChild(instructionsIcon);

                  const instructionsTitle = document.createElement('h3');
                  instructionsTitle.className = 'measurement-guide-card-title';
                  instructionsTitle.textContent = 'Measurement Instructions';
                  instructionsTitle.style.cssText = `
                    font-size: 16px;
                    font-weight: 600;
                    color: #202223;
                    margin: 0;
                  `;
                  instructionsHeader.appendChild(instructionsTitle);

                  instructionsCard.appendChild(instructionsHeader);

                  const instructionsText = document.createElement('p');
                  instructionsText.className = 'measurement-guide-card-text';
                  instructionsText.textContent = field.description || field.instructions || 'No instructions available for this measurement.';
                  instructionsText.style.cssText = `
                    font-size: 14px;
                    color: #202223;
                    line-height: 1.6;
                    margin: 0;
                  `;
                  instructionsCard.appendChild(instructionsText);

                  body.appendChild(instructionsCard);

                  // Measurement Details card
                  const detailsCard = document.createElement('div');
                  detailsCard.style.cssText = `
                    background: white;
                    border: 1px solid #e1e3e5;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    width: 100%;
                  `;

                  const detailsTitle = document.createElement('h3');
                  detailsTitle.className = 'measurement-guide-card-title';
                  detailsTitle.textContent = 'Measurement Details';
                  detailsTitle.style.cssText = `
                    font-size: 16px;
                    font-weight: 600;
                    color: #202223;
                    margin: 0 0 12px 0;
                  `;
                  detailsCard.appendChild(detailsTitle);

                  const detailsContainer = document.createElement('div');
                  detailsContainer.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                  `;

                  // Helper function to create detail row
                  const createDetailRow = (label, value, isRed = false, isLast = false) => {
                    const row = document.createElement('div');
                    row.style.cssText = `
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      padding: 6px 16px;
                    `;

                    const labelEl = document.createElement('div');
                    labelEl.className = 'measurement-guide-detail-label';
                    labelEl.textContent = label;
                    labelEl.style.cssText = `
                      font-size: 14px;
                      font-weight: 500;
                      color: #202223;
                    `;
                    row.appendChild(labelEl);

                    const valueEl = document.createElement('div');
                    valueEl.className = 'measurement-guide-detail-value';
                    valueEl.textContent = value;
                    valueEl.style.cssText = `
                      font-size: 14px;
                      font-weight: 400;
                      color: ${isRed ? '#d72c0d' : '#202223'};
                      text-align: right;
                    `;
                    row.appendChild(valueEl);

                    return row;
                  };

                    // Unit row
                    const unitDisplay = field.unit || 'in';
                    const unitFormatted = unitDisplay === 'in' ? 'Inches' : (unitDisplay === 'cm' ? 'Centimeters' : unitDisplay);
                    const hasRange = field.min !== undefined && field.max !== undefined;
                    detailsContainer.appendChild(createDetailRow('Unit', unitFormatted));

                    // Required row (only last if no range)
                    detailsContainer.appendChild(createDetailRow('Required', field.required ? 'Yes' : 'No', field.required, !hasRange));

                    // Range row (if available) - always last
                    if (hasRange) {
                      const rangeUnit = field.unit || 'in';
                      const rangeValue = `${field.min} - ${field.max} ${rangeUnit}`;
                      detailsContainer.appendChild(createDetailRow('Range', rangeValue, false, true));
                    }

                  detailsCard.appendChild(detailsContainer);
                  body.appendChild(detailsCard);

                  guideContent.appendChild(body);

                  guideModal.appendChild(guideContent);
                  guideModal.onclick = (e) => {
                    if (e.target === guideModal) guideModal.remove();
                  };
                  document.body.appendChild(guideModal);
                };
                return infoIcon;
              };

              measurementFields
                .filter(field => field.enabled)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .forEach(field => {
                  const fieldContainer = document.createElement('div');
                  fieldContainer.className = 'size-chart-field-row';
                  fieldContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    flex-wrap: wrap;
                  `;

                  // Icon and label wrapper - keep them together in one row
                  const iconLabelWrapper = document.createElement('div');
                  iconLabelWrapper.className = 'size-chart-icon-label-wrapper';
                  iconLabelWrapper.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 0 0 auto;
                    min-width: 120px;
                  `;

                  // Info icon on the left
                  const infoIcon = createInfoIcon(field);
                  infoIcon.className = 'size-chart-field-info-icon';
                  iconLabelWrapper.appendChild(infoIcon);

                  // Label container
                  const labelWrapper = document.createElement('div');
                  labelWrapper.className = 'size-chart-field-label-wrapper';
                  labelWrapper.style.cssText = `
                    display: flex;
                    align-items: center;
                    flex: 0 0 auto;
                  `;

                  // Label
                  const label = document.createElement('label');
                  const fieldName = field.name || field.id;
                  // Format label to match image: proper capitalization
                  let labelText = fieldName;
                  if (fieldName.includes('/')) {
                    // Handle cases like "chest / bust"
                    labelText = fieldName.split('/').map(part => 
                      part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase()
                    ).join(' / ');
                  } else {
                    // Handle cases like "sleeve length"
                    labelText = fieldName.split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  }
                  
                  if (field.required) {
                    label.innerHTML = labelText + ' <span style="color: #d72c0d;">*</span>';
                  } else {
                    label.textContent = labelText;
                  }
                  label.style.cssText = `
                    font-size: 14px;
                    font-weight: 600;
                    color: #202223;
                    cursor: pointer;
                    white-space: nowrap;
                  `;
                  labelWrapper.appendChild(label);
                  iconLabelWrapper.appendChild(labelWrapper);
                  fieldContainer.appendChild(iconLabelWrapper);

                  // Input field wrapper
                  const inputWrapper = document.createElement('div');
                  inputWrapper.className = 'size-chart-field-input-wrapper';
                  inputWrapper.style.cssText = `
                    flex: 1;
                    min-width: 200px;
                  `;

                  // Input field
                  const input = document.createElement('input');
                  input.className = 'size-chart-field-input';
                  input.type = 'number';
                  input.placeholder = `Enter ${fieldName.toLowerCase()}`;
                  input.required = field.required || false;
                  input.dataset.fieldId = field.id || field.name;
                  if (field.min) input.min = field.min;
                  if (field.max) input.max = field.max;
                  input.style.cssText = `
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #e1e3e5;
                    border-radius: 4px;
                    font-size: 14px;
                    color: #202223;
                    background: #ffffff;
                    box-sizing: border-box;
                  `;
                  inputWrapper.appendChild(input);
                  fieldContainer.appendChild(inputWrapper);

                  fieldsContainer.appendChild(fieldContainer);
                });

              formContent.appendChild(fieldsContainer);

              // Fit preference (if enabled) - Show after all fields
              if (chartData.fitPreferencesEnabled) {
                const fitContainer = document.createElement('div');
                fitContainer.style.cssText = `
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                  margin-bottom: 24px;
                `;

                const fitLabel = document.createElement('label');
                fitLabel.textContent = 'Fit Preference';
                fitLabel.style.cssText = `
                  font-size: 14px;
                  font-weight: 600;
                  color: #202223;
                  margin-bottom: 4px;
                `;
                fitContainer.appendChild(fitLabel);

                const fitSelect = document.createElement('select');
                fitSelect.style.cssText = `
                  padding: 10px 12px;
                  border: 1px solid #e1e3e5;
                  border-radius: 4px;
                  font-size: 14px;
                  color: #202223;
                  background-color: #ffffff;
                  cursor: pointer;
                `;
                fitSelect.innerHTML = '<option value="">Select fit preference</option>';
                const fitPreferences = chartData.fitPreferences || [
                  { value: 'slim', label: 'Slim Fit' },
                  { value: 'regular', label: 'Regular Fit' },
                  { value: 'loose', label: 'Loose Fit' }
                ];
                fitPreferences.forEach(opt => {
                  const option = document.createElement('option');
                  option.value = typeof opt === 'string' ? opt : opt.value;
                  option.textContent = typeof opt === 'string' ? opt : opt.label;
                  fitSelect.appendChild(option);
                });
                fitContainer.appendChild(fitSelect);
                formContent.appendChild(fitContainer);
              }

              // Stitching notes (if enabled) - Show after fit preference
              if (chartData.stitchingNotesEnabled) {
                const notesContainer = document.createElement('div');
                notesContainer.style.cssText = `
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                `;

                const notesLabel = document.createElement('label');
                notesLabel.textContent = 'Stitching Notes (Optional)';
                notesLabel.style.cssText = `
                  font-size: 14px;
                  font-weight: 600;
                  color: #202223;
                  margin-bottom: 4px;
                `;
                notesContainer.appendChild(notesLabel);

                const notesTextarea = document.createElement('textarea');
                notesTextarea.placeholder = 'Add any special instructions for stitching...';
                notesTextarea.rows = 3;
                notesTextarea.style.cssText = `
                  padding: 10px 12px;
                  border: 1px solid #e1e3e5;
                  border-radius: 4px;
                  font-size: 14px;
                  color: #202223;
                  font-family: inherit;
                  resize: vertical;
                `;
                notesContainer.appendChild(notesTextarea);
                formContent.appendChild(notesContainer);
              }

              // Add form content to container
              formContainer.appendChild(formContent);

              // Add Save and Cancel buttons
              const buttonContainer = document.createElement('div');
              buttonContainer.className = 'size-chart-button-container';
              buttonContainer.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-top: 1px solid #e1e3e5;
                flex-wrap: wrap;
                flex-shrink: 0;
                background: #ffffff;
                width: 100%;
                box-sizing: border-box;
              `;

              // Left side - Previous Size button
              const setPreviousSizeButton = document.createElement('button');
              setPreviousSizeButton.textContent = 'Previous';
              setPreviousSizeButton.className = 'size-chart-previous-button';
              setPreviousSizeButton.style.cssText = `
                padding: 10px 16px;
                border: 1px solid #e1e3e5;
                border-radius: 4px;
                background: #ffffff;
                color: #202223;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
              `;
              setPreviousSizeButton.onmouseover = () => {
                setPreviousSizeButton.style.backgroundColor = '#f6f6f7';
              };
              setPreviousSizeButton.onmouseout = () => {
                setPreviousSizeButton.style.backgroundColor = '#ffffff';
              };

              // Right side buttons container
              const rightButtonsContainer = document.createElement('div');
              rightButtonsContainer.style.cssText = `
                display: flex;
                gap: 12px;
                align-items: center;
              `;

              const cancelButton = document.createElement('button');
              cancelButton.textContent = 'Cancel';
              cancelButton.style.cssText = `
                padding: 10px 20px;
                border: 1px solid #e1e3e5;
                border-radius: 4px;
                background: #ffffff;
                color: #202223;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
              `;
              cancelButton.onmouseover = () => {
                cancelButton.style.backgroundColor = '#f6f6f7';
              };
              cancelButton.onmouseout = () => {
                cancelButton.style.backgroundColor = '#ffffff';
              };
              cancelButton.onclick = () => {
                if (hasUnsavedData()) {
                  showUnsavedChangesWarning(() => overlay.remove());
                } else {
                  overlay.remove();
                }
              };

              const saveButton = document.createElement('button');
              saveButton.textContent = 'Save';
              saveButton.style.cssText = `
                padding: 10px 20px;
                border: 1px solid #000000;
                border-radius: 4px;
                background: #000000;
                color: #ffffff;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
              `;
              saveButton.onmouseover = () => {
                saveButton.style.backgroundColor = '#333333';
              };
              saveButton.onmouseout = () => {
                saveButton.style.backgroundColor = '#000000';
              };
              
              // Store references to inputs for data collection
              const formData = {
                measurements: {},
                fitPreference: null,
                stitchingNotes: null,
                fields: measurementFields.filter(f => f.enabled).sort((a, b) => (a.order || 0) - (b.order || 0))
              };

              saveButton.onclick = () => {
                // Validate required fields
                const allInputs = formContent.querySelectorAll('input[type="number"]');
                const emptyRequiredFields = [];

                allInputs.forEach((input, index) => {
                  const field = formData.fields[index];
                  if (field && field.required) {
                    if (!input.value || input.value.trim() === '') {
                      emptyRequiredFields.push(field.name || field.id);
                    }
                  }
                });

                // Highlight empty required fields if validation fails
                if (emptyRequiredFields.length > 0) {
                  let firstEmptyField = null;
                  
                  // Highlight only empty required fields
                  allInputs.forEach((input, index) => {
                    const field = formData.fields[index];
                    if (field && field.required) {
                      if (!input.value || input.value.trim() === '') {
                        // Highlight empty required field
                        input.style.borderColor = '#d72c0d';
                        input.style.backgroundColor = '#fee';
                        
                        // Store reference to first empty field for scrolling
                        if (!firstEmptyField) {
                          firstEmptyField = input;
                        }
                        
                        // Add focus handler to remove highlight when user starts typing
                        input.onfocus = function() {
                          this.style.borderColor = '#e1e3e5';
                          this.style.backgroundColor = '#ffffff';
                        };
                      } else {
                        // Reset filled required fields
                        input.style.borderColor = '#e1e3e5';
                        input.style.backgroundColor = '#ffffff';
                      }
                    } else {
                      // Reset non-required fields
                      input.style.borderColor = '#e1e3e5';
                      input.style.backgroundColor = '#ffffff';
                    }
                  });
                  
                  // Scroll to first empty required field
                  if (firstEmptyField) {
                    firstEmptyField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                  
                  return; // Stop execution if validation fails
                }
                
                // Reset all input styles if validation passes
                allInputs.forEach((input) => {
                  input.style.borderColor = '#e1e3e5';
                  input.style.backgroundColor = '#ffffff';
                });

                // Collect form data
                allInputs.forEach((input, index) => {
                  const field = formData.fields[index];
                  if (field) {
                    formData.measurements[field.id || field.name] = input.value ? parseFloat(input.value) : null;
                  }
                });

                if (chartData.fitPreferencesEnabled) {
                  const fitSelect = formContent.querySelector('select');
                  if (fitSelect) {
                    formData.fitPreference = fitSelect.value;
                  }
                }

                if (chartData.stitchingNotesEnabled) {
                  const notesTextarea = formContent.querySelector('textarea');
                  if (notesTextarea) {
                    formData.stitchingNotes = notesTextarea.value;
                  }
                }

                // Close the current modal and open size map table modal
                // Get productId from window (set when modal was opened)
                const productId = window.currentProductId || null;
                overlay.remove();
                openSizeMapTableModal(formData, template, chartData, currentUnit, productId);
              };

              // Set up Set Previous Size button click handler
              setPreviousSizeButton.onclick = () => {
                openSavedTemplatesModal(formContent, formData, chartData);
              };

              rightButtonsContainer.appendChild(cancelButton);
              rightButtonsContainer.appendChild(saveButton);
              
              buttonContainer.appendChild(setPreviousSizeButton);
              buttonContainer.appendChild(rightButtonsContainer);
              
              // Add button container to form container (at the bottom)
              formContainer.appendChild(buttonContainer);

              // Disable content scrolling - formContent will handle scrolling
              content.style.overflow = 'hidden';
              content.style.display = 'flex';
              content.style.flexDirection = 'column';
              content.appendChild(formContainer);
            } else if (sizeData.length === 0) {
              // Table template with no data
              content.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #6d7175;">
                  No size data available for this template.
                </div>
              `;
              return;
            } else {
              // Table Template - Display as table
              content.style.padding = '24px';

            const tableContainer = document.createElement('div');
            tableContainer.style.cssText = `
              border: 1px solid #e1e3e5;
              border-radius: 8px;
              overflow-x: auto;
              background: #ffffff;
            `;

            const table = document.createElement('table');
            table.style.cssText = `
              width: 100%;
              min-width: 350px;
              border-collapse: separate;
              border-spacing: 0;
            `;

            // Table header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headerRow.style.backgroundColor = '#f6f6f7';

            const sizeHeader = document.createElement('th');
            sizeHeader.textContent = 'Size';
            sizeHeader.style.cssText = `
              padding: 14px 16px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              color: #202223;
              border-right: 1px solid #e1e3e5;
              border-bottom: 2px solid #e1e3e5;
              position: sticky;
              left: 0;
              background: #f6f6f7;
              z-index: 2;
            `;
            headerRow.appendChild(sizeHeader);

            columns.forEach((col, colIndex) => {
              const th = document.createElement('th');
              th.textContent = col.label || col.id;
              const isLast = colIndex === columns.length - 1;
              th.style.cssText = `
                padding: 14px 16px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                color: #202223;
                border-right: ${isLast ? 'none' : '1px solid #e1e3e5'};
                border-bottom: 2px solid #e1e3e5;
                min-width: 100px;
                background: #f6f6f7;
              `;
              headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Table body
            const tbody = document.createElement('tbody');
            sizeData.forEach((row, index) => {
              const isLastRow = index === sizeData.length - 1;
              const tr = document.createElement('tr');
              tr.style.cssText = `
                transition: background 0.2s;
              `;

              const sizeCell = document.createElement('td');
              sizeCell.textContent = row.size || row.Size || '-';
              sizeCell.style.cssText = `
                padding: 14px 16px;
                font-size: 13px;
                font-weight: 500;
                color: #202223;
                border-right: 1px solid #e1e3e5;
                border-bottom: ${isLastRow ? 'none' : '1px solid #e1e3e5'};
                position: sticky;
                left: 0;
                background: #ffffff;
                z-index: 2;
              `;
              tr.appendChild(sizeCell);

              const dataCells = [];
              columns.forEach((col, colIndex) => {
                const isLastCol = colIndex === columns.length - 1;
                const td = document.createElement('td');
                td.textContent = row[col.id] || '-';
                td.style.cssText = `
                  padding: 14px 16px;
                  font-size: 13px;
                  color: #202223;
                  border-right: ${isLastCol ? 'none' : '1px solid #e1e3e5'};
                  border-bottom: ${isLastRow ? 'none' : '1px solid #e1e3e5'};
                  background: #ffffff;
                `;
                dataCells.push(td);
                tr.appendChild(td);
              });

              // Set hover handlers after all cells are created
              tr.onmouseover = () => {
                tr.style.backgroundColor = '#f9fafb';
                sizeCell.style.background = '#f9fafb';
                dataCells.forEach(cell => {
                  cell.style.backgroundColor = '#f9fafb';
                });
              };
              tr.onmouseout = () => {
                tr.style.backgroundColor = '#ffffff';
                sizeCell.style.background = '#ffffff';
                dataCells.forEach(cell => {
                  cell.style.backgroundColor = '#ffffff';
                });
              };

              tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            tableContainer.appendChild(table);
            content.appendChild(tableContainer);
            }
          } else {
            // How to Measure Tab
            const measureContainer = document.createElement('div');
            measureContainer.className = 'how-to-measure-container';
            measureContainer.style.cssText = `
              display: flex;
              flex-direction: column;
              gap: 16px;
              padding: 24px;
            `;

            if (isMeasurementTemplate && measurementFields.length > 0) {
              // Custom Measurement Template - Show cards for each field
              measurementFields
                .filter(field => field.enabled)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .forEach(field => {
                  // Create card for each measurement field
                  const card = document.createElement('div');
                  card.className = 'measurement-card';
                  card.style.cssText = `
                    background: white;
                    border: 1px solid #e1e3e5;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  `;

                  // Card header with title and info button
                  const cardHeader = document.createElement('div');
                  cardHeader.className = 'measurement-card-header';
                  cardHeader.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                  `;

                  // Field name
                  const fieldName = field.name || field.id;
                  let formattedFieldName = fieldName;
                  if (fieldName.includes('/')) {
                    formattedFieldName = fieldName.split('/').map(part => 
                      part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase()
                    ).join(' / ');
                  } else {
                    formattedFieldName = fieldName.split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  }

                  const title = document.createElement('h3');
                  title.className = 'measurement-card-title';
                  title.innerHTML = formattedFieldName + (field.required ? ' <span style="color: #d72c0d;">*</span>' : '');
                  title.style.cssText = `
                    font-size: 16px;
                    font-weight: 600;
                    color: #202223;
                    margin: 0;
                    flex: 1;
                  `;

                  // Info button with text
                  const infoWrapper = document.createElement('div');
                  infoWrapper.className = 'measurement-card-info-wrapper';
                  infoWrapper.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: 12px;
                  `;

                  const infoButton = document.createElement('button');
                  infoButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1 -19.995 .324l-.005 -.324l.004 -.28c.148 -5.393 4.566 -9.72 9.996 -9.72zm0 9h-1l-.117 .007a1 1 0 0 0 0 1.986l.117 .007v3l.007 .117a1 1 0 0 0 .876 .876l.117 .007h1l.117 -.007a1 1 0 0 0 .876 -.876l.007 -.117l-.007 -.117a1 1 0 0 0 -.764 -.857l-.112 -.02l-.117 -.006v-3l-.007 -.117a1 1 0 0 0 -.876 -.876l-.117 -.007zm.01 -3l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007z" />
                  </svg>`;
                  infoButton.style.cssText = `
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    color: #0066cc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                  `;
                  infoButton.title = 'Measurement guide';
                  
                  // Attach click handler to open measurement guide modal (same as Details tab)
                  infoButton.onclick = () => {
                    const fieldName = field.name || field.id;
                    let formattedFieldName = fieldName;
                    if (fieldName.includes('/')) {
                      formattedFieldName = fieldName.split('/').map(part => 
                        part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase()
                      ).join(' / ');
                    } else {
                      formattedFieldName = fieldName.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ');
                    }

                    // Show measurement guide modal (reuse the same modal creation logic)
                    const guideModal = document.createElement('div');
                    guideModal.style.cssText = `
                      position: fixed;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: rgba(0, 0, 0, 0.5);
                      z-index: 10001;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      padding: 20px;
                      box-sizing: border-box;
                    `;

                    const guideContent = document.createElement('div');
                    guideContent.className = 'measurement-guide-modal';
                    guideContent.style.cssText = `
                      background: white;
                      border-radius: 8px;
                      max-width: 50%;
                      width: 60%;
                      max-height: 90vh;
                      padding: 0;
                      position: relative;
                      display: flex;
                      flex-direction: column;
                      overflow: hidden;
                    `;

                    // Header section
                    const header = document.createElement('div');
                    header.className = 'size-chart-modal-header';
                    header.style.cssText = `
                      padding: 24px 24px 16px 24px;
                      border-bottom: 1px solid #e1e3e5;
                      position: relative;
                      flex-shrink: 0;
                    `;

                    const closeBtn = document.createElement('button');
                    closeBtn.innerHTML = '×';
                    closeBtn.style.cssText = `
                      position: absolute;
                      top: 16px;
                      right: 16px;
                      background: none;
                      border: none;
                      font-size: 24px;
                      cursor: pointer;
                      color: #202223;
                      padding: 4px;
                      width: 32px;
                      height: 32px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 4px;
                    `;
                    closeBtn.onclick = () => guideModal.remove();
                    header.appendChild(closeBtn);

                    const guideTitle = document.createElement('h2');
                    guideTitle.className = 'measurement-guide-title';
                    guideTitle.textContent = `How to Measure: ${formattedFieldName}`;
                    guideTitle.style.cssText = `
                      font-size: 24px;
                      font-weight: 600;
                      color: #202223;
                      margin: 0 0 8px 0;
                      padding-right: 40px;
                    `;
                    header.appendChild(guideTitle);

                    const subtitle = document.createElement('p');
                    subtitle.className = 'measurement-guide-subtitle';
                    subtitle.textContent = 'Follow these instructions to get accurate measurements';
                    subtitle.style.cssText = `
                      font-size: 14px;
                      color: #202223;
                      margin: 0;
                      padding-right: 40px;
                    `;
                    header.appendChild(subtitle);

                    guideContent.appendChild(header);

                    // Body section
                    const body = document.createElement('div');
                    body.className = 'size-chart-modal-body';
                    body.style.cssText = `
                      padding: 24px;
                      display: flex;
                      flex-direction: column;
                      gap: 16px;
                      align-items: center;
                      justify-content: flex-start;
                      overflow-y: auto;
                      flex: 1;
                      min-height: 0;
                    `;

                    // Image placeholder section
                    const imagePlaceholder = document.createElement('div');
                    imagePlaceholder.style.cssText = `
                      width: 250px;
                      min-height: 200px;
                      border: 2px dashed #e1e3e5;
                      border-radius: 8px;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      background: #fafbfb;
                      margin-bottom: 8px;
                    `;

                    const placeholderIcon = document.createElement('div');
                    placeholderIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>`;
                    placeholderIcon.style.cssText = `
                      margin-bottom: 8px;
                      color: #9ca3af;
                    `;
                    imagePlaceholder.appendChild(placeholderIcon);

                    const placeholderText = document.createElement('div');
                    placeholderText.className = 'measurement-guide-placeholder-text';
                    placeholderText.textContent = 'No guide image available';
                    placeholderText.style.cssText = `
                      font-size: 14px;
                      color: #6d7175;
                      text-align: center;
                    `;
                    imagePlaceholder.appendChild(placeholderText);

                    if (field.guideImage) {
                      const img = document.createElement('img');
                      img.src = field.guideImage;
                      img.style.cssText = `
                        width: 100%;
                        height: auto;
                        border-radius: 8px;
                        display: block;
                      `;
                      imagePlaceholder.innerHTML = '';
                      imagePlaceholder.style.border = 'none';
                      imagePlaceholder.style.background = 'transparent';
                      imagePlaceholder.appendChild(img);
                    }

                    body.appendChild(imagePlaceholder);

                    // Measurement Instructions card
                    const instructionsCard = document.createElement('div');
                    instructionsCard.style.cssText = `
                      background: white;
                      border: 1px solid #e1e3e5;
                      border-radius: 8px;
                      padding: 16px;
                      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    `;

                    const instructionsHeader = document.createElement('div');
                    instructionsHeader.style.cssText = `
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      margin-bottom: 12px;
                    `;

                    const instructionsIcon = document.createElement('div');
                    instructionsIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>`;
                    instructionsIcon.style.cssText = `
                      color: #202223;
                      flex-shrink: 0;
                    `;
                    instructionsHeader.appendChild(instructionsIcon);

                    const instructionsTitle = document.createElement('h3');
                    instructionsTitle.className = 'measurement-guide-card-title';
                    instructionsTitle.textContent = 'Measurement Instructions';
                    instructionsTitle.style.cssText = `
                      font-size: 16px;
                      font-weight: 600;
                      color: #202223;
                      margin: 0;
                    `;
                    instructionsHeader.appendChild(instructionsTitle);

                    instructionsCard.appendChild(instructionsHeader);

                    const instructionsText = document.createElement('p');
                    instructionsText.className = 'measurement-guide-card-text';
                    instructionsText.textContent = field.description || field.instructions || 'No instructions available for this measurement.';
                    instructionsText.style.cssText = `
                      font-size: 14px;
                      color: #202223;
                      line-height: 1.6;
                      margin: 0;
                    `;
                    instructionsCard.appendChild(instructionsText);

                    body.appendChild(instructionsCard);

                    // Measurement Details card
                    const detailsCard = document.createElement('div');
                    detailsCard.style.cssText = `
                      background: white;
                      border: 1px solid #e1e3e5;
                      border-radius: 8px;
                      padding: 16px;
                      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                      width: 100%;
                    `;

                    const detailsTitle = document.createElement('h3');
                    detailsTitle.className = 'measurement-guide-card-title';
                    detailsTitle.textContent = 'Measurement Details';
                    detailsTitle.style.cssText = `
                      font-size: 16px;
                      font-weight: 600;
                      color: #202223;
                      margin: 0 0 12px 0;
                      width: 100%;
                    `;
                    detailsCard.appendChild(detailsTitle);

                    const detailsContainer = document.createElement('div');
                    detailsContainer.style.cssText = `
                      display: flex;
                      flex-direction: column;
                      gap: 0;
                    `;

                    const createDetailRow = (label, value, isRed = false, isLast = false) => {
                      const row = document.createElement('div');
                      row.style.cssText = `
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        padding: 6px 16px;
                      `;

                      const labelEl = document.createElement('div');
                      labelEl.className = 'measurement-guide-detail-label';
                      labelEl.textContent = label;
                      labelEl.style.cssText = `
                        font-size: 14px;
                        font-weight: 500;
                        color: #202223;
                      `;
                      row.appendChild(labelEl);

                      const valueEl = document.createElement('div');
                      valueEl.className = 'measurement-guide-detail-value';
                      valueEl.textContent = value;
                      valueEl.style.cssText = `
                        font-size: 14px;
                        font-weight: 400;
                        color: ${isRed ? '#d72c0d' : '#202223'};
                        text-align: right;
                      `;
                      row.appendChild(valueEl);

                      return row;
                    };

                    const unitDisplay = field.unit || 'in';
                    const unitFormatted = unitDisplay === 'in' ? 'Inches' : (unitDisplay === 'cm' ? 'Centimeters' : unitDisplay);
                    const hasRange = field.min !== undefined && field.max !== undefined;
                    detailsContainer.appendChild(createDetailRow('Unit', unitFormatted));

                    detailsContainer.appendChild(createDetailRow('Required', field.required ? 'Yes' : 'No', field.required, !hasRange));

                    if (hasRange) {
                      const rangeUnit = field.unit || 'in';
                      const rangeValue = `${field.min} - ${field.max} ${rangeUnit}`;
                      detailsContainer.appendChild(createDetailRow('Range', rangeValue, false, true));
                    }

                    detailsCard.appendChild(detailsContainer);
                    body.appendChild(detailsCard);

                    guideContent.appendChild(body);

                    guideModal.appendChild(guideContent);
                    guideModal.onclick = (e) => {
                      if (e.target === guideModal) guideModal.remove();
                    };
                    document.body.appendChild(guideModal);
                  };

                  const infoText = document.createElement('span');
                  infoText.textContent = 'Click the info button for more details';
                  infoText.style.cssText = `
                    font-size: 12px;
                    color: #6d7175;
                  `;

                  infoWrapper.appendChild(infoText);
                  infoWrapper.appendChild(infoButton);
                  cardHeader.appendChild(title);
                  cardHeader.appendChild(infoWrapper);
                  card.appendChild(cardHeader);

                  // Instructions text
                  const instructions = document.createElement('p');
                  instructions.className = 'measurement-card-instructions';
                  instructions.textContent = field.description || field.instructions || 'No instructions available for this measurement.';
                  instructions.style.cssText = `
                    font-size: 14px;
                    color: #202223;
                    line-height: 1.6;
                    margin: 0 0 8px 0;
                  `;
                  card.appendChild(instructions);

                  // Range text
                  if (field.min !== undefined && field.max !== undefined) {
                    const rangeUnit = field.unit || 'in';
                    const range = document.createElement('p');
                    range.className = 'measurement-card-range';
                    range.textContent = `Range: ${field.min} - ${field.max} ${rangeUnit}`;
                    range.style.cssText = `
                      font-size: 14px;
                      color: #6d7175;
                      margin: 0;
                    `;
                    card.appendChild(range);
                  }

                  measureContainer.appendChild(card);
                });
            } else {
              // Table template or no fields - show description and image
              const measurementFileUrl = template.measurementFile || chartData.measurementFile;
              
              // Display measurement image if available
              if (measurementFileUrl) {
                const imageContainer = document.createElement('div');
                imageContainer.style.cssText = `
                  width: 100%;
                  margin-bottom: 24px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                `;
                
                const img = document.createElement('img');
                img.src = measurementFileUrl;
                img.style.cssText = `
                  max-width: min(100%, 350px);
                  width: 100%;
                  height: auto;
                  border-radius: 8px;
                  display: block;
                  margin: 0 auto;
                  border: 1px solid #e1e3e5;
                  padding: 8px;
                  background: #ffffff;
                `;
                img.alt = 'Measurement Guide';
                
                // Handle image load errors
                img.onerror = function() {
                  console.error('[Size Chart] Failed to load measurement image:', measurementFileUrl);
                  imageContainer.style.display = 'none';
                };
                
                imageContainer.appendChild(img);
                measureContainer.appendChild(imageContainer);
              }
              
              if (template.description || template.rawDescription) {
                const descDiv = document.createElement('div');
                descDiv.innerHTML = template.description || template.rawDescription || '';
                descDiv.style.cssText = `
                  font-size: 14px;
                 
                  line-height: 1.7;
                `;
                measureContainer.appendChild(descDiv);
              } else {
                // Default instructions
                const defaults = [
                  { title: 'CHEST:', text: 'Measure around the fullest part of your chest, keeping the tape measure horizontal.' },
                  { title: 'WAIST:', text: 'Wrap the measuring tape around your torso at the smallest part of your waist. Typically this is an inch or so above your belly button and is also known as the natural waistline.' },
                  { title: 'HIPS:', text: 'Wrap the measuring tape around the widest part of the seat.' }
                ];

                defaults.forEach(item => {
                  const itemDiv = document.createElement('div');
                  itemDiv.style.marginBottom = '20px';

                  const title = document.createElement('div');
                  title.textContent = item.title;
                  title.style.cssText = `
                    font-size: 15px;
                    font-weight: 600;
                    color: #202223;
                    margin-bottom: 6px;
                  `;

                  const text = document.createElement('div');
                  text.textContent = item.text;
                  text.style.cssText = `
                    font-size: 14px;
                    color: #6d7175;
                    line-height: 1.7;
                  `;

                  itemDiv.appendChild(title);
                  itemDiv.appendChild(text);
                  measureContainer.appendChild(itemDiv);
                });
              }
            }

            content.appendChild(measureContainer);
          }
        };

        // Initial render
        if (updateTabContentFn) updateTabContentFn();
      })
      .catch(error => {
        console.error('[Size Chart] Fetch error:', error);
        console.error('[Size Chart] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          appUrl: appUrl,
          shopDomain: shopDomain,
          productId: productId,
          apiUrl: apiUrl
        });
        
        // Check if it's a 404 error with app proxy
        const is404 = error.message && error.message.includes('404');
        const isAppProxy = appUrl && appUrl.includes('/apps/');
        
        let errorMessage = 'Please try again later.';
        let helpText = '';
        
        if (is404 && isAppProxy) {
          errorMessage = 'App proxy not configured.';
          helpText = 'The app URL was detected as app proxy, but it\'s not configured. The app URL should be automatically detected from your running server. Make sure "shopify app dev" is running and the app server is accessible.';
        } else if (is404) {
          errorMessage = 'Size chart API endpoint not found.';
          helpText = 'The app URL could not be detected automatically. Make sure "shopify app dev" is running. The app URL should be detected automatically from your server.';
        } else if (error.message && error.message.includes('Failed to fetch')) {
          errorMessage = 'Could not connect to the app server.';
          helpText = 'Make sure "shopify app dev" is running and your app server is accessible. The app URL should be detected automatically.';
        }
        
        // Check if it's a CORS error
        const isCorsError = error.message.includes('CORS') || 
                           (error.message.includes('Failed to fetch') && !is404) || 
                           error.name === 'TypeError';
        if (isCorsError) {
          console.error('[Size Chart] CORS ERROR DETECTED!');
          console.error('[Size Chart] Make sure the App URL in theme settings is correct and accessible from your store domain');
          console.error('[Size Chart] Current App URL:', appUrl);
        }
        
        content.innerHTML = `
          <div style="padding: 40px; text-align: center;">
            <h3 style="color: #202223; margin-bottom: 12px;">Error Loading Size Chart</h3>
            <p style="color: #6d7175; margin-bottom: 8px; font-weight: 500;">${errorMessage}</p>
            ${helpText ? `<p style="color: #6d7175; font-size: 14px; margin-bottom: 12px;">${helpText}</p>` : ''}
            <p style="color: #6d7175; font-size: 12px; margin-top: 8px;">
              <strong>App URL:</strong> ${appUrl || 'Not configured'}<br>
              <strong>Request URL:</strong> ${apiUrl || 'N/A'}<br>
              Check the browser console for more details.
            </p>
          </div>
        `;
      });
  }

  // Function to open size map table modal
  function openSizeMapTableModal(formData, template, chartData, currentUnit, productId = null) {
    // Store productId in window if provided, or use existing one
    if (productId) {
      window.currentProductId = productId;
    }
    // Ensure we have a productId
    const modalProductId = productId || window.currentProductId;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10002;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'size-chart-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 60%;
      max-width: 60%;
      min-width: 400px;
      max-height: 70vh;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #e1e3e5;
      margin: 20px auto;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'size-chart-modal-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Review Size Details';
    title.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      color: #202223;
      margin: 0;
    `;
    header.appendChild(title);

    modal.appendChild(header);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      padding: 24px;
      min-height: 0;
    `;

    // Create editable table
    const tableContainer = document.createElement('div');
    tableContainer.style.cssText = `
      border: 1px solid #e1e3e5;
      border-radius: 8px;
      overflow-x: auto;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      min-width: 350px;
      border-collapse: separate;
      border-spacing: 0;
    `;

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f6f6f7';

    const measurementHeader = document.createElement('th');
    measurementHeader.textContent = 'Measurement';
    measurementHeader.style.cssText = `
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #202223;
      border-right: 1px solid #e1e3e5;
      border-bottom: 2px solid #e1e3e5;
      position: sticky;
      left: 0;
      background: #f6f6f7;
      z-index: 2;
      box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
      width: fit-content;
    `;
    headerRow.appendChild(measurementHeader);

    const valueHeader = document.createElement('th');
    valueHeader.textContent = 'Value';
    valueHeader.style.cssText = `
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #202223;
      border-right: 1px solid #e1e3e5;
      border-bottom: 2px solid #e1e3e5;
      min-width: 100px;
      max-width: 120px;
      width: 120px;
      background: #f6f6f7;
    `;
    headerRow.appendChild(valueHeader);

    const unitHeader = document.createElement('th');
    unitHeader.textContent = 'Unit';
    unitHeader.style.cssText = `
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #202223;
      border-bottom: 2px solid #e1e3e5;
      min-width: 60px;
      max-width: 80px;
      width: 80px;
      background: #f6f6f7;
    `;
    headerRow.appendChild(unitHeader);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table body - editable fields
    const tbody = document.createElement('tbody');
    formData.fields.forEach((field, index) => {
      const tr = document.createElement('tr');
      tr.style.cssText = `
        transition: background 0.2s;
      `;
      
      const isLastRow = index === formData.fields.length - 1;

      // Measurement name
      const nameCell = document.createElement('td');
      const fieldName = field.name || field.id;
      let formattedFieldName = fieldName;
      if (fieldName.includes('/')) {
        formattedFieldName = fieldName.split('/').map(part => 
          part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase()
        ).join(' / ');
      } else {
        formattedFieldName = fieldName.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
      nameCell.textContent = formattedFieldName;
      nameCell.style.cssText = `
        padding: 14px 16px;
        font-size: 13px;
        font-weight: 500;
        color: #202223;
        border-right: 1px solid #e1e3e5;
        border-bottom: ${isLastRow ? 'none' : '1px solid #e1e3e5'};
        position: sticky;
        left: 0;
        background: #ffffff;
        z-index: 2;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
        width: fit-content;
      `;
      tr.appendChild(nameCell);

      // Value input
      const valueCell = document.createElement('td');
      valueCell.style.cssText = `
        padding: 14px 16px;
        border-right: 1px solid #e1e3e5;
        border-bottom: ${isLastRow ? 'none' : '1px solid #e1e3e5'};
        width: 120px;
        max-width: 120px;
        background: #ffffff;
      `;
      const valueInput = document.createElement('input');
      valueInput.type = 'number';
      valueInput.value = formData.measurements[field.id || field.name] || '';
      valueInput.dataset.fieldId = field.id || field.name;
      if (field.min) valueInput.min = field.min;
      if (field.max) valueInput.max = field.max;
      valueInput.style.cssText = `
        width: 100%;
        max-width: 100px;
        padding: 8px 12px;
        border: 1px solid #e1e3e5;
        border-radius: 4px;
        font-size: 13px;
        color: #202223;
        background: #ffffff;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s;
      `;
      valueInput.onfocus = function() {
        this.style.borderColor = '#202223';
        this.style.boxShadow = '0 0 0 2px rgba(32, 34, 35, 0.1)';
      };
      valueInput.onblur = function() {
        this.style.borderColor = '#e1e3e5';
        this.style.boxShadow = 'none';
      };
      valueCell.appendChild(valueInput);
      tr.appendChild(valueCell);

      // Unit cell
      const unitCell = document.createElement('td');
      const unitDisplay = field.unit || currentUnit || 'in';
      unitCell.textContent = unitDisplay;
      unitCell.style.cssText = `
        padding: 14px 16px;
        font-size: 13px;
        color: #6d7175;
        border-bottom: ${isLastRow ? 'none' : '1px solid #e1e3e5'};
        width: 80px;
        max-width: 80px;
        background: #ffffff;
      `;
      tr.appendChild(unitCell);
      
      // Set hover handlers after all cells are created
      tr.onmouseover = () => {
        tr.style.backgroundColor = '#f9fafb';
        nameCell.style.background = '#f9fafb';
        valueCell.style.backgroundColor = '#f9fafb';
        unitCell.style.backgroundColor = '#f9fafb';
      };
      tr.onmouseout = () => {
        tr.style.backgroundColor = '#ffffff';
        nameCell.style.background = '#ffffff';
        valueCell.style.backgroundColor = '#ffffff';
        unitCell.style.backgroundColor = '#ffffff';
      };

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    content.appendChild(tableContainer);

    modal.appendChild(content);

    // Footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-top: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    // Left side - Save Size button
    const saveSizeButton = document.createElement('button');
    saveSizeButton.textContent = 'Save Size';
    saveSizeButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #e1e3e5;
      border-radius: 4px;
      background: #ffffff;
      color: #202223;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    saveSizeButton.onmouseover = () => {
      saveSizeButton.style.backgroundColor = '#f6f6f7';
    };
    saveSizeButton.onmouseout = () => {
      saveSizeButton.style.backgroundColor = '#ffffff';
    };
    saveSizeButton.onclick = () => {
      // Collect current measurements from the table
      const inputs = tableContainer.querySelectorAll('input[type="number"]');
      const currentMeasurements = {};
      inputs.forEach(input => {
        const fieldId = input.dataset.fieldId;
        if (input.value) {
          currentMeasurements[fieldId] = parseFloat(input.value);
        }
      });

      // Open save template modal
      openSaveTemplateModal(formData, template, currentMeasurements, currentUnit, overlay);
    };

    // Right side buttons container
    const rightButtonsContainer = document.createElement('div');
    rightButtonsContainer.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: center;
    `;

    const backButton = document.createElement('button');
    backButton.textContent = 'Back';
    backButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #e1e3e5;
      border-radius: 4px;
      background: #ffffff;
      color: #202223;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    backButton.onmouseover = () => {
      backButton.style.backgroundColor = '#f6f6f7';
    };
    backButton.onmouseout = () => {
      backButton.style.backgroundColor = '#ffffff';
    };
    backButton.onclick = () => {
      overlay.remove();
    };

    const addToCartButton = document.createElement('button');
    addToCartButton.textContent = 'Add to Cart';
    addToCartButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #000000;
      border-radius: 4px;
      background: #000000;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    addToCartButton.onmouseover = () => {
      addToCartButton.style.backgroundColor = '#333333';
    };
    addToCartButton.onmouseout = () => {
      addToCartButton.style.backgroundColor = '#000000';
    };
    addToCartButton.onclick = async () => {
      // Validate required fields
      const inputs = tableContainer.querySelectorAll('input[type="number"]');
      const emptyRequiredFields = [];
      
      inputs.forEach(input => {
        const fieldId = input.dataset.fieldId;
        const field = formData.fields.find(f => (f.id || f.name) === fieldId);
        
        if (field && field.required) {
          if (!input.value || input.value.trim() === '') {
            emptyRequiredFields.push(fieldId);
          }
        }
      });

      // Highlight empty required fields if validation fails
      if (emptyRequiredFields.length > 0) {
        let firstEmptyField = null;
        
        // Reset all input styles first
        inputs.forEach(input => {
          input.style.borderColor = '#e1e3e5';
          input.style.backgroundColor = '#ffffff';
        });
        
        // Highlight only empty required fields
        inputs.forEach(input => {
          const fieldId = input.dataset.fieldId;
          const field = formData.fields.find(f => (f.id || f.name) === fieldId);
          
          if (field && field.required) {
            if (!input.value || input.value.trim() === '') {
              // Highlight empty required field
              input.style.borderColor = '#d72c0d';
              input.style.backgroundColor = '#fee';
              
              // Store reference to first empty field for scrolling
              if (!firstEmptyField) {
                firstEmptyField = input;
              }
              
              // Add focus handler to remove highlight when user starts typing
              input.onfocus = function() {
                this.style.borderColor = '#e1e3e5';
                this.style.backgroundColor = '#ffffff';
              };
            } else {
              // Reset filled required fields
              input.style.borderColor = '#e1e3e5';
              input.style.backgroundColor = '#ffffff';
            }
          }
        });
        
        // Scroll to first empty required field
        if (firstEmptyField) {
          firstEmptyField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        return; // Stop execution if validation fails
      }
      
      // Reset all input styles if validation passes
      inputs.forEach(input => {
        input.style.borderColor = '#e1e3e5';
        input.style.backgroundColor = '#ffffff';
      });

      // Collect updated values
      const updatedMeasurements = {};
      inputs.forEach(input => {
        const fieldId = input.dataset.fieldId;
        if (input.value) {
          updatedMeasurements[fieldId] = parseFloat(input.value);
        }
      });

      // Disable button and show loading state
      addToCartButton.disabled = true;
      const originalText = addToCartButton.textContent;
      addToCartButton.textContent = 'Processing...';
      addToCartButton.style.opacity = '0.6';
      addToCartButton.style.cursor = 'not-allowed';

      try {
        // Get variant ID from product page (required for cart)
        let currentVariantId = null;
        const variantSelector = document.querySelector('[name="id"]') || 
                                document.querySelector('select[name="id"]') ||
                                document.querySelector('input[name="id"]:checked');
        if (variantSelector) {
          currentVariantId = variantSelector.value;
        }
        // Fallback: Get from Shopify analytics if available
        if (!currentVariantId && window.Shopify?.analytics?.meta?.product?.variants?.length > 0) {
          currentVariantId = window.Shopify.analytics.meta.product.variants[0].id;
        }
        
        if (!currentVariantId) {
          throw new Error('Variant ID not found. Please select a size/variant and try again.');
        }

        // Convert measurements to cart item properties format
        // Shopify /cart/add.js expects properties as an object (hash), not an array
        const properties = {
          "_custom_order": "true"
        };
        
        // Add each measurement as a property
        Object.entries(updatedMeasurements).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            // Format measurement name
            const formattedName = key
              .split('/')
              .map(part => part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase())
              .join(' / ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            properties[formattedName] = String(value);
          }
        });

        // Add product to Shopify cart with measurement properties
        const cartData = {
          id: parseInt(currentVariantId),
          quantity: 1,
          properties: properties
        };

        // Use Shopify's standard cart API
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cartData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.description || 'Failed to add product to cart');
        }

        // Redirect to checkout page
        window.location.href = '/checkout';

      } catch (error) {
        console.error('Error creating custom order:', error);
        // Show more detailed error message
        const errorMessage = error.message || 'Unknown error';
        alert('Failed to create custom order: ' + errorMessage + '\n\nPlease try again or contact support.');
        
        // Re-enable button
        addToCartButton.disabled = false;
        addToCartButton.textContent = originalText;
        addToCartButton.style.opacity = '1';
        addToCartButton.style.cursor = 'pointer';
      }
    };

    rightButtonsContainer.appendChild(backButton);
    rightButtonsContainer.appendChild(addToCartButton);
    
    footer.appendChild(saveSizeButton);
    footer.appendChild(rightButtonsContainer);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };

    document.body.appendChild(overlay);
  }

  // Function to open save template name modal
  function openSaveTemplateModal(formData, template, measurements, currentUnit, parentOverlay) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10003;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'size-chart-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #e1e3e5;
      margin: 20px auto;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'size-chart-modal-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Save Size Template';
    title.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      color: #202223;
      margin: 0;
    `;
    header.appendChild(title);

    modal.appendChild(header);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      min-height: 0;
    `;

    // Template name input
    const label = document.createElement('label');
    label.textContent = 'Template Name';
    label.style.cssText = `
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #202223;
      margin-bottom: 8px;
    `;
    content.appendChild(label);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter template name';
    nameInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e1e3e5;
      border-radius: 4px;
      font-size: 14px;
      color: #202223;
      background: #ffffff;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    `;
    nameInput.onfocus = function() {
      this.style.borderColor = '#202223';
      this.style.boxShadow = '0 0 0 2px rgba(32, 34, 35, 0.1)';
    };
    nameInput.onblur = function() {
      this.style.borderColor = '#e1e3e5';
      this.style.boxShadow = 'none';
    };
    content.appendChild(nameInput);

    // Error message
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      margin-top: 8px;
      font-size: 13px;
      color: #d72c0d;
      display: none;
    `;
    content.appendChild(errorMessage);

    modal.appendChild(content);

    // Footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #e1e3e5;
      border-radius: 4px;
      background: #ffffff;
      color: #202223;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    cancelButton.onmouseover = () => {
      cancelButton.style.backgroundColor = '#f6f6f7';
    };
    cancelButton.onmouseout = () => {
      cancelButton.style.backgroundColor = '#ffffff';
    };
    cancelButton.onclick = () => {
      overlay.remove();
    };

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #000000;
      border-radius: 4px;
      background: #000000;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    saveButton.onmouseover = () => {
      saveButton.style.backgroundColor = '#333333';
    };
    saveButton.onmouseout = () => {
      saveButton.style.backgroundColor = '#000000';
    };
    saveButton.onclick = async () => {
      const templateName = nameInput.value.trim();

      // Validate template name
      if (!templateName) {
        errorMessage.textContent = 'Please enter a template name';
        errorMessage.style.display = 'block';
        nameInput.style.borderColor = '#d72c0d';
        nameInput.style.backgroundColor = '#fee';
        nameInput.focus();
        return;
      }

      // Hide error message
      errorMessage.style.display = 'none';
      nameInput.style.borderColor = '#e1e3e5';
      nameInput.style.backgroundColor = '#ffffff';

      // Disable save button during save
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';
      saveButton.style.opacity = '0.6';
      saveButton.style.cursor = 'not-allowed';

      try {
        // Prepare template data
        const templateData = {
          name: templateName,
          category: template.category || 'custom',
          measurementFields: formData.fields.map(field => ({
            id: field.id || field.name,
            name: field.name || field.id,
            unit: field.unit || currentUnit || 'in',
            required: field.required || false,
            enabled: true,
            min: field.min || null,
            max: field.max || null,
          })),
          fitPreferencesEnabled: template.fitPreferencesEnabled || false,
          stitchingNotesEnabled: template.stitchingNotesEnabled || false,
          measurements: measurements, // Include the saved measurements
        };

        // Get app URL for API call
        const currentAppUrl = await getAppUrl();
        if (!currentAppUrl) {
          throw new Error('App URL not available');
        }

        // Determine API URL
        const isAppProxy = currentAppUrl.includes('/apps/');
        let apiUrl;
        if (isAppProxy) {
          const urlParts = currentAppUrl.replace(/^https?:\/\//, '').split('/apps/');
          const shopDomainFromUrl = urlParts[0];
          const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
          apiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/measurement-template/public?shop=${encodeURIComponent(shopDomain)}`;
        } else {
          const apiPath = currentAppUrl.endsWith('/') ? 'api/measurement-template/public' : '/api/measurement-template/public';
          apiUrl = `${currentAppUrl}${apiPath}?shop=${encodeURIComponent(shopDomain)}`;
        }

        // Make API call to save template
        const formDataToSend = new FormData();
        formDataToSend.append('template', JSON.stringify(templateData));

        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formDataToSend,
          mode: 'cors',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to save template' }));
          throw new Error(errorData.error || 'Failed to save template');
        }

        const result = await response.json();

        // Show success message and close modals
        alert('Size template saved successfully!');
        overlay.remove();
        if (parentOverlay) {
          parentOverlay.remove();
        }
      } catch (error) {
        console.error('Error saving template:', error);
        errorMessage.textContent = error.message || 'Failed to save template. Please try again.';
        errorMessage.style.display = 'block';
        
        // Re-enable save button
        saveButton.disabled = false;
        saveButton.textContent = 'Save';
        saveButton.style.opacity = '1';
        saveButton.style.cursor = 'pointer';
      }
    };

    // Allow Enter key to save
    nameInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    };

    footer.appendChild(cancelButton);
    footer.appendChild(saveButton);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
    
    // Prevent clicks inside modal from closing it
    modal.onclick = (e) => {
      e.stopPropagation();
    };

    document.body.appendChild(overlay);

    // Focus on input
    setTimeout(() => {
      nameInput.focus();
    }, 100);
  }

  // Function to open saved templates modal
  async function openSavedTemplatesModal(formContent, formData, chartData) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10004;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'size-chart-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #e1e3e5;
      margin: 20px auto;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'size-chart-modal-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Select Previous Size';
    title.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      color: #202223;
      margin: 0;
    `;
    header.appendChild(title);

    modal.appendChild(header);

    // Content area
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      min-height: 0;
    `;

    // Loading state
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Loading saved templates...';
    loadingMessage.style.cssText = `
      text-align: center;
      padding: 40px 20px;
      color: #6d7175;
      font-size: 14px;
    `;
    content.appendChild(loadingMessage);

    // Error message
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
      margin-bottom: 16px;
      padding: 12px;
      background: #fee;
      border: 1px solid #d72c0d;
      border-radius: 4px;
      color: #d72c0d;
      font-size: 13px;
      display: none;
    `;
    content.appendChild(errorMessage);

    modal.appendChild(content);

    // Footer with buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e1e3e5;
      background: #ffffff;
      flex-shrink: 0;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #e1e3e5;
      border-radius: 4px;
      background: #ffffff;
      color: #202223;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = '#f6f6f7';
    };
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = '#ffffff';
    };
    closeButton.onclick = () => {
      overlay.remove();
    };

    footer.appendChild(closeButton);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
    
    // Prevent clicks inside modal from closing it
    modal.onclick = (e) => {
      e.stopPropagation();
    };

    document.body.appendChild(overlay);

    // Fetch saved templates
    try {
      const currentAppUrl = await getAppUrl();
      if (!currentAppUrl) {
        throw new Error('App URL not available');
      }

      // Determine API URL
      const isAppProxy = currentAppUrl.includes('/apps/');
      let apiUrl;
      if (isAppProxy) {
        const urlParts = currentAppUrl.replace(/^https?:\/\//, '').split('/apps/');
        const shopDomainFromUrl = urlParts[0];
        const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
        apiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/measurement-template/public?shop=${encodeURIComponent(shopDomain)}`;
      } else {
        const apiPath = currentAppUrl.endsWith('/') ? 'api/measurement-template/public' : '/api/measurement-template/public';
        apiUrl = `${currentAppUrl}${apiPath}?shop=${encodeURIComponent(shopDomain)}`;
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error('Failed to load saved templates');
      }

      const result = await response.json();
      const templates = result.templates || [];

      // Remove loading message
      loadingMessage.remove();

      if (templates.length === 0) {
        const noTemplatesMessage = document.createElement('div');
        noTemplatesMessage.textContent = 'No saved templates found.';
        noTemplatesMessage.style.cssText = `
          text-align: center;
          padding: 40px 20px;
          color: #6d7175;
          font-size: 14px;
        `;
        content.appendChild(noTemplatesMessage);
      } else {
        // Create templates list
        const templatesList = document.createElement('div');
        templatesList.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 12px;
        `;

        templates.forEach((template) => {
          const templateItem = document.createElement('div');
          templateItem.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border: 1px solid #e1e3e5;
            border-radius: 4px;
            background: #ffffff;
            transition: all 0.2s;
          `;

          templateItem.onmouseover = () => {
            templateItem.style.backgroundColor = '#f9fafb';
            templateItem.style.borderColor = '#202223';
          };
          templateItem.onmouseout = () => {
            templateItem.style.backgroundColor = '#ffffff';
            templateItem.style.borderColor = '#e1e3e5';
          };

          const templateInfo = document.createElement('div');
          templateInfo.style.cssText = `
            flex: 1;
          `;

          const templateName = document.createElement('div');
          templateName.textContent = template.name;
          templateName.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: #202223;
            margin-bottom: 4px;
          `;
          templateInfo.appendChild(templateName);

          const templateDate = document.createElement('div');
          if (template.createdAt) {
            const date = new Date(template.createdAt);
            templateDate.textContent = `Saved on ${date.toLocaleDateString()}`;
          } else if (template.updatedAt) {
            const date = new Date(template.updatedAt);
            templateDate.textContent = `Updated on ${date.toLocaleDateString()}`;
          }
          templateDate.style.cssText = `
            font-size: 12px;
            color: #6d7175;
          `;
          templateInfo.appendChild(templateDate);

          templateItem.appendChild(templateInfo);

          // Buttons container
          const buttonsContainer = document.createElement('div');
          buttonsContainer.style.cssText = `
            display: flex;
            gap: 8px;
            align-items: center;
          `;

          const applyButton = document.createElement('button');
          applyButton.textContent = 'Apply';
          applyButton.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #000000;
            border-radius: 4px;
            background: #000000;
            color: #ffffff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          `;
          applyButton.onmouseover = () => {
            applyButton.style.backgroundColor = '#333333';
          };
          applyButton.onmouseout = () => {
            applyButton.style.backgroundColor = '#000000';
          };
          applyButton.onclick = () => {
            // Apply template measurements to form
            applyTemplateToForm(template, formContent, formData, chartData);
            overlay.remove();
          };
          buttonsContainer.appendChild(applyButton);

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.style.cssText = `
            padding: 8px 16px;
            border: 1px solid #d72c0d;
            border-radius: 4px;
            background: #ffffff;
            color: #d72c0d;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          `;
          deleteButton.onmouseover = () => {
            deleteButton.style.backgroundColor = '#fee';
          };
          deleteButton.onmouseout = () => {
            deleteButton.style.backgroundColor = '#ffffff';
          };
          deleteButton.onclick = async () => {
            // Disable button during deletion
            deleteButton.disabled = true;
            deleteButton.textContent = 'Deleting...';
            deleteButton.style.opacity = '0.6';
            deleteButton.style.cursor = 'not-allowed';

            try {
              const currentAppUrl = await getAppUrl();
              if (!currentAppUrl) {
                throw new Error('App URL not available');
              }

              // Determine API URL
              const isAppProxy = currentAppUrl.includes('/apps/');
              let apiUrl;
              if (isAppProxy) {
                const urlParts = currentAppUrl.replace(/^https?:\/\//, '').split('/apps/');
                const shopDomainFromUrl = urlParts[0];
                const appHandle = urlParts[1]?.split('/')[0] || 'size-chart';
                apiUrl = `https://${shopDomainFromUrl}/apps/${appHandle}/api/measurement-template/public?shop=${encodeURIComponent(shopDomain)}&id=${encodeURIComponent(template.id)}`;
              } else {
                const apiPath = currentAppUrl.endsWith('/') ? 'api/measurement-template/public' : '/api/measurement-template/public';
                apiUrl = `${currentAppUrl}${apiPath}?shop=${encodeURIComponent(shopDomain)}&id=${encodeURIComponent(template.id)}`;
              }

              const response = await fetch(apiUrl, {
                method: 'DELETE',
                mode: 'cors',
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to delete template' }));
                throw new Error(errorData.error || 'Failed to delete template');
              }

              // Remove the template item from the UI
              templateItem.remove();

              // If no templates left, show message
              if (templatesList.children.length === 0) {
                const noTemplatesMessage = document.createElement('div');
                noTemplatesMessage.textContent = 'No saved templates found.';
                noTemplatesMessage.style.cssText = `
                  text-align: center;
                  padding: 40px 20px;
                  color: #6d7175;
                  font-size: 14px;
                `;
                content.appendChild(noTemplatesMessage);
              }
            } catch (error) {
              console.error('Error deleting template:', error);
              alert(error.message || 'Failed to delete template. Please try again.');
              
              // Re-enable button
              deleteButton.disabled = false;
              deleteButton.textContent = 'Delete';
              deleteButton.style.opacity = '1';
              deleteButton.style.cursor = 'pointer';
            }
          };
          buttonsContainer.appendChild(deleteButton);

          templateItem.appendChild(buttonsContainer);
          templatesList.appendChild(templateItem);
        });

        content.appendChild(templatesList);
      }
    } catch (error) {
      console.error('Error loading saved templates:', error);
      loadingMessage.remove();
      errorMessage.textContent = error.message || 'Failed to load saved templates. Please try again.';
      errorMessage.style.display = 'block';
    }
  }

  // Function to apply template measurements to form
  function applyTemplateToForm(template, formContent, formData, chartData) {
    if (!template.savedMeasurements) {
      console.warn('Template does not have saved measurements');
      return;
    }

    const measurements = template.savedMeasurements;
    const inputs = formContent.querySelectorAll('input[type="number"]');

    // Populate input fields with saved measurements
    inputs.forEach((input) => {
      const fieldId = input.dataset.fieldId;
      if (fieldId && measurements[fieldId] !== undefined && measurements[fieldId] !== null) {
        input.value = measurements[fieldId];
        // Trigger input event to ensure any validation/handlers are triggered
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Apply fit preference if available
    if (chartData.fitPreferencesEnabled && template.fitPreference) {
      const fitSelect = formContent.querySelector('select');
      if (fitSelect) {
        fitSelect.value = template.fitPreference;
        fitSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Apply stitching notes if available
    if (chartData.stitchingNotesEnabled && template.stitchingNotes) {
      const notesTextarea = formContent.querySelector('textarea');
      if (notesTextarea) {
        notesTextarea.value = template.stitchingNotes;
        notesTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Scroll to top of form to show applied values
    if (formContent.parentElement) {
      formContent.parentElement.scrollTop = 0;
    }
  }
})();

