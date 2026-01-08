import prisma from "../db.server";

/**
 * Public API endpoint to get available chart types for a product
 * Accessible at: /api/size-chart-types/public?shop=shop-domain&productId=product-id
 * Returns: { hasTableTemplate: boolean, hasCustomTemplate: boolean }
 */

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

export function headers({ request, loaderHeaders }) {
  return corsHeaders;
}

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const productId = url.searchParams.get("productId");

    if (!shop || !productId) {
      return corsResponse(
        { error: "Shop and productId parameters required", hasTableTemplate: false, hasCustomTemplate: false },
        { status: 400 }
      );
    }

    // Normalize product ID
    const normalizedProductId = productId.includes("/") 
      ? String(productId.split("/").pop()) 
      : String(productId);

    // Normalize shop domain
    const shopVariants = [];
    if (shop.includes(".")) {
      shopVariants.push(shop);
      shopVariants.push(shop.split(".")[0]);
    } else {
      shopVariants.push(shop);
      shopVariants.push(`${shop}.myshopify.com`);
    }

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

    let hasTableTemplate = false;
    let hasCustomTemplate = false;

    // Check each assignment to determine chart types
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

      if (isMeasurementTemplate) {
        hasCustomTemplate = true;
      } else {
        hasTableTemplate = true;
      }
    }

    return corsResponse({
      hasTableTemplate,
      hasCustomTemplate,
    });
  } catch (error) {
    console.error("[Size Chart Types API] Error:", error);
    return corsResponse(
      { 
        error: error.message || "Failed to check chart types",
        hasTableTemplate: false,
        hasCustomTemplate: false
      },
      { status: 500 }
    );
  }
}
