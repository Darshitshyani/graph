import prisma from "../db.server";

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function corsResponse(data, init = {}) {
  const response = Response.json(data, init);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS() {
  const response = new Response(null, { status: 204 });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function headers() {
  return corsHeaders;
}

/**
 * Public API endpoint to create a draft order with custom measurements
 * This endpoint is called from the theme (client-side) when customer clicks "Add to Cart" in custom order modal
 * 
 * IMPORTANT: This endpoint ONLY creates draft orders for custom orders.
 * It does NOT affect regular Shopify cart checkout or payment methods.
 * Regular cart checkout uses Shopify's default flow and is controlled by shipping profiles configured in Shopify Admin.
 * 
 * Requires: write_orders scope and app installation
 */
export async function action({ request }) {
  try {
    // Get shop domain from query params
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    if (!shop) {
      return corsResponse({ error: "Shop parameter is required" }, { status: 400 });
    }

    const body = await request.json();
    const { productId, variantId, measurements, quantity = 1 } = body;

    if (!productId) {
      return corsResponse({ error: "Product ID is required" }, { status: 400 });
    }

    if (!measurements || Object.keys(measurements).length === 0) {
      return corsResponse({ error: "Measurements are required" }, { status: 400 });
    }

    // Normalize shop domain - try both formats since shop might be stored with or without .myshopify.com
    const shopVariants = [];
    if (shop.includes(".")) {
      shopVariants.push(shop); // Full domain (e.g., review-app-2027.myshopify.com)
      shopVariants.push(shop.split(".")[0]); // Short domain (e.g., review-app-2027)
    } else {
      shopVariants.push(shop); // Short domain
      shopVariants.push(`${shop}.myshopify.com`); // Full domain
    }

    // Try to find session in database by querying directly
    // First try to find session by shop in database
    let sessionRecord = null;
    for (const shopVariant of shopVariants) {
      sessionRecord = await prisma.session.findFirst({
        where: {
          shop: shopVariant
        },
        orderBy: {
          expires: 'desc' // Get most recent session
        }
      });
      if (sessionRecord) {
        break; // Found session, stop trying
      }
    }
    
    if (!sessionRecord) {
      console.error("Session not found in database for shop variants:", shopVariants);
      return corsResponse({ 
        error: "App not installed",
        message: "Please ensure the Size Chart app is installed on this shop. The app needs to be installed and authorized to create custom orders."
      }, { status: 401 });
    }
    
    // Check if session is expired
    if (sessionRecord.expires && new Date(sessionRecord.expires) < new Date()) {
      console.error("Session expired for shop:", sessionRecord.shop);
      return corsResponse({ 
        error: "Session expired",
        message: "The app session has expired. Please reinstall the app or contact support."
      }, { status: 401 });
    }
    
    // Use the shop from the session record
    const sessionShop = sessionRecord.shop;
    const accessToken = sessionRecord.accessToken;

    // Use REST API for draft orders (more reliable than GraphQL)
    const apiVersionString = '2024-10';
    
    const makeRestRequest = async (method, endpoint, body = null) => {
      const url = `https://${sessionShop}/admin/api/${apiVersionString}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    };

    // Normalize product ID (extract numeric ID)
    let normalizedProductId = String(productId);
    if (normalizedProductId.includes('/')) {
      normalizedProductId = normalizedProductId.split('/').pop();
    }
    // Remove gid:// prefix if present
    normalizedProductId = normalizedProductId.replace(/^gid:\/\/shopify\/Product\//, '');

    // Get product details using REST API
    const productData = await makeRestRequest('GET', `/products/${normalizedProductId}.json`);
    
    if (!productData.product) {
      return corsResponse({ error: "Product not found" }, { status: 404 });
    }

    const product = productData.product;
    
    // Use provided variantId or default to first variant
    // Extract numeric ID from variantId if it's a GID
    let selectedVariantId = variantId;
    if (!selectedVariantId && product.variants && product.variants.length > 0) {
      selectedVariantId = product.variants[0].id;
    }
    
    if (selectedVariantId && selectedVariantId.toString().includes('gid://')) {
      // Extract numeric ID from GID
      selectedVariantId = selectedVariantId.replace(/^gid:\/\/shopify\/ProductVariant\//, '');
    }
    
    if (!selectedVariantId) {
      return corsResponse({ error: "No variant found for product" }, { status: 400 });
    }

    // Convert measurements to line item properties
    const lineItemProperties = [];
    lineItemProperties.push({
      name: "_custom_order",
      value: "true"
    });

    // Add each measurement as a property
    Object.entries(measurements).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Format measurement name (e.g., "Chest / Bust" -> "Chest / Bust")
        const formattedName = key
          .split('/')
          .map(part => part.trim().charAt(0).toUpperCase() + part.trim().slice(1).toLowerCase())
          .join(' / ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        lineItemProperties.push({
          name: formattedName,
          value: String(value)
        });
      }
    });

    // Create draft order using REST API
    // 
    // IMPORTANT: COD Restriction via Shipping Profiles (NOT code-based)
    // 
    // Shopify does NOT allow programmatic control of payment methods for draft orders.
    // Payment customization APIs, Functions, or checkout extensions DO NOT work for draft order checkouts.
    // 
    // ✅ CORRECT APPROACH: Shipping Profiles Control COD Availability
    // 
    // How it works:
    // - COD only appears when a COD-enabled shipping rate exists
    // - Shipping profiles control which shipping rates are available
    // - Draft orders automatically respect shipping profiles
    // - If no COD shipping rate exists → COD cannot appear at checkout
    // 
    // Implementation (done in Shopify Admin, NOT in code):
    // 1. Shipping profile "Custom Orders – No COD" exists
    // 2. This profile contains ONLY prepaid shipping rates (no COD-enabled carriers)
    // 3. Products eligible for custom orders are assigned to this profile
    // 4. Draft orders automatically use the product's shipping profile
    // 
    // This is the ONLY Shopify-supported, App Review-safe method for COD restriction on draft orders.
    // No code-based payment method control is attempted or needed.
    const draftOrderPayload = {
      draft_order: {
        line_items: [
          {
            variant_id: parseInt(selectedVariantId),
            quantity: parseInt(quantity) || 1,
            properties: lineItemProperties
          }
        ],
        tags: "custom-order",
        note: "This is a custom-made order. Cash on Delivery is not available.",
        use_customer_default_address: true,
        payment_terms: null, // Immediate payment required
      }
    };
    
    console.log("Creating draft order with payload:", JSON.stringify(draftOrderPayload, null, 2));
    console.log("API Version:", apiVersionString);
    console.log("Shop:", sessionShop);
    
    const draftOrderResponse = await makeRestRequest('POST', '/draft_orders.json', draftOrderPayload);
    
    // Log full response for debugging
    console.log("Draft order response:", JSON.stringify(draftOrderResponse, null, 2));
    
    if (!draftOrderResponse.draft_order) {
      console.error("No draft_order in response:", draftOrderResponse);
      return corsResponse({ 
        error: "Failed to create draft order", 
        message: "Invalid response from Shopify API",
        details: draftOrderResponse 
      }, { status: 500 });
    }

    const draftOrder = draftOrderResponse.draft_order;
    
    // Use checkout_url if available (typically doesn't show COD), otherwise fallback to invoice_url
    const checkoutUrl = draftOrder.checkout_url || draftOrder.invoice_url;
    
    if (!checkoutUrl) {
      return corsResponse({ error: "Draft order created but no checkout/invoice URL" }, { status: 500 });
    }

    // COD Restriction: Shipping Profiles (NOT code-based)
    // 
    // This app does NOT attempt to control payment methods in code because:
    // - Shopify does NOT allow programmatic control of payment methods for draft orders
    // - Payment customization APIs/Functions/extensions DO NOT work for draft order checkouts
    // 
    // COD restriction is achieved SOLELY through shipping profile configuration:
    // - Products are assigned to "Custom Orders – No COD" shipping profile
    // - This profile contains ONLY prepaid shipping rates (no COD-enabled carriers)
    // - Draft orders automatically respect the product's shipping profile
    // - If no COD shipping rate exists → COD payment option cannot appear
    // 
    // This is the ONLY Shopify-supported, App Review-safe method.
    // No code-based payment method control is implemented or needed.
    
    return corsResponse({ 
      success: true,
      invoiceUrl: checkoutUrl,
      draftOrderId: draftOrder.id,
      draftOrderName: draftOrder.name,
      message: "Draft order created with 'custom-order' tag. Ensure products are assigned to 'Custom Orders – No COD' shipping profile to restrict COD."
    });

  } catch (error) {
    console.error("Error creating draft order:", error);
    return corsResponse({ 
      error: "Internal server error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Handle GET requests (for testing)
export async function loader({ request }) {
  return corsResponse({ 
    message: "Draft Order API - Use POST to create draft orders",
    endpoint: "/api/draft-order/public"
  });
}
