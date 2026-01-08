import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const templateId = url.searchParams.get("id");

  try {
    if (!templateId) {
      return Response.json({ error: "Template ID required" }, { status: 400 });
    }

    // Load measurement template from database
    // We'll store measurement templates in the chartData field of SizeChartTemplate
    // with a special marker to identify them as measurement templates
    const template = await prisma.sizeChartTemplate.findFirst({
      where: {
        id: templateId,
        shop: shop,
      },
    });

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 });
    }

    // Parse chart data
    let chartData;
    try {
      chartData = typeof template.chartData === 'string'
        ? JSON.parse(template.chartData || '{}')
        : template.chartData;
    } catch (parseError) {
      console.error("Error parsing template data:", parseError);
      chartData = {};
    }

    // Check if this is a measurement template (has measurementFields and isMeasurementTemplate flag)
    if (!chartData.isMeasurementTemplate && !chartData.measurementFields) {
      return Response.json({ error: "Not a measurement template" }, { status: 400 });
    }

    return Response.json({
      template: {
        id: template.id,
        name: template.name,
        category: chartData.category || "custom",
        measurementFields: chartData.measurementFields || [],
        fitPreferencesEnabled: chartData.fitPreferencesEnabled || false,
        stitchingNotesEnabled: chartData.stitchingNotesEnabled || false,
        fitPreferences: chartData.fitPreferences || null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error loading measurement template:", error);
    return Response.json(
      { error: error.message || "Failed to load template" },
      { status: 500 }
    );
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const formData = await request.formData();
    const templateData = JSON.parse(formData.get("template") || "{}");
    const templateId = formData.get("id") || "";

    // Validate required fields
    if (!templateData.name || !templateData.measurementFields) {
      return Response.json(
        { error: "Missing required fields: name, measurementFields" },
        { status: 400 }
      );
    }

    // Validate at least one enabled field
    const enabledFields = templateData.measurementFields.filter((f) => f.enabled);
    if (enabledFields.length === 0) {
      return Response.json(
        { error: "At least one measurement field must be enabled" },
        { status: 400 }
      );
    }

    // Check for duplicate template name
    const trimmedName = templateData.name.trim();
    const whereClause = templateId 
      ? {
          shop: shop,
          name: trimmedName,
          id: { not: templateId },
        }
      : {
          shop: shop,
          name: trimmedName,
        };
    
    const existingTemplate = await prisma.sizeChartTemplate.findFirst({
      where: whereClause,
    });

    if (existingTemplate) {
      return Response.json(
        { error: `A template with the name "${trimmedName}" already exists. Please use a different name.` },
        { status: 400 }
      );
    }

    // Prepare template data for storage
    // We'll store measurement template data in the chartData field
    // along with a marker to identify it as a measurement template
    const storedTemplateData = {
      isMeasurementTemplate: true,
      category: templateData.category || "custom",
      measurementFields: templateData.measurementFields,
      fitPreferencesEnabled: templateData.fitPreferencesEnabled || false,
      stitchingNotesEnabled: templateData.stitchingNotesEnabled || false,
      fitPreferences: templateData.fitPreferences || null,
    };

    let savedTemplate;

    if (templateId) {
      // Update existing template
      savedTemplate = await prisma.sizeChartTemplate.update({
        where: {
          id: templateId,
        },
        data: {
          name: trimmedName,
          category: templateData.category || "custom",
          chartData: JSON.stringify(storedTemplateData),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new template
      savedTemplate = await prisma.sizeChartTemplate.create({
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
    }

    return Response.json({
      success: true,
      template: {
        id: savedTemplate.id,
        name: savedTemplate.name,
        category: templateData.category || "custom",
        measurementFields: templateData.measurementFields,
        fitPreferencesEnabled: templateData.fitPreferencesEnabled || false,
        stitchingNotesEnabled: templateData.stitchingNotesEnabled || false,
      },
    });
  } catch (error) {
    console.error("Error saving measurement template:", error);
    return Response.json(
      { error: error.message || "Failed to save template" },
      { status: 500 }
    );
  }
};

