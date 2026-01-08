/**
 * Public API endpoint to get the app URL dynamically
 * This endpoint automatically detects the app URL based on the request
 * No authentication required - used by theme extension
 * 
 * Detection priority:
 * 1. SHOPIFY_APP_URL environment variable (set by shopify app dev)
 * 2. Request URL host (when called directly to app server)
 * 3. X-Forwarded-Host header (from Cloudflare/ngrok)
 * 4. Host header (direct requests)
 * 5. Origin header (CORS requests)
 * 6. Referer header
 * 7. App proxy pattern (fallback)
 */

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    // Debug: Log all relevant headers for troubleshooting
    console.log("[App URL API] Request URL:", request.url);
    console.log("[App URL API] Headers:", {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
      "x-real-ip": request.headers.get("x-real-ip"),
    });

    // Priority 1: Get app URL from environment variable (if set)
    let appUrl = process.env.SHOPIFY_APP_URL || "";
    
    // Skip if it's the default/example URL
    if (appUrl && appUrl !== "https://example.com" && appUrl.trim() !== "") {
      // Normalize and return
      if (!appUrl.match(/^https?:\/\//i)) {
        appUrl = "https://" + appUrl;
      }
      if (appUrl.endsWith("/")) {
        appUrl = appUrl.slice(0, -1);
      }
      console.log("[App URL API] Using environment variable:", appUrl);
      return corsResponse({
        appUrl: appUrl,
        detected: true,
        source: "environment",
      });
    }

    // Priority 2: Detect from request URL itself (most reliable for dynamic URLs)
    // If the request is coming to the app server directly, use the request origin
    const requestUrl = new URL(request.url);
    const requestHost = requestUrl.host;
    const requestProtocol = requestUrl.protocol;
    
    // If request is NOT from myshopify.com, it's likely the app server itself
    // This works when API is called directly (not through app proxy)
    if (requestHost && !requestHost.includes("myshopify.com") && !requestHost.includes("cdn.shopify.com")) {
      const detectedUrl = `${requestProtocol}//${requestHost}`;
      console.log("[App URL API] ✓ Detected from request URL:", detectedUrl);
      return corsResponse({
        appUrl: detectedUrl,
        detected: true,
        source: "request_url",
      });
    }
    
    // If request came through app proxy, the Host will be Shopify's domain
    // Check if request path contains /apps/ which indicates app proxy
    if (requestUrl.pathname.includes("/apps/")) {
      console.log("[App URL API] Request came through app proxy path");
      // When called via app proxy, we can't detect the real app URL from headers
      // But we can return app proxy URL as fallback
      if (shop) {
        const shopDomain = shop.includes(".") ? shop : `${shop}.myshopify.com`;
        const appProxyUrl = `https://${shopDomain}/apps/size-chart`;
        console.warn("[App URL API] ⚠️ Using app proxy URL (may not be configured):", appProxyUrl);
        return corsResponse({
          appUrl: appProxyUrl,
          detected: false,
          source: "app_proxy_path",
          warning: "App proxy detected but may not be configured. The app URL should be automatically detected when 'shopify app dev' is running.",
        });
      }
    }

    // Priority 3: Check for forwarded headers (when request comes through proxy/tunnel)
    // These headers are set by reverse proxies, load balancers, or tunnels
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || 
                          request.headers.get("x-forwarded-protocol");
    const realHost = request.headers.get("x-real-ip") ? 
                     request.headers.get("host") : null;
    
    if (forwardedHost && !forwardedHost.includes("myshopify.com") && !forwardedHost.includes("cdn.shopify.com")) {
      const protocol = forwardedProto || "https";
      const detectedUrl = `${protocol}://${forwardedHost}`;
      console.log("[App URL API] Detected from forwarded headers:", detectedUrl);
      return corsResponse({
        appUrl: detectedUrl,
        detected: true,
        source: "forwarded_headers",
      });
    }

    // Priority 4: Try to get from Host header (for direct requests to app server)
    const host = request.headers.get("host");
    if (host && !host.includes("myshopify.com") && !host.includes("cdn.shopify.com")) {
      const protocol = forwardedProto || 
                      (request.url.startsWith("https") ? "https" : "http");
      const detectedUrl = `${protocol}://${host}`;
      console.log("[App URL API] Detected from host header:", detectedUrl);
      return corsResponse({
        appUrl: detectedUrl,
        detected: true,
        source: "host_header",
      });
    }

    // Priority 5: Try to get from request origin (for CORS requests)
    const origin = request.headers.get("origin");
    if (origin && !origin.includes("myshopify.com") && !origin.includes("cdn.shopify.com")) {
      const detectedUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;
      console.log("[App URL API] Detected from origin header:", detectedUrl);
      return corsResponse({
        appUrl: detectedUrl,
        detected: true,
        source: "origin_header",
      });
    }

    // Priority 6: Try to get from referer header
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        // If referer is NOT from Shopify, it might be the app URL
        if (!refererUrl.hostname.includes("myshopify.com") && !refererUrl.hostname.includes("cdn.shopify.com")) {
          const detectedUrl = refererUrl.origin;
          console.log("[App URL API] Detected from referer:", detectedUrl);
          return corsResponse({
            appUrl: detectedUrl,
            detected: true,
            source: "referer",
          });
        }
      } catch (e) {
        // Invalid referer URL
      }
    }

    // Last resort: App proxy (only if we're on Shopify storefront)
    // But don't return this if we can't confirm it's configured
    if (shop) {
      const shopDomain = shop.includes(".") ? shop : `${shop}.myshopify.com`;
      const appProxyUrl = `https://${shopDomain}/apps/size-chart`;
      console.warn("[App URL API] Falling back to app proxy (may not be configured):", appProxyUrl);
      return corsResponse({
        appUrl: appProxyUrl,
        detected: false,
        source: "app_proxy_fallback",
        warning: "App proxy may not be configured. Please set SHOPIFY_APP_URL environment variable.",
      });
    }

    // No URL found
    return corsResponse({
      appUrl: "",
      detected: false,
      source: "none",
      error: "Could not detect app URL. Please set SHOPIFY_APP_URL environment variable.",
    });
  } catch (error) {
    console.error("[App URL API] Error:", error);
    return corsResponse(
      { error: "Failed to detect app URL", appUrl: "" },
      { status: 500 }
    );
  }
}

