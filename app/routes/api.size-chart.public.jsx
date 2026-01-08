import prisma from "../db.server";
import { normalizeChartDataUrls } from "../utils/s3.server";

/**
 * Public API endpoint to get size chart data for a product
 * Accessible at: /api/size-chart/public?shop=shop-domain&productId=product-id
 * This endpoint is called from the Liquid template via JavaScript
 * No authentication required - shop domain and product ID are passed as query parameters
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

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const productId = url.searchParams.get("productId");
    const templateType = url.searchParams.get("templateType"); // 'table' or 'custom'

    console.log("[Size Chart API] Request received:", { shop, productId, templateType });
    console.log("[Size Chart API] Request URL:", request.url);
    console.log("[Size Chart API] Request host:", url.host);
    console.log("[Size Chart API] Headers:", {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      "x-forwarded-host": request.headers.get("x-forwarded-host"),
      "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
    });

    if (!shop || !productId) {
      console.log("[Size Chart API] Missing parameters");
      return corsResponse(
        { error: "Shop and productId parameters required", hasChart: false },
        { status: 400 }
      );
    }

    // Normalize product ID (extract numeric ID if it's a GID)
    const normalizedProductId = productId.includes("/") 
      ? String(productId.split("/").pop()) 
      : String(productId);

    console.log("[Size Chart API] Normalized product ID:", normalizedProductId);

    // Normalize shop domain - try both formats since shop might be stored with or without .myshopify.com
    const shopVariants = [];
    if (shop.includes(".")) {
      shopVariants.push(shop); // Full domain (e.g., review-app-2027.myshopify.com)
      shopVariants.push(shop.split(".")[0]); // Short domain (e.g., review-app-2027)
    } else {
      shopVariants.push(shop); // Short domain
      shopVariants.push(`${shop}.myshopify.com`); // Full domain
    }

    console.log("[Size Chart API] Shop variants:", shopVariants);

    // Find all assignments for this product
    const assignments = await prisma.sizeChartProductAssignment.findMany({
      where: {
        shop: { in: shopVariants },
        productId: normalizedProductId,
      },
      include: {
        SizeChartTemplate: {
          select: {
            id: true,
            active: true,
            chartData: true,
          },
        },
      },
    });

    console.log("[Size Chart API] Assignments found:", assignments.length);

    // Filter by template type if specified
    let matchingAssignment = null;
    if (templateType && assignments.length > 0) {
      for (const assignment of assignments) {
        const template = assignment.SizeChartTemplate;
        if (!template || !template.active) continue;

        let chartData;
        try {
          chartData = typeof template.chartData === 'string'
            ? JSON.parse(template.chartData || '{}')
            : template.chartData;
        } catch (parseError) {
          continue;
        }

        const isMeasurementTemplate = chartData?.isMeasurementTemplate === true;
        const isTableTemplate = !isMeasurementTemplate;

        if (templateType === 'custom' && isMeasurementTemplate) {
          matchingAssignment = assignment;
          break;
        } else if (templateType === 'table' && isTableTemplate) {
          matchingAssignment = assignment;
          break;
        }
      }
    } else if (assignments.length > 0) {
      // If no template type specified, use first active assignment
      for (const assignment of assignments) {
        const template = assignment.SizeChartTemplate;
        if (template && template.active) {
          matchingAssignment = assignment;
          break;
        }
      }
    }

    const assignment = matchingAssignment;
    console.log("[Size Chart API] Assignment found:", !!assignment);

    if (!assignment) {
      console.log("[Size Chart API] No assignment found for product:", normalizedProductId);
      return corsResponse(
        { 
          error: "No size chart found for this product",
          hasChart: false 
        },
        { status: 404 }
      );
    }

    // Get product name from the matching assignment
    const productName = assignment.productTitle || null;

    // Template is already included in assignment
    const templateData = assignment.SizeChartTemplate;
    
    // Fetch full template data
    const template = await prisma.sizeChartTemplate.findUnique({
      where: {
        id: assignment.templateId,
      },
    });

    console.log("[Size Chart API] Template found:", !!template, "Active:", template?.active);

    if (!template) {
      console.log("[Size Chart API] Template not found for ID:", assignment.templateId);
      return corsResponse(
        { 
          error: "Size chart template not found",
          hasChart: false 
        },
        { status: 404 }
      );
    }

    // Only return if template is active
    if (!template.active) {
      console.log("[Size Chart API] Template is not active:", template.id);
      return corsResponse(
        { 
          error: "Size chart template is not active",
          hasChart: false 
        },
        { status: 404 }
      );
    }

    // Parse chart data if it's a string
    let chartData;
    try {
      chartData = typeof template.chartData === 'string'
        ? JSON.parse(template.chartData || '{}')
        : template.chartData;
      // Normalize any s3:// URLs to HTTPS URLs for browser compatibility
      chartData = normalizeChartDataUrls(chartData);
    } catch (parseError) {
      console.error("[Size Chart API] Error parsing chart data:", parseError);
      chartData = {};
    }

    // Ensure sizeData and columns are arrays (defensive programming)
    if (!chartData.sizeData || !Array.isArray(chartData.sizeData)) {
      chartData.sizeData = [];
    }
    if (!chartData.columns || !Array.isArray(chartData.columns)) {
      chartData.columns = [];
    }
    if (!chartData.measurementFields || !Array.isArray(chartData.measurementFields)) {
      chartData.measurementFields = [];
    }

    // Debug logging
    console.log("[Size Chart API] Chart data structure:", {
      hasSizeData: !!chartData.sizeData,
      sizeDataLength: chartData.sizeData?.length || 0,
      hasColumns: !!chartData.columns,
      columnsLength: chartData.columns?.length || 0,
      isMeasurementTemplate: chartData.isMeasurementTemplate,
      keys: Object.keys(chartData),
      templateId: template.id,
      templateName: template.name
    });

    console.log("[Size Chart API] Returning chart data successfully");

    // Return template data in format expected by the modal
    return corsResponse({
      hasChart: true,
      productName: productName,
      template: {
        id: template.id,
        name: template.name,
        description: template.description || '',
        chartData: chartData,
        measurementFile: chartData.measurementFile || null,
        rawDescription: template.description || '',
      },
    });
  } catch (error) {
    console.error("[Size Chart API] Error loading size chart for product:", error);
    console.error("[Size Chart API] Error stack:", error.stack);
    return corsResponse(
      { 
        error: error.message || "Failed to load size chart", 
        hasChart: false,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

