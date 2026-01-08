import prisma from "../db.server";
import { normalizeChartDataUrls } from "../utils/s3.server";

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

export function headers({ request, loaderHeaders }) {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": "*",
  };
}

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return corsResponse(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    // Fetch all measurement templates for this shop
    const templates = await prisma.sizeChartTemplate.findMany({
      where: {
        shop: shop,
        active: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Filter and format templates to only include measurement templates with saved measurements
    const measurementTemplates = templates
      .map(template => {
        try {
          let chartData;
          if (typeof template.chartData === 'string') {
            chartData = JSON.parse(template.chartData || '{}');
          } else {
            chartData = template.chartData || {};
          }

          // Only include templates that are measurement templates and have saved measurements
          if (chartData.isMeasurementTemplate && chartData.savedMeasurements) {
            // Normalize URLs in chartData (in case measurementFields have guideImages)
            chartData = normalizeChartDataUrls(chartData);
            
            return {
              id: template.id,
              name: template.name,
              category: chartData.category || 'custom',
              savedMeasurements: chartData.savedMeasurements,
              fitPreference: chartData.fitPreference || null,
              stitchingNotes: chartData.stitchingNotes || null,
              createdAt: template.createdAt,
              updatedAt: template.updatedAt,
            };
          }
          return null;
        } catch (error) {
          console.error('Error parsing template data:', error);
          return null;
        }
      })
      .filter(template => template !== null);

    // Templates already have normalized URLs from the map above
    return corsResponse({
      success: true,
      templates: measurementTemplates,
    });
  } catch (error) {
    console.error("Error loading measurement templates:", error);
    return corsResponse(
      { error: error.message || "Failed to load templates" },
      { status: 500 }
    );
  }
}

export const action = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");

    if (!shop) {
      return corsResponse(
        { error: "Shop parameter is required" },
        { status: 400 }
      );
    }

    // Handle DELETE method
    if (request.method === "DELETE") {
      const templateId = url.searchParams.get("id");
      
      if (!templateId) {
        return corsResponse(
          { error: "Template ID is required" },
          { status: 400 }
        );
      }

      // Find and delete the template
      const template = await prisma.sizeChartTemplate.findFirst({
        where: {
          id: templateId,
          shop: shop,
        },
      });

      if (!template) {
        return corsResponse(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      await prisma.sizeChartTemplate.delete({
        where: {
          id: templateId,
        },
      });

      return corsResponse({
        success: true,
        message: "Template deleted successfully",
      });
    }

    // Handle POST method (create/update)
    const formData = await request.formData();
    const templateData = JSON.parse(formData.get("template") || "{}");

    // Validate required fields
    if (!templateData.name || !templateData.measurementFields) {
      return corsResponse(
        { error: "Missing required fields: name, measurementFields" },
        { status: 400 }
      );
    }

    // Validate at least one enabled field
    const enabledFields = templateData.measurementFields.filter((f) => f.enabled);
    if (enabledFields.length === 0) {
      return corsResponse(
        { error: "At least one measurement field must be enabled" },
        { status: 400 }
      );
    }

    // Check for duplicate template name (for this shop)
    const trimmedName = templateData.name.trim();
    const existingTemplate = await prisma.sizeChartTemplate.findFirst({
      where: {
        shop: shop,
        name: trimmedName,
      },
    });

    if (existingTemplate) {
      return corsResponse(
        { error: `A template with the name "${trimmedName}" already exists. Please use a different name.` },
        { status: 400 }
      );
    }

    // Prepare template data for storage
    // Store measurement template data in the chartData field
    // along with a marker to identify it as a measurement template
    const storedTemplateData = {
      isMeasurementTemplate: true,
      category: templateData.category || "custom",
      measurementFields: templateData.measurementFields,
      fitPreferencesEnabled: templateData.fitPreferencesEnabled || false,
      stitchingNotesEnabled: templateData.stitchingNotesEnabled || false,
      fitPreferences: templateData.fitPreferences || null,
      savedMeasurements: templateData.measurements || {}, // Store the saved measurements
      fitPreference: templateData.fitPreference || null, // Store the selected fit preference
      stitchingNotes: templateData.stitchingNotes || null, // Store the stitching notes
    };

    // Create new template
    const savedTemplate = await prisma.sizeChartTemplate.create({
      data: {
        shop: shop,
        name: trimmedName,
        gender: "unisex", // Default for measurement templates
        category: templateData.category || "custom",
        description: `Measurement template with ${enabledFields.length} fields`,
        chartData: JSON.stringify(storedTemplateData),
        active: true,
      },
    });

    // Normalize URLs in measurementFields
    const normalizedFields = (templateData.measurementFields || []).map(field => {
      if (field.guideImage) {
        field.guideImage = normalizeChartDataUrls(field.guideImage);
      }
      if (field.guideImageUrl) {
        field.guideImageUrl = normalizeChartDataUrls(field.guideImageUrl);
      }
      return field;
    });

    return corsResponse({
      success: true,
      template: {
        id: savedTemplate.id,
        name: savedTemplate.name,
        category: templateData.category || "custom",
        measurementFields: normalizedFields,
        fitPreferencesEnabled: templateData.fitPreferencesEnabled || false,
        stitchingNotesEnabled: templateData.stitchingNotesEnabled || false,
      },
    });
  } catch (error) {
    console.error("Error saving measurement template:", error);
    return corsResponse(
      { error: error.message || "Failed to save template" },
      { status: 500 }
    );
  }
};

