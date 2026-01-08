import prisma from "../db.server";

/**
 * Public API endpoint to get theme settings for a shop
 * Accessible at: /api/theme-settings/public?shop=shop-domain
 * This endpoint is called from the Liquid template via JavaScript
 * No authentication required - shop domain is passed as query parameter
 */

// CORS headers helper - must be set on all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Helper function to create a CORS-enabled Response
function corsResponse(data, init = {}) {
  const response = Response.json(data, init);
  // Set CORS headers directly on the response headers object
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Handle OPTIONS preflight requests - React Router v7 uses uppercase
export async function OPTIONS() {
  const response = new Response(null, {
    status: 204,
  });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Set CORS headers in response - React Router v7
// These headers will override any default headers
export function headers({ request, loaderHeaders }) {
  // Return CORS headers that override any existing headers
  return {
    ...corsHeaders,
    // Explicitly override Access-Control-Allow-Origin to ensure it's set correctly
    "Access-Control-Allow-Origin": "*",
  };
}

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return corsResponse(
        { error: "Shop parameter required" },
        { status: 400 }
      );
    }

    // Normalize shop domain (remove .myshopify.com if present, or add it)
    const normalizedShop = shop.includes(".") ? shop.split(".")[0] : shop;

    // Find settings for this shop first (to check for saved appUrl)
    const settings = await prisma.themeSettings.findUnique({
      where: { shop: normalizedShop },
    });

    // Detect app URL from request (automatic detection)
    // This is called from the storefront, so we need to detect the app server URL
    let normalizedAppUrl = "";
    
    // Priority 1: Saved appUrl from database (manual override from Theme Integration page)
    if (settings?.appUrl && settings.appUrl.trim()) {
      normalizedAppUrl = settings.appUrl.trim();
      console.log("[Theme Settings API] Using saved appUrl from database:", normalizedAppUrl);
    } else {
      // Priority 2: Environment variable (set by shopify app dev automatically)
      let appUrl = process.env.SHOPIFY_APP_URL || "";
    
      if (appUrl && appUrl !== "https://example.com" && appUrl.trim() !== "") {
        normalizedAppUrl = appUrl.trim();
        console.log("[Theme Settings API] Using SHOPIFY_APP_URL from environment");
      } else {
        // Priority 3: Check for forwarded headers (Cloudflare, ngrok, etc.)
      // These are set when request comes through a reverse proxy
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") || 
                            request.headers.get("x-forwarded-protocol");
      
      if (forwardedHost && !forwardedHost.includes("myshopify.com") && !forwardedHost.includes("cdn.shopify.com")) {
        const protocol = forwardedProto || "https";
        normalizedAppUrl = `${protocol}://${forwardedHost}`;
        console.log("[Theme Settings API] Detected from forwarded headers");
        } else {
          // Priority 4: Detect from request URL (when called directly to app server)
        const requestUrl = new URL(request.url);
        const requestHost = requestUrl.host;
        const requestProtocol = requestUrl.protocol;
        
        if (requestHost && !requestHost.includes("myshopify.com") && !requestHost.includes("cdn.shopify.com")) {
          normalizedAppUrl = `${requestProtocol}//${requestHost}`;
          console.log("[Theme Settings API] Detected from request URL");
        } else {
          // Priority 5: Detect from Host header
          const host = request.headers.get("host");
          if (host && !host.includes("myshopify.com") && !host.includes("cdn.shopify.com")) {
            const protocol = forwardedProto || 
                            request.headers.get("x-forwarded-protocol") || 
                            "https";
            normalizedAppUrl = `${protocol}://${host}`;
            console.log("[Theme Settings API] Detected from host header");
          } else {
            // Priority 6: Detect from Origin header
            const origin = request.headers.get("origin");
            if (origin && !origin.includes("myshopify.com") && !origin.includes("cdn.shopify.com")) {
              normalizedAppUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;
              console.log("[Theme Settings API] Detected from origin header");
            } else {
              console.warn("[Theme Settings API] Could not detect app URL from request headers");
              console.warn("[Theme Settings API] Request URL:", request.url);
              console.warn("[Theme Settings API] Host header:", request.headers.get("host"));
              console.warn("[Theme Settings API] Origin header:", request.headers.get("origin"));
            }
          }
        }
        }
      }
    }
    
    // Normalize the URL
    if (normalizedAppUrl) {
      if (!normalizedAppUrl.match(/^https?:\/\//i)) {
        normalizedAppUrl = "https://" + normalizedAppUrl;
      }
      if (normalizedAppUrl.endsWith("/")) {
        normalizedAppUrl = normalizedAppUrl.slice(0, -1);
      }
      console.log("[Theme Settings API] Final app URL:", normalizedAppUrl);
    } else {
      console.warn("[Theme Settings API] Could not detect app URL from request");
    }

    if (!settings) {
      // Return defaults if no settings found
      return corsResponse({
        settings: {
          buttonText: "Size Chart",
          customSizeButtonText: "Custom Size",
          buttonSize: "large",
          buttonWidth: "fit",
          alignment: "center",
          buttonType: "primary",
          iconType: "none",
          iconPosition: "left",
          backgroundColor: "#ffffff",
          borderColor: "#000000",
          textColor: "#000000",
          borderRadius: 0,
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 20,
          marginRight: 20,
        },
        appUrl: normalizedAppUrl, // Include app URL in default response too
      });
    }

    // Return settings in format expected by Liquid template
    return corsResponse({
      settings: {
        buttonText: settings.buttonText,
        customSizeButtonText: settings.customSizeButtonText || "Custom Size",
        buttonSize: settings.buttonSize,
        buttonWidth: settings.buttonWidth,
        alignment: settings.alignment,
        buttonType: settings.buttonType,
        iconType: settings.iconType,
        iconPosition: settings.iconPosition,
        backgroundColor: settings.backgroundColor,
        borderColor: settings.borderColor,
        textColor: settings.textColor,
        borderRadius: settings.borderRadius,
        marginTop: settings.marginTop,
        marginBottom: settings.marginBottom,
        marginLeft: settings.marginLeft,
        marginRight: settings.marginRight,
        appUrl: settings.appUrl || normalizedAppUrl, // Include saved appUrl or detected appUrl
      },
      appUrl: settings.appUrl || normalizedAppUrl, // Include app URL in response (saved takes priority)
    });
  } catch (error) {
    console.error("Error loading public theme settings:", error);
    return corsResponse(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
};
