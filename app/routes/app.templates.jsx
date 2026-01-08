import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLoaderData, useFetcher, useActionData, useRevalidator, useNavigate } from "react-router";
import { 
  TextField, 
  InputAdornment, 
  IconButton, 
  Button, 
  Switch, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  FormControl,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Backdrop,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  FormControlLabel,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import LinkIcon from "@mui/icons-material/Link";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import WarningIcon from "@mui/icons-material/Warning";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import InfoIcon from "@mui/icons-material/Info";
import SettingsIcon from "@mui/icons-material/Settings";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SaveIcon from "@mui/icons-material/Save";
import CategoryIcon from "@mui/icons-material/Category";
import StraightenIcon from "@mui/icons-material/Straighten";
import TuneIcon from "@mui/icons-material/Tune";
import ImageIcon from "@mui/icons-material/Image";
import DescriptionIcon from "@mui/icons-material/Description";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import CreateChart from "../shared/CreateChart";
import SizeChart from "../shared/SizeChart";
import TemplateViewModal from "../shared/TemplateViewModal";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { uploadImageToS3, getS3Url, normalizeChartDataUrls, deleteImageFromS3 } from "../utils/s3.server";

// Default tailor measurements
const DEFAULT_TAILOR_MEASUREMENTS = [
  { id: "chest", name: "Chest / Bust", description: "Measure around the fullest part of your chest, keeping the tape measure horizontal and parallel to the ground.", unit: "in", required: true, enabled: true, order: 0, min: 20, max: 60, guideImage: null },
  { id: "waist", name: "Waist", description: "Wrap the measuring tape around your torso at the smallest part of your waist. Typically this is an inch or so above your belly button.", unit: "in", required: true, enabled: true, order: 1, min: 20, max: 50, guideImage: null },
  { id: "hip", name: "Hip", description: "Wrap the measuring tape around the widest part of your hips and seat, keeping the tape parallel to the ground.", unit: "in", required: false, enabled: true, order: 2, min: 25, max: 60, guideImage: null },
  { id: "shoulder", name: "Shoulder", description: "Measure from the edge of one shoulder bone to the edge of the other shoulder bone, across the back.", unit: "in", required: true, enabled: true, order: 3, min: 12, max: 24, guideImage: null },
  { id: "sleeve", name: "Sleeve Length", description: "Measure from the shoulder point (where shoulder meets arm) down to your desired sleeve length (wrist, elbow, or any custom length).", unit: "in", required: false, enabled: true, order: 4, min: 0, max: 40, guideImage: null },
  { id: "armhole", name: "Armhole", description: "Measure around the arm where it meets the shoulder, keeping the tape snug but not tight.", unit: "in", required: false, enabled: true, order: 5, min: 10, max: 30, guideImage: null },
  { id: "neck", name: "Neck", description: "Measure around the base of your neck where the collar would sit. Keep the tape comfortably loose.", unit: "in", required: false, enabled: true, order: 6, min: 10, max: 20, guideImage: null },
  { id: "length", name: "Length", description: "Measure from the top of the garment (shoulder or neck) down to the desired bottom hem length.", unit: "in", required: true, enabled: true, order: 7, min: 10, max: 60, guideImage: null },
  { id: "thigh", name: "Thigh", description: "Measure around the fullest part of your thigh, keeping the tape parallel to the ground.", unit: "in", required: false, enabled: true, order: 8, min: 15, max: 40, guideImage: null },
  { id: "bottom_opening", name: "Bottom Opening", description: "Measure the desired width of the bottom hem or opening of the garment.", unit: "in", required: false, enabled: true, order: 9, min: 8, max: 30, guideImage: null },
];

const TAILOR_PRESETS = {
  "mens_shirt": { name: "Men's Shirt", fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "neck", "length"] },
  "mens_kurta": { name: "Men's Kurta", fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "length", "bottom_opening"] },
  "womens_blouse": { name: "Women's Blouse", fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "length"] },
  "saree_blouse": { name: "Saree Blouse", fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "length"] },
  "pants": { name: "Pants / Trouser", fields: ["waist", "hip", "thigh", "length", "bottom_opening"] },
  "lehenga": { name: "Lehenga / Dress", fields: ["chest", "waist", "hip", "shoulder", "sleeve", "length"] },
  "custom": { name: "Custom Tailoring", fields: [] },
};

const FIT_PREFERENCES = {
  slim: { label: "Slim Fit", ease: 0 },
  regular: { label: "Regular Fit", ease: 0.5 },
  loose: { label: "Loose Fit", ease: 1.0 },
};

// Inline styles to force full width
const fullWidthStyle = {
  width: '100%',
  maxWidth: '100%',
  margin: '0',
  marginLeft: '0',
  marginRight: '0',
};

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateToday.getTime() === today.getTime()) {
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `Today at ${timeStr.toLowerCase()}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Initialize return values
  let templates = [];
  let products = [];
  let productTemplateMap = {};


  // Fetch templates from database - CRITICAL: This must succeed
  try {
    const fetchedTemplates = await prisma.sizeChartTemplate.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      include: {
        SizeChartProductAssignment: {
          select: {
            productId: true,
            productTitle: true,
          },
        },
      },
    });
    
    // Map SizeChartProductAssignment to productAssignments for consistency
    // Normalize chartData URLs (convert s3:// to HTTPS)
    templates = fetchedTemplates.map(t => {
      let chartData = {};
      try {
        chartData = typeof t.chartData === 'string' 
          ? JSON.parse(t.chartData || '{}') 
          : (t.chartData || {});
        // Normalize any s3:// URLs to HTTPS URLs
        chartData = normalizeChartDataUrls(chartData);
      } catch (e) {
        console.error('Error parsing chartData in loader:', e);
        chartData = {};
      }
      
      return {
        ...t,
        chartData,
        productAssignments: t.SizeChartProductAssignment || [],
      };
    });
    
    // Successfully fetched templates
  } catch (templateError) {
    console.error("[Templates Loader] Error fetching templates:", templateError);
    // Don't return empty - log and continue with empty array
    templates = [];
  }

  // Fetch products from Shopify - Non-critical, can fail without affecting templates
  try {
    const { admin } = await authenticate.admin(request);
    
    // Fetch all products with pagination support
    let allProducts = [];
    let hasNextPage = true;
    let cursor = null;
    
    while (hasNextPage && allProducts.length < 250) {
      const productsResponse = await admin.graphql(
        `#graphql
          query getProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              nodes {
                id
                title
                handle
                status
                vendor
                productType
                featuredImage {
                  url
                  altText
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }`,
        {
          variables: {
            first: 50,
            after: cursor,
          },
        },
      );

      const productsJson = await productsResponse.json();
      const productsBatch = productsJson.data?.products?.nodes || [];
      allProducts = [...allProducts, ...productsBatch];
      
      hasNextPage = productsJson.data?.products?.pageInfo?.hasNextPage || false;
      cursor = productsJson.data?.products?.pageInfo?.endCursor || null;
    }
    
    products = allProducts;
  } catch (productsError) {
    console.error("[Templates Loader] Error fetching products:", productsError);
    // Continue with empty products array - templates are more important
    products = [];
  }

  // Fetch product assignments - Non-critical
  try {
    const allAssignments = await prisma.sizeChartProductAssignment.findMany({
      where: { shop },
    });

    // OPTIMIZATION: Fetch all unique template IDs and get them in one query
    const uniqueTemplateIds = [...new Set(allAssignments.map(a => a.templateId))];
    
    // Fetch all templates at once instead of N+1 queries
    const templateMap = new Map();
    if (uniqueTemplateIds.length > 0) {
      const allTemplates = await prisma.sizeChartTemplate.findMany({
        where: { id: { in: uniqueTemplateIds } },
        select: {
          id: true,
          name: true,
          chartData: true,
        },
      });
      
      // Create a map for O(1) lookup
      allTemplates.forEach(template => {
        templateMap.set(template.id, template.name);
      });
    }
    
    // Build product template map efficiently - support multiple templates per product
    allAssignments.forEach((assignment) => {
      const templateName = templateMap.get(assignment.templateId);
      
      if (templateName) {
        // Get template from database to check type
        const assignmentTemplate = allTemplates.find(t => t.id === assignment.templateId);
        const chartData = assignmentTemplate?.chartData 
          ? (typeof assignmentTemplate.chartData === 'string' 
              ? JSON.parse(assignmentTemplate.chartData) 
              : assignmentTemplate.chartData)
          : null;
        const isMeasurementTemplate = chartData?.isMeasurementTemplate === true;
        
        // Normalize productId - extract numeric part if it's a full GID, otherwise use as-is
        let productId = String(assignment.productId);
        if (productId.includes('/')) {
          productId = String(productId.split('/').pop());
        }
        
        if (!productTemplateMap[productId]) {
          productTemplateMap[productId] = {
            tableTemplate: null,
            customTemplate: null,
          };
        }
        
        // Store based on template type
        if (isMeasurementTemplate) {
          productTemplateMap[productId].customTemplate = {
            templateId: String(assignment.templateId),
            templateName: templateName,
          };
        } else {
          productTemplateMap[productId].tableTemplate = {
            templateId: String(assignment.templateId),
            templateName: templateName,
          };
        }
      }
    });
    
    // Product template map created
  } catch (assignmentsError) {
    console.error("[Templates Loader] Error fetching assignments:", assignmentsError);
    // Continue with empty map
    productTemplateMap = {};
  }

  // ALWAYS return templates, even if other parts failed
  return { 
    templates, 
    products, 
    productTemplateMap,
  };
};

/**
 * Process chartData and upload any images to S3
 * @param {object} chartData - Parsed chartData object
 * @param {FormData} formData - FormData object containing image files
 * @returns {Promise<object>} - Updated chartData with S3 URLs
 */
async function processChartDataImages(chartData, formData) {
  if (!chartData || typeof chartData !== "object") {
    return chartData;
  }

  const processedData = JSON.parse(JSON.stringify(chartData)); // Deep clone

  // Handle measurementFile (from CreateChart component)
  const measurementFileFormData = formData.get("measurementFile");
  if (measurementFileFormData instanceof File) {
    // User uploaded a new file - upload it to S3
    try {
      const s3Key = await uploadImageToS3(measurementFileFormData, measurementFileFormData.name);
      processedData.measurementFile = getS3Url(s3Key);
    } catch (error) {
      console.error("Error uploading measurementFile to S3:", error);
      throw new Error(`Failed to upload measurement file: ${error.message}`);
    }
  } else if (processedData.measurementFile && typeof processedData.measurementFile === 'string' && processedData.measurementFile.startsWith('https://')) {
    // Existing URL was passed in chartData (editing mode, no new file uploaded) - keep it as is
    // URL is already in processedData.measurementFile from chartData parsing
    // No need to do anything - it's already the correct S3 URL
  }
  // If neither condition is true, measurementFile will be undefined/null in processedData

  // Handle measurementFields with guideImage
  if (processedData.measurementFields && Array.isArray(processedData.measurementFields)) {
    for (let i = 0; i < processedData.measurementFields.length; i++) {
      const field = processedData.measurementFields[i];
      const imageFileKey = `guideImage_${i}`;
      const imageFile = formData.get(imageFileKey);

      if (imageFile instanceof File) {
        try {
          const s3Key = await uploadImageToS3(imageFile, imageFile.name);
          processedData.measurementFields[i].guideImage = getS3Url(s3Key);
          processedData.measurementFields[i].guideImageUrl = getS3Url(s3Key);
        } catch (error) {
          console.error(`Error uploading guideImage for field ${i} to S3:`, error);
          // Continue processing other fields
        }
      }
      // If guideImage is a base64 data URL, convert it (this shouldn't happen in new uploads)
      else if (field.guideImage && field.guideImage.startsWith("data:image")) {
        // Skip base64 images - they should be uploaded as files
        console.warn(`Field ${i} has base64 image, skipping S3 upload. Image should be uploaded as file.`);
      }
    }
  }

  return processedData;
}

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const intent = formData.get("intent");
    if (intent === "create") {
      const name = formData.get("name");
      const gender = formData.get("gender");
      const category = formData.get("category");
      const description = formData.get("description");
      const chartDataStr = formData.get("chartData");
      
      // Parse chartData
      let chartData = {};
      try {
        chartData = chartDataStr ? JSON.parse(chartDataStr) : {};
      } catch (e) {
        console.error("Error parsing chartData:", e);
        chartData = {};
      }

      // Validate required fields
      if (!shop) {
        return { success: false, error: "Shop information is missing. Please try logging in again." };
      }

      if (!name || name.trim() === "") {
        return { success: false, error: "Chart name is required." };
      }

      if (!gender) {
        return { success: false, error: "Gender is required." };
      }

      // Check for duplicate template name
      const trimmedName = (name || "Untitled Chart").trim();
      const existingTemplate = await prisma.sizeChartTemplate.findFirst({
        where: {
          shop: shop,
          name: trimmedName,
        },
      });

      if (existingTemplate) {
        return { 
          success: false, 
          error: `A template with the name "${trimmedName}" already exists. Please use a different name.` 
        };
      }

      // Process and upload images to S3
      chartData = await processChartDataImages(chartData, formData);

      const template = await prisma.sizeChartTemplate.create({
        data: {
          shop,
          name: trimmedName,
          gender: gender || "unisex",
          category: category || null,
          description: description || null,
          chartData: JSON.stringify(chartData),
          active: true,
        },
        include: {
          SizeChartProductAssignment: {
            select: {
              productId: true,
              productTitle: true,
            },
          },
        },
      });

      // Map SizeChartProductAssignment to productAssignments for frontend
      // Parse and normalize chartData URLs in response
      let normalizedChartData = {};
      try {
        normalizedChartData = typeof template.chartData === 'string' 
          ? JSON.parse(template.chartData || '{}') 
          : (template.chartData || {});
        normalizedChartData = normalizeChartDataUrls(normalizedChartData);
      } catch (e) {
        console.error('Error parsing chartData in create action:', e);
        normalizedChartData = {};
      }

      const templateWithMappedRelation = {
        ...template,
        chartData: normalizedChartData,
        productAssignments: template.SizeChartProductAssignment || [],
      };

      return { success: true, template: templateWithMappedRelation };
    }

    if (intent === "update") {
      const id = formData.get("id");
      const name = formData.get("name");
      const gender = formData.get("gender");
      const category = formData.get("category");
      const description = formData.get("description");
      const chartDataStr = formData.get("chartData");
      
      // Parse chartData
      let chartData = {};
      try {
        chartData = chartDataStr ? JSON.parse(chartDataStr) : {};
      } catch (e) {
        console.error("Error parsing chartData:", e);
        chartData = {};
      }

      // Process and upload images to S3
      chartData = await processChartDataImages(chartData, formData);

      // Check for duplicate template name (excluding current template)
      if (name && name.trim()) {
        const trimmedName = name.trim();
        const existingTemplate = await prisma.sizeChartTemplate.findFirst({
          where: {
            shop: shop,
            name: trimmedName,
            id: { not: id },
          },
        });

        if (existingTemplate) {
          return { 
            success: false, 
            error: `A template with the name "${trimmedName}" already exists. Please use a different name.` 
          };
        }
      }

      const template = await prisma.sizeChartTemplate.update({
        where: { id, shop },
        data: {
          name: name ? name.trim() : name,
          gender,
          category,
          description,
          chartData: JSON.stringify(chartData),
        },
        include: {
          SizeChartProductAssignment: {
            select: {
              productId: true,
              productTitle: true,
            },
          },
        },
      });

      // Map SizeChartProductAssignment to productAssignments for frontend
      // Parse and normalize chartData URLs in response
      let normalizedChartData = {};
      try {
        normalizedChartData = typeof template.chartData === 'string' 
          ? JSON.parse(template.chartData || '{}') 
          : (template.chartData || {});
        normalizedChartData = normalizeChartDataUrls(normalizedChartData);
      } catch (e) {
        console.error('Error parsing chartData in update action:', e);
        normalizedChartData = {};
      }

      const templateWithMappedRelation = {
        ...template,
        chartData: normalizedChartData,
        productAssignments: template.SizeChartProductAssignment || [],
      };

      return { success: true, template: templateWithMappedRelation };
    }

    if (intent === "toggle-active") {
      const id = formData.get("id");
      const active = formData.get("active") === "true";

      const template = await prisma.sizeChartTemplate.update({
        where: { id, shop },
        data: { active },
      });

      return { success: true, template };
    }

    if (intent === "delete") {
      const id = formData.get("id");

      // Check if template has any product assignments
      const template = await prisma.sizeChartTemplate.findUnique({
        where: { id, shop },
        include: {
          SizeChartProductAssignment: {
            select: {
              productId: true,
              productTitle: true,
            },
          },
        },
      });

      if (!template) {
        return { 
          success: false, 
          error: "Template not found" 
        };
      }

      // Map SizeChartProductAssignment to productAssignments
      const templateWithMappedRelation = {
        ...template,
        productAssignments: template.SizeChartProductAssignment || [],
      };

      // Prevent deletion if template has product assignments
      if (templateWithMappedRelation.productAssignments && templateWithMappedRelation.productAssignments.length > 0) {
        const productCount = templateWithMappedRelation.productAssignments.length;
        const productList = templateWithMappedRelation.productAssignments
          .slice(0, 3)
          .map(p => p.productTitle)
          .join(", ");
        const moreText = productCount > 3 ? ` and ${productCount - 3} more` : "";
        
        return { 
          success: false, 
          error: `Cannot delete template "${templateWithMappedRelation.name}". It is currently assigned to ${productCount} product${productCount > 1 ? 's' : ''}: ${productList}${moreText}. Please remove the template from all products before deleting.`,
          hasAssignments: true,
          assignmentCount: productCount
        };
      }

      // Extract and delete images from S3 before deleting the template
      try {
        let chartData = {};
        if (template.chartData) {
          try {
            chartData = typeof template.chartData === 'string' 
              ? JSON.parse(template.chartData || '{}') 
              : template.chartData;
          } catch (e) {
            console.error('Error parsing chartData for image deletion:', e);
          }
        }

        // Delete measurementFile image if it exists
        if (chartData.measurementFile && typeof chartData.measurementFile === 'string') {
          await deleteImageFromS3(chartData.measurementFile);
        }

        // Delete guideImage images from measurementFields if they exist
        if (chartData.measurementFields && Array.isArray(chartData.measurementFields)) {
          for (const field of chartData.measurementFields) {
            // Try guideImageUrl first, then guideImage
            const imageUrl = field.guideImageUrl || field.guideImage;
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('https://')) {
              await deleteImageFromS3(imageUrl);
            }
          }
        }
      } catch (imageDeletionError) {
        // Log error but don't prevent template deletion
        console.error('Error deleting images from S3 during template deletion:', imageDeletionError);
      }

      // Delete the template from database
      await prisma.sizeChartTemplate.delete({
        where: { id, shop },
      });

      return { success: true };
    }

    if (intent === "assign-products") {
      const templateId = formData.get("templateId");
      const productIds = JSON.parse(formData.get("productIds") || "[]");

      // Get existing assignments for this template
      const existingAssignments = await prisma.sizeChartProductAssignment.findMany({
        where: { templateId, shop },
        select: { productId: true },
      });
      
      // Ensure all existing product IDs are strings for consistent comparison
      const existingProductIds = new Set(existingAssignments.map(a => String(a.productId)));
      
      // Extract numeric product IDs from Shopify GIDs
      const newProductIds = productIds.map((id) => {
        if (typeof id === 'string' && id.includes('/')) {
          return String(id.split('/').pop());
        }
        return String(id);
      });
      
      const newProductIdsSet = new Set(newProductIds);
      
      // Find products to add (in new list but not in existing)
      const productsToAdd = newProductIds.filter(id => !existingProductIds.has(id));
      
      // Find products to remove (in existing but not in new list)
      const productsToRemove = Array.from(existingProductIds).filter(id => !newProductIdsSet.has(id));
      
      // Remove assignments from this template
      if (productsToRemove.length > 0) {
        await prisma.sizeChartProductAssignment.deleteMany({
          where: {
            templateId,
            shop,
            productId: { in: productsToRemove },
          },
        });
      }
      
      // Check for products that already have assignments to OTHER templates of the SAME TYPE
      // Allow both table and custom templates on the same product
      let productsWithExistingAssignments = [];
      if (productsToAdd.length > 0) {
        // Get the current template to determine its type
        const currentTemplate = await prisma.sizeChartTemplate.findUnique({
          where: { id: templateId },
          select: { chartData: true },
        });
        
        // Parse chartData to check template type
        let currentChartData = {};
        if (currentTemplate?.chartData) {
          try {
            currentChartData = typeof currentTemplate.chartData === 'string' 
              ? JSON.parse(currentTemplate.chartData) 
              : currentTemplate.chartData;
          } catch (e) {
            console.error('Error parsing current template chartData:', e);
          }
        }
        const isCurrentTemplateMeasurement = currentChartData?.isMeasurementTemplate === true;
        
        // Get all existing assignments for these products
        const existingAssignments = await prisma.sizeChartProductAssignment.findMany({
          where: {
            shop,
            productId: { in: productsToAdd },
          },
          include: {
            SizeChartTemplate: {
              select: {
                id: true,
                name: true,
                chartData: true,
              },
            },
          },
        });

        // Filter to only same-type templates (table vs custom)
        const sameTypeTemplateIds = existingAssignments
          .filter(assignment => {
            const existingTemplate = assignment.SizeChartTemplate;
            if (!existingTemplate) return false;
            
            // Parse chartData to check template type
            let existingChartData = {};
            if (existingTemplate.chartData) {
              try {
                existingChartData = typeof existingTemplate.chartData === 'string' 
                  ? JSON.parse(existingTemplate.chartData) 
                  : existingTemplate.chartData;
              } catch (e) {
                console.error('Error parsing existing template chartData:', e);
              }
            }
            
            const isExistingMeasurement = existingChartData?.isMeasurementTemplate === true;
            return isExistingMeasurement === isCurrentTemplateMeasurement && String(existingTemplate.id) !== String(templateId);
          })
          .map(assignment => assignment.SizeChartTemplate.id);

        // Map existing assignments by product ID (only same type)
        for (const assignment of existingAssignments) {
          const productId = String(assignment.productId);
          const existingTemplate = assignment.SizeChartTemplate;
          if (existingTemplate && sameTypeTemplateIds.includes(existingTemplate.id)) {
            productsWithExistingAssignments.push({
              productId,
              productTitle: assignment.productTitle,
              previousTemplateId: existingTemplate.id,
              previousTemplateName: existingTemplate.name,
            });
          }
        }

        // Remove assignments from OTHER templates of the SAME TYPE only
        // This allows both table and custom templates on the same product
        if (sameTypeTemplateIds.length > 0) {
          await prisma.sizeChartProductAssignment.deleteMany({
            where: {
              shop,
              productId: { in: productsToAdd },
              templateId: { in: sameTypeTemplateIds }, // Remove only same-type templates
            },
          });
        }
      }
      
      // Get product details from Shopify for new assignments
      const { admin } = await authenticate.admin(request);
      
      // Create new assignments
      const assignments = [];
      for (const numericProductId of productsToAdd) {
        // Fetch product details to verify and get full ID
        const productResponse = await admin.graphql(
          `#graphql
            query getProduct($id: ID!) {
              product(id: $id) {
                id
                title
              }
            }`,
          {
            variables: {
              id: `gid://shopify/Product/${numericProductId}`,
            },
          },
        );

        const productJson = await productResponse.json();
        const product = productJson.data?.product;

        if (product) {
          // Extract the numeric ID from the full Shopify GID
          const shopifyProductId = product.id.split('/').pop();
          
          assignments.push({
            templateId,
            shop,
            productId: shopifyProductId, // Store the numeric ID as string
            productTitle: product.title,
          });
        }
      }

      if (assignments.length > 0) {
        await prisma.sizeChartProductAssignment.createMany({
          data: assignments,
        });
      }

      // Get the current template name for the warning message
      const currentTemplate = await prisma.sizeChartTemplate.findUnique({
        where: { id: templateId },
        select: { name: true },
      });

      return { 
        success: true, 
        assigned: assignments.length,
        removed: productsToRemove.length,
        productsWithExistingAssignments: productsWithExistingAssignments.length > 0 
          ? productsWithExistingAssignments.map(p => ({
              productId: p.productId,
              productTitle: p.productTitle,
              previousTemplateName: p.previousTemplateName,
              newTemplateName: currentTemplate?.name || 'Unknown',
            }))
          : [],
      };
    }

    return { success: false, error: "Invalid intent" };
  } catch (error) {
    console.error("Action error:", error);
    // Provide more detailed error messages
    let errorMessage = "An error occurred while processing your request.";
    
    if (error.code === "P2002") {
      errorMessage = "A template with this name already exists. Please choose a different name.";
    } else if (error.code === "P2025") {
      errorMessage = "The requested template was not found.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorDetails: process.env.NODE_ENV === "development" ? error.stack : undefined
    };
  }
};

export default function Templates() {
  const loaderData = useLoaderData();
  const { templates: initialTemplates, products: initialProducts, productTemplateMap: loaderProductTemplateMap = {} } = loaderData || {};
  
  // Use productTemplateMap from loaderData directly to ensure it's always up-to-date
  const productTemplateMap = loaderProductTemplateMap;
  const actionData = useActionData();
  const fetcher = useFetcher();
  const app = useAppBridge();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [sortBy, setSortBy] = useState("Date");
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [createChartOpen, setCreateChartOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [initialSelectedProducts, setInitialSelectedProducts] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [templateToView, setTemplateToView] = useState(null);
  const [showMeasurementGuideModal, setShowMeasurementGuideModal] = useState(false);
  const [selectedGuideField, setSelectedGuideField] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [assignmentJustCompleted, setAssignmentJustCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editCustomTemplateModalOpen, setEditCustomTemplateModalOpen] = useState(false);
  const [editingCustomTemplate, setEditingCustomTemplate] = useState(null);
  const [loadingCustomTemplate, setLoadingCustomTemplate] = useState(false);
  
  // Custom template editor state
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [customTemplateCategory, setCustomTemplateCategory] = useState("custom");
  const [customMeasurementFields, setCustomMeasurementFields] = useState([]);
  const [customFitPreferencesEnabled, setCustomFitPreferencesEnabled] = useState(false);
  const [customStitchingNotesEnabled, setCustomStitchingNotesEnabled] = useState(false);
  const [customEditingField, setCustomEditingField] = useState(null);
  const [customShowFieldDialog, setCustomShowFieldDialog] = useState(false);
  const [customNewField, setCustomNewField] = useState({
    name: "",
    description: "",
    unit: "in",
    required: false,
    min: 0,
    max: 100,
  });
  const [customDraggedFieldIndex, setCustomDraggedFieldIndex] = useState(null);
  const [customShowHowToMeasureDialog, setCustomShowHowToMeasureDialog] = useState(false);
  const [customEditingHowToMeasureField, setCustomEditingHowToMeasureField] = useState(null);
  const [customHowToMeasureData, setCustomHowToMeasureData] = useState({
    defaultDescription: "",
    customInstructions: "",
    guideImage: null,
    guideImageUrl: null,
  });
  const [customSnackbar, setCustomSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  // Use ref to track if we should close modal after assignment (first time only)
  const shouldCloseModalRef = useRef(false);
  // Track if this is the first assignment (no previous selections)
  const isFirstAssignmentRef = useRef(false);
  // Track the last processed response to avoid duplicate processing
  const lastProcessedResponseRef = useRef(null);
  // Store selected products when assignment is submitted to avoid stale closures
  const selectedProductsAtSubmitRef = useRef([]);
  // Track the last submitted intent to detect assign-products response
  const lastSubmittedIntentRef = useRef(null);
  // Track previous fetcher state to detect transitions
  const prevFetcherStateRef = useRef(null);

  // Parse templates with chartData
  const [templates, setTemplates] = useState(() => {
    if (!initialTemplates || !Array.isArray(initialTemplates)) {
      return [];
    }
    return initialTemplates.map((t) => ({
      ...t,
      chartData: typeof t.chartData === 'string' ? JSON.parse(t.chartData || '{}') : t.chartData,
    }));
  });
  const [products] = useState(initialProducts);

  // Debug logging - log what we receive from loader

  // Update templates when loader data changes (including after revalidation)
  useEffect(() => {
    // Handle undefined/null case
    if (!initialTemplates) {
      console.warn("[Templates Component] initialTemplates is undefined or null");
      return;
    }
    
    // If we got an empty array, set templates to empty
    if (Array.isArray(initialTemplates) && initialTemplates.length === 0) {
      setTemplates([]);
      return;
    }
    
    // Parse and update templates from loader data
    try {
      const parsedTemplates = initialTemplates.map((t) => ({
        ...t,
        chartData: typeof t.chartData === 'string' ? JSON.parse(t.chartData || '{}') : t.chartData,
      }));
      
      // Always update with loader data on refresh/revalidation
      // This ensures we have the latest data from the database
      setTemplates(parsedTemplates);
    } catch (error) {
      console.error("[Templates Component] Error parsing templates:", error);
    }
  }, [initialTemplates]);

  // Handle action responses
  useEffect(() => {
    // Use fetcher.data primarily (useFetcher provides data here)
    const responseData = fetcher.data || actionData;
    
    // Check if this is an assign-products operation using tracked intent
    const isAssignProducts = lastSubmittedIntentRef.current === "assign-products";
    
    // Detect transition from submitting/loading to idle (operation just completed)
    const justCompleted = prevFetcherStateRef.current === "submitting" && fetcher.state === "idle";
    const wasLoading = prevFetcherStateRef.current === "loading" && fetcher.state === "idle";
    const isJustCompleted = justCompleted || wasLoading;
    
    // Update previous state
    prevFetcherStateRef.current = fetcher.state;
    
    // Only process when fetcher just completed (transitioned to idle) and we have response data for assign-products
    if (isJustCompleted && fetcher.state === "idle" && responseData && isAssignProducts) {
      // Create a unique key for this response to avoid duplicate processing
      const responseKey = responseData ? JSON.stringify(responseData) : null;
      const alreadyProcessed = responseKey && lastProcessedResponseRef.current === responseKey;
      
      if (!alreadyProcessed) {
        // Mark this response as processed
        lastProcessedResponseRef.current = responseKey;
        
        // Check for success (handle both boolean true and string "true")
        const isSuccess = responseData.success === true || responseData.success === "true";
        
        if (isSuccess && shouldCloseModalRef.current) {
          // Assignment successful - show toast notification
          if (app?.toast?.show) {
            const assigned = responseData.assigned || 0;
            const removed = responseData.removed || 0;
            const productsWithExistingAssignments = responseData.productsWithExistingAssignments || [];
            
            // Show warning if products had existing assignments
            if (productsWithExistingAssignments.length > 0) {
              const productList = productsWithExistingAssignments
                .slice(0, 3)
                .map(p => `${p.productTitle} (was: ${p.previousTemplateName})`)
                .join(", ");
              const moreText = productsWithExistingAssignments.length > 3 
                ? ` and ${productsWithExistingAssignments.length - 3} more` 
                : "";
              
              const warningMessage = `⚠️ Warning: ${productsWithExistingAssignments.length} product${productsWithExistingAssignments.length > 1 ? 's' : ''} already had template${productsWithExistingAssignments.length > 1 ? 's' : ''} assigned and ${productsWithExistingAssignments.length > 1 ? 'were' : 'was'} reassigned to "${productsWithExistingAssignments[0].newTemplateName}". ${productList}${moreText}`;
              
              // Show warning toast first
              app.toast.show(warningMessage);
              
              // Add a small delay before showing success message so both messages are visible
              setTimeout(() => {
                // Show success message
                if (assigned > 0 && removed > 0) {
                  app.toast.show(`Template updated: ${assigned} products assigned, ${removed} removed.`);
                } else if (assigned > 0) {
                  app.toast.show(`Template assigned to ${assigned} product${assigned > 1 ? 's' : ''}!`);
                } else if (removed > 0) {
                  app.toast.show(`${removed} product assignment${removed > 1 ? 's' : ''} removed.`);
                } else {
                  app.toast.show("Product assignments updated.");
                }
              }, 1500);
            } else {
              // Show success message immediately if no warnings
              if (assigned > 0 && removed > 0) {
                app.toast.show(`Template updated: ${assigned} products assigned, ${removed} removed.`);
              } else if (assigned > 0) {
                app.toast.show(`Template assigned to ${assigned} product${assigned > 1 ? 's' : ''}!`);
              } else if (removed > 0) {
                app.toast.show(`${removed} product assignment${removed > 1 ? 's' : ''} removed.`);
              } else {
                app.toast.show("Product assignments updated.");
              }
            }
          }
          
          // Revalidate to get updated data
          revalidator.revalidate();
          
          // If this is the first assignment, close the modal
          if (isFirstAssignmentRef.current) {
            // Reset flags first
            shouldCloseModalRef.current = false;
            isFirstAssignmentRef.current = false;
            lastSubmittedIntentRef.current = null;
            
            // Close modal and reset state immediately
            setAssignModalOpen(false);
            setSelectedTemplate(null);
            setSelectedProducts([]);
            setInitialSelectedProducts([]);
            setProductSearchQuery("");
            setAssignmentJustCompleted(false);
          } else {
            // Not first assignment - keep modal open, disable button until changes are made
            // Update initial selection to the selection at submit time (so button stays disabled until user makes changes)
            setInitialSelectedProducts([...selectedProductsAtSubmitRef.current]);
            setAssignmentJustCompleted(true); // Disable button after assignment
            shouldCloseModalRef.current = false; // Reset flag
            lastSubmittedIntentRef.current = null; // Reset intent
          }
        } else if (!isSuccess) {
          // Handle errors - keep modal open on error
          shouldCloseModalRef.current = false; // Reset flag
          setAssignmentJustCompleted(false); // Re-enable button on error
          lastSubmittedIntentRef.current = null; // Reset intent
          if (app?.toast?.show) {
            app.toast.show(responseData.error || "Failed to assign products. Please try again.");
          }
          // Don't close modal on error - user can retry
        }
      }
    } else if (isJustCompleted && fetcher.state === "idle" && !isAssignProducts && lastSubmittedIntentRef.current) {
      // Handle other intents (create, update, toggle-active, delete)
      const intent = lastSubmittedIntentRef.current;
      
      // For delete operations, include template ID in responseKey to make it unique
      let responseKey;
      if (intent === "delete") {
        const templateId = fetcher.formData?.get("id");
        responseKey = responseData 
          ? `delete-${templateId}-${JSON.stringify(responseData)}` 
          : `delete-${templateId}-${Date.now()}`;
      } else {
        responseKey = responseData ? JSON.stringify(responseData) : `intent-${intent}-${Date.now()}`;
      }
      
      // Only process if we haven't seen this response before
      if (lastProcessedResponseRef.current !== responseKey) {
        lastProcessedResponseRef.current = responseKey;
        
        // Check for success (handle both boolean true and string "true", or if responseData exists)
        const isSuccess = responseData ? (responseData.success === true || responseData.success === "true") : true;
        
        if (isSuccess) {
          if (intent === "create") {
            if (app?.toast?.show) {
              app.toast.show("Template created successfully!");
            }
            
            // Add the new template from the response directly
            if (responseData?.template) {
              const newTemplate = {
                ...responseData.template,
                chartData: typeof responseData.template.chartData === 'string' 
                  ? JSON.parse(responseData.template.chartData || '{}') 
                  : responseData.template.chartData,
                productAssignments: responseData.template.productAssignments || [],
              };
              // Add to the beginning of the list
              setTemplates(prev => {
                // Check if template already exists to avoid duplicates
                const exists = prev.some(t => t.id === newTemplate.id);
                if (exists) {
                  return prev;
                }
                return [newTemplate, ...prev];
              });
            }
            
            // Close the create chart modal
            setCreateChartOpen(false);
            setEditingTemplate(null);
            
            // Revalidate to sync with database, but don't let it overwrite our optimistic update
            setTimeout(() => {
              revalidator.revalidate();
            }, 500);
          } else if (intent === "update") {
            if (app?.toast?.show) {
              app.toast.show("Template updated successfully!");
            }
            // Close the create chart modal
            setCreateChartOpen(false);
            setEditingTemplate(null);
            revalidator.revalidate();
          } else if (intent === "toggle-active") {
            // Get the template to show appropriate message
            const templateId = fetcher.formData?.get("id");
            const template = templates.find(t => t.id === templateId);
            const isActive = fetcher.formData?.get("active") === "true";
            if (app?.toast?.show) {
              app.toast.show(
                isActive 
                  ? `Template "${template?.name || 'Template'}" has been activated!`
                  : `Template "${template?.name || 'Template'}" has been deactivated!`
              );
            }
            revalidator.revalidate();
          } else if (intent === "delete") {
            if (responseData && responseData.success === true) {
              if (app?.toast?.show) {
                app.toast.show("Template deleted successfully!");
              }
              // Close modal on success
              setDeleteModalOpen(false);
              setTemplateToDelete(null);
              revalidator.revalidate();
            } else if (responseData && responseData.error) {
              // Show error message if deletion failed
              if (app?.toast?.show) {
                app.toast.show(responseData.error, { isError: true });
              }
              // Keep modal open so user can see the error
              // Modal stays open to show error message
            }
          }
          lastSubmittedIntentRef.current = null;
        } else if (!isSuccess) {
          // Handle errors for create/update
          if (intent === "create" || intent === "update") {
            if (app?.toast?.show && responseData?.error) {
              app.toast.show(responseData.error || "Failed to save template. Please try again.", { isError: true });
            }
            // Keep modal open on error so user can retry
          }
          lastSubmittedIntentRef.current = null;
        }
      }
    }
  }, [actionData, fetcher.state, fetcher.data, fetcher.formData, app, revalidator]);

  // Separate templates into table templates and custom measurement templates
  const { tableTemplates, customTemplates } = useMemo(() => {
    const table = templates.filter((template) => {
      const chartData = template.chartData || {};
      return !chartData.isMeasurementTemplate;
    });
    
    const custom = templates.filter((template) => {
      const chartData = template.chartData || {};
      return chartData.isMeasurementTemplate === true;
    });
    
    return { tableTemplates: table, customTemplates: custom };
  }, [templates]);

  // Filter and sort templates based on active tab
  const filteredTemplates = useMemo(() => {
    // Select templates based on active tab
    let filtered = activeTab === 0 ? tableTemplates : customTemplates;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => {
        return (
          template.id.toString().includes(query) ||
          template.name.toLowerCase().includes(query) ||
          (template.gender && template.gender.toLowerCase().includes(query)) ||
          (template.category && template.category.toLowerCase().includes(query))
        );
      });
    }
    
    // Apply gender filter
    if (genderFilter && genderFilter !== "All") {
      filtered = filtered.filter((template) => {
        const templateGender = template.gender?.toLowerCase() || "unisex";
        return templateGender === genderFilter.toLowerCase();
      });
    }
    
    // Apply active filter
    if (activeFilter && activeFilter !== "All") {
      filtered = filtered.filter((template) => {
        if (activeFilter === "Active") {
          return template.active === true;
        } else if (activeFilter === "Inactive") {
          return template.active === false;
        }
        return true;
      });
    }
    
    // Apply sorting - only Date sorting available
    const sorted = [...filtered].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return sorted;
  }, [tableTemplates, customTemplates, activeTab, searchQuery, genderFilter, activeFilter, sortBy]);

  const handleView = useCallback((templateId) => {
    const template = templates.find((t) => t.id === templateId);
    setTemplateToView(template);
    setViewModalOpen(true);
  }, [templates]);

  const handleCloseViewModal = useCallback(() => {
    setViewModalOpen(false);
    setTemplateToView(null);
  }, []);

  const handleEdit = useCallback(async (templateId) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const chartData = template.chartData || {};
      // Check if it's a custom measurement template
      if (chartData.isMeasurementTemplate === true) {
        // Open modal and load template data
        setEditingCustomTemplate(template);
        setLoadingCustomTemplate(true);
        setEditCustomTemplateModalOpen(true);
        
        try {
          const response = await fetch(`/api/measurement-template?id=${templateId}`);
          if (response.ok) {
            const data = await response.json();
            const templateData = data.template;
            setCustomTemplateName(templateData.name || "");
            setCustomTemplateCategory(templateData.category || "custom");
            setCustomMeasurementFields(templateData.measurementFields || []);
            setCustomFitPreferencesEnabled(templateData.fitPreferencesEnabled || false);
            setCustomStitchingNotesEnabled(templateData.stitchingNotesEnabled || false);
          } else {
            // Fallback to chartData
            setCustomTemplateName(template.name || "");
            setCustomTemplateCategory(chartData.category || "custom");
            setCustomMeasurementFields(chartData.measurementFields || []);
            setCustomFitPreferencesEnabled(chartData.fitPreferencesEnabled || false);
            setCustomStitchingNotesEnabled(chartData.stitchingNotesEnabled || false);
          }
        } catch (error) {
          console.error("Error loading custom template:", error);
          // Fallback to chartData
          setCustomTemplateName(template.name || "");
          setCustomTemplateCategory(chartData.category || "custom");
          setCustomMeasurementFields(chartData.measurementFields || []);
          setCustomFitPreferencesEnabled(chartData.fitPreferencesEnabled || false);
          setCustomStitchingNotesEnabled(chartData.stitchingNotesEnabled || false);
        } finally {
          setLoadingCustomTemplate(false);
        }
      } else {
        // Regular table template
        setEditingTemplate(template);
        setCreateChartOpen(true);
      }
    }
  }, [templates]);

  const handleDelete = useCallback((templateId) => {
    const template = templates.find((t) => t.id === templateId);
    const assignmentCount = template?.productAssignments?.length || 0;
    setTemplateToDelete({ 
      id: templateId, 
      name: template?.name || "this template",
      assignmentCount: assignmentCount,
      hasAssignments: assignmentCount > 0
    });
    // Reset response tracking when opening delete modal to ensure each delete is processed
    lastProcessedResponseRef.current = null;
    setDeleteModalOpen(true);
  }, [templates]);

  const handleConfirmDelete = useCallback(() => {
    if (templateToDelete && !templateToDelete.hasAssignments) {
      lastSubmittedIntentRef.current = "delete";
      fetcher.submit(
        {
          intent: "delete",
          id: templateToDelete.id,
        },
        { method: "post" }
      );
      // Don't close modal immediately - wait for response
      // Modal will close on success, stay open on error
    }
  }, [templateToDelete, fetcher]);

  const handleCancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setTemplateToDelete(null);
  }, []);

  const handleToggleActive = useCallback((templateId) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      fetcher.submit(
        {
          intent: "toggle-active",
          id: templateId,
          active: (!template.active).toString(),
        },
        { method: "post" }
      );
    }
  }, [templates, fetcher]);

  const handleCreateChart = useCallback(() => {
    if (activeTab === 1) {
      // Navigate to custom size page for custom templates
      navigate("/app/custom-size");
    } else {
      // Open create chart modal for table templates
      setEditingTemplate(null);
      setCreateChartOpen(true);
    }
  }, [activeTab, navigate]);

  const handleChartSaved = useCallback(async (chartData, measurementFile = null) => {
    // Check if we're editing or creating
    const isEditing = editingTemplate !== null;
    const intent = isEditing ? "update" : "create";
    
    // Validate required data
    if (!chartData) {
      throw new Error("Chart data is missing");
    }
    
    if (!chartData.gender && !isEditing) {
      throw new Error("Gender is required");
    }
    
    // Track intent for response handling
    lastSubmittedIntentRef.current = intent;
    
    try {
      // Create FormData to support file uploads
      const formData = new FormData();
      formData.append("intent", intent);
      if (isEditing) {
        formData.append("id", editingTemplate.id);
      }
      formData.append("name", chartData.chartName || (isEditing ? editingTemplate.name : `Chart ${templates.length + 1}`));
      formData.append("gender", chartData.gender || (isEditing ? editingTemplate.gender : "unisex"));
      formData.append("category", chartData.category || (isEditing ? editingTemplate.category : null) || "");
      formData.append("description", chartData.description || (isEditing ? editingTemplate.description : null) || "");
      formData.append("chartData", JSON.stringify(chartData));
      
      // Append measurement file if provided
      if (measurementFile instanceof File) {
        formData.append("measurementFile", measurementFile);
      }
      
      fetcher.submit(
        formData,
        { method: "post", encType: "multipart/form-data" }
      );
    } catch (error) {
      console.error("Error submitting chart data:", error);
      throw error;
    }
    
    // Wait for the fetcher to complete by polling its state
    // The modal will be closed by the useEffect when the response is received
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = 200; // Maximum 20 seconds (200 * 100ms)
      let wasSubmitting = false;
      
      const checkFetcher = () => {
        checkCount++;
        const currentState = fetcher.state;
        
        // Track if we've seen submitting state
        if (currentState === "submitting" || currentState === "loading") {
          wasSubmitting = true;
        }
        
        // If fetcher transitioned from submitting/loading to idle, it's done
        // Check for errors in the response
        if (wasSubmitting && currentState === "idle" && checkCount > 3) {
          // Check if there's an error in the response
          const responseData = fetcher.data || actionData;
          if (responseData && responseData.error && !responseData.success) {
            reject(new Error(responseData.error));
            return;
          }
          
          // Give a small delay to let useEffect process the response
          setTimeout(() => {
            resolve();
          }, 500);
          return;
        }
        
        // If we've exceeded max checks, check for errors before resolving
        if (checkCount >= maxChecks) {
          const responseData = fetcher.data || actionData;
          if (responseData && responseData.error && !responseData.success) {
            reject(new Error(responseData.error || "Request timed out"));
          } else {
            resolve();
          }
          return;
        }
        
        // Continue checking
        setTimeout(checkFetcher, 100);
      };
      
      // Start checking after a brief delay to let fetcher state update
      setTimeout(checkFetcher, 150);
    });
  }, [editingTemplate, templates, fetcher, actionData]);

  const handleAssignTemplate = useCallback((templateId) => {
    setSelectedTemplate(templateId);
    setProductSearchQuery("");
    setAssignmentJustCompleted(false); // Reset assignment completed state
    // Force revalidation to get latest product assignments
    revalidator.revalidate();
    
    // Find the template and get its existing assignments
    const template = templates.find(t => t.id === templateId);
    let assignedProductIds = [];
    
    if (template && template.productAssignments && template.productAssignments.length > 0) {
      // Map existing product assignments to Shopify product IDs
      assignedProductIds = template.productAssignments.map(assignment => {
        // Find the product by matching the productId (both as strings for consistency)
        const product = products.find(p => {
          const productId = String(p.id.split("/").pop());
          return productId === String(assignment.productId);
        });
        return product ? product.id : null;
      }).filter(Boolean);
    }
    
    // Set both current and initial selection (for comparison)
    setSelectedProducts(assignedProductIds);
    setInitialSelectedProducts([...assignedProductIds]); // Store initial state
    
    // Track if this is the first assignment (no previous selections)
    isFirstAssignmentRef.current = assignedProductIds.length === 0;
    
    // Loaded existing assignments
    
    setAssignModalOpen(true);
  }, [templates, products]);

  const handleCloseAssignModal = useCallback(() => {
    setAssignModalOpen(false);
    setSelectedTemplate(null);
    setSelectedProducts([]);
    setInitialSelectedProducts([]);
    setProductSearchQuery("");
    setAssignmentJustCompleted(false);
    shouldCloseModalRef.current = false; // Reset flag
    isFirstAssignmentRef.current = false; // Reset flag
    lastProcessedResponseRef.current = null; // Reset response tracking
    selectedProductsAtSubmitRef.current = []; // Reset selected products ref
    lastSubmittedIntentRef.current = null; // Reset intent tracking
  }, []);

  // Memoize filtered products to avoid recalculating on every render
  // Must be defined before handlers that use it
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery) return products;
    const query = productSearchQuery.toLowerCase();
    return products.filter((product) => {
      const productId = product.id.split("/").pop();
      return (
        product.title.toLowerCase().includes(query) ||
        productId.includes(query) ||
        (product.handle && product.handle.toLowerCase().includes(query))
      );
    });
  }, [products, productSearchQuery]);

  const handleToggleProduct = useCallback((productId) => {
    setSelectedProducts((prev) => {
      // Ensure we're comparing the same format
      const productIdStr = String(productId);
      const isSelected = prev.some(id => String(id) === productIdStr);
      
      if (isSelected) {
        return prev.filter((id) => String(id) !== productIdStr);
      } else {
        return [...prev, productId];
      }
    });
    // Re-enable button when user makes changes
    setAssignmentJustCompleted(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedProducts((prev) => {
      const allSelected = filteredProducts.every(product => 
        prev.some(id => String(id) === String(product.id))
      );
      
      if (allSelected && filteredProducts.length > 0) {
        // Deselect all filtered products
        return prev.filter(id => !filteredProducts.some(p => String(p.id) === String(id)));
      } else {
        // Select all filtered products (add to existing selection)
        const newSelections = filteredProducts
          .filter(product => !prev.some(id => String(id) === String(product.id)))
          .map(p => p.id);
        return [...prev, ...newSelections];
      }
    });
    // Re-enable button when user makes changes
    setAssignmentJustCompleted(false);
  }, [filteredProducts]);

  // Memoize selection change check to avoid recalculating on every render
  const hasSelectionChanged = useMemo(() => {
    if (selectedProducts.length !== initialSelectedProducts.length) {
      return true;
    }
    
    // Check if all selected products are in initial selection
    const currentSet = new Set(selectedProducts.map(id => String(id)));
    const initialSet = new Set(initialSelectedProducts.map(id => String(id)));
    
    // Compare sets
    if (currentSet.size !== initialSet.size) {
      return true;
    }
    
    for (const id of currentSet) {
      if (!initialSet.has(id)) {
        return true;
      }
    }
    
    return false;
  }, [selectedProducts, initialSelectedProducts]);

  const handleApplyNameChange = useCallback((templateId) => {
    if (editingTemplateName.trim()) {
      const template = templates.find(t => t.id === templateId);
      fetcher.submit(
        {
          intent: "update",
          id: templateId,
          name: editingTemplateName.trim(),
          gender: template?.gender || "unisex",
          category: template?.category || null,
          description: template?.description || null,
          chartData: JSON.stringify(template?.chartData || {}),
        },
        { method: "post" }
      );
      setEditingTemplateId(null);
      setEditingTemplateName("");
    }
  }, [editingTemplateName, templates, fetcher]);

  const handleAssignProducts = useCallback(() => {
    if (selectedTemplate) {
      // Extract product IDs from Shopify product IDs (gid://shopify/Product/123456)
      // Keep full IDs for submission - the action will extract numeric IDs
      const productIds = selectedProducts.map((productId) => {
        return productId; // Keep full Shopify GID
      });

      // Store current selection in ref to avoid stale closures
      selectedProductsAtSubmitRef.current = [...selectedProducts];
      
      // Track the intent being submitted
      lastSubmittedIntentRef.current = "assign-products";

      // Set flag to close modal on success
      shouldCloseModalRef.current = true;

      fetcher.submit(
        {
          intent: "assign-products",
          templateId: selectedTemplate,
          productIds: JSON.stringify(productIds),
        },
        { method: "post" }
      );
    }
    // Don't close modal here - wait for response
   
  }, [selectedTemplate, selectedProducts, fetcher]);

  return (
    <>
      <s-page heading="Size charts" style={fullWidthStyle} />
      <div className="w-full max-w-full px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6" style={{ ...fullWidthStyle }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "15px",
                minHeight: 48,
                "&.Mui-selected": {
                  color: "#111827",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#111827",
                height: 3,
              },
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>Table Templates</span>
                  <Chip 
                    label={tableTemplates.length} 
                    size="small" 
                    sx={{ 
                      height: 20, 
                      fontSize: "0.7rem",
                      bgcolor: activeTab === 0 ? "#e5e7eb" : "#f3f4f6",
                    }} 
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>Custom Templates</span>
                  <Chip 
                    label={customTemplates.length} 
                    size="small" 
                    sx={{ 
                      height: 20, 
                      fontSize: "0.7rem",
                      bgcolor: activeTab === 1 ? "#e5e7eb" : "#f3f4f6",
                    }} 
                  />
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <TextField
              fullWidth
              placeholder="Search templates by name, gender, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size="small"
              className="w-full sm:flex-1"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#6d7175', fontSize: '20px' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery("")}
                      sx={{ 
                        padding: '4px',
                        '&:hover': {
                          backgroundColor: '#f3f4f6',
                        },
                      }}
                    >
                      <ClearIcon sx={{ fontSize: '18px', color: '#6d7175' }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '14px',
                  color: '#202223',
                  backgroundColor: '#fafbfb',
                  borderRadius: '8px',
                  '& fieldset': {
                    borderColor: '#e1e3e5',
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#c9cccf',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3b82f6',
                    borderWidth: '2px',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '11px 14px',
                },
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterListIcon sx={{ fontSize: '18px' }} />}
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              sx={{
                textTransform: 'none',
                backgroundColor: filterMenuAnchor ? '#eff6ff' : '#ffffff',
                color: filterMenuAnchor ? '#3b82f6' : '#6b7280',
                borderColor: filterMenuAnchor ? '#3b82f6' : '#e5e7eb',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                minWidth: { xs: '100%', sm: 'auto' },
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#eff6ff',
                  borderColor: '#3b82f6',
                  color: '#3b82f6',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                },
              }}
            >
              Filters
            </Button>
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={() => setFilterMenuAnchor(null)}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: '500px',
                  maxWidth: '600px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  padding: '16px',
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {/* Header with Filters title and Clear All button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                  Filters
                </Typography>
                {(genderFilter !== null || activeFilter !== null || searchQuery) && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setGenderFilter(null);
                      setActiveFilter(null);
                      setSearchQuery("");
                    }}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: '#6b7280',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color: '#111827',
                      },
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </Box>

              {/* All Filters in one row: All, Gender (for table templates), and Status */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                {/* All button - first */}
                <Chip
                  label="All"
                  onClick={() => {
                    setGenderFilter(null);
                    setActiveFilter(null);
                  }}
                  variant={(genderFilter === null && activeFilter === null) ? "filled" : "outlined"}
                  sx={{
                    backgroundColor: (genderFilter === null && activeFilter === null) ? '#111827' : '#ffffff',
                    color: (genderFilter === null && activeFilter === null) ? '#ffffff' : '#6b7280',
                    borderColor: (genderFilter === null && activeFilter === null) ? '#111827' : '#e5e7eb',
                    fontWeight: 600,
                    fontSize: '13px',
                    '&:hover': {
                      backgroundColor: (genderFilter === null && activeFilter === null) ? '#111827' : '#f3f4f6',
                    },
                  }}
                />
                
                {/* Gender Filter (only for table templates) */}
                {activeTab === 0 && (
                  <>
                    <Chip
                      label="Male"
                      onClick={() => {
                        setGenderFilter(genderFilter === "Male" ? null : "Male");
                        setActiveFilter(null);
                      }}
                      variant={genderFilter === "Male" ? "filled" : "outlined"}
                      sx={{
                        backgroundColor: genderFilter === "Male" ? '#111827' : '#ffffff',
                        color: genderFilter === "Male" ? '#ffffff' : '#6b7280',
                        borderColor: genderFilter === "Male" ? '#111827' : '#e5e7eb',
                        fontWeight: 600,
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: genderFilter === "Male" ? '#111827' : '#f3f4f6',
                        },
                      }}
                    />
                    <Chip
                      label="Female"
                      onClick={() => {
                        setGenderFilter(genderFilter === "Female" ? null : "Female");
                        setActiveFilter(null);
                      }}
                      variant={genderFilter === "Female" ? "filled" : "outlined"}
                      sx={{
                        backgroundColor: genderFilter === "Female" ? '#111827' : '#ffffff',
                        color: genderFilter === "Female" ? '#ffffff' : '#6b7280',
                        borderColor: genderFilter === "Female" ? '#111827' : '#e5e7eb',
                        fontWeight: 600,
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: genderFilter === "Female" ? '#111827' : '#f3f4f6',
                        },
                      }}
                    />
                  </>
                )}
                
                {/* Status Filter */}
                {["Active", "Inactive"].map((status) => {
                  const isSelected = activeFilter === status;
                  
                  return (
                    <Chip
                      key={status}
                      label={status}
                      onClick={() => {
                        setActiveFilter(activeFilter === status ? null : status);
                        setGenderFilter(null);
                      }}
                      variant={isSelected ? "filled" : "outlined"}
                      sx={{
                        backgroundColor: isSelected ? '#111827' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#6b7280',
                        borderColor: isSelected ? '#111827' : '#e5e7eb',
                        fontWeight: 600,
                        fontSize: '13px',
                        '&:hover': {
                          backgroundColor: isSelected ? '#111827' : '#f3f4f6',
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Menu>
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: '18px' }} />}
              onClick={handleCreateChart}
              sx={{
                textTransform: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                fontSize: '14px',
                padding: '10px 24px',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease',
                minWidth: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {activeTab === 0 ? "Create Table Template" : "Create Custom Template"}
            </Button>
          </div>


        </div>

        {/* Templates Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-xl border border-[#e1e3e5] bg-white shadow-lg">
          <table className="w-full border-separate border-spacing-0 min-w-[640px]" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr className="bg-gradient-to-r from-[#f9fafb] via-[#f6f6f7] to-[#f9fafb]">
                <th className="py-5 px-6 text-left font-bold text-xs text-[#111827] border-b-2 border-[#e5e7eb] first:rounded-tl-xl uppercase tracking-wider" style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                  Name
                </th>
                <th className="py-5 px-6 text-center font-bold text-xs text-[#111827] border-b-2 border-[#e5e7eb] uppercase tracking-wider" style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                  Date Created
                </th>
                {activeTab === 0 && (
                  <th className="py-5 px-6 text-center font-bold text-xs text-[#111827] border-b-2 border-[#e5e7eb] uppercase tracking-wider" style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                    Gender
                  </th>
                )}
                {activeTab === 1 && (
                  <th className="py-5 px-6 text-center font-bold text-xs text-[#111827] border-b-2 border-[#e5e7eb] uppercase tracking-wider" style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                    Category
                  </th>
                )}
                <th className="py-5 px-6 text-center font-bold text-xs text-[#111827] border-b-2 border-[#e5e7eb] uppercase tracking-wider" style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                  Status
                </th>
                <th className="py-5 px-6 text-right font-bold text-xs text-[#111827] border-b-2 border-[#e5e7eb] last:rounded-tr-xl uppercase tracking-wider" style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 0 ? "5" : "5"} className="p-12 sm:p-16 bg-white">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Box
                        sx={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          backgroundColor: '#f6f6f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '16px',
                        }}
                      >
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ color: '#6d7175' }}
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#202223',
                          marginBottom: '8px',
                        }}
                      >
                        {activeTab === 0 
                          ? (tableTemplates.length === 0 
                              ? "No table templates created yet"
                              : "No table templates found")
                          : (customTemplates.length === 0 
                              ? "No custom templates created yet"
                              : "No custom templates found")}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '14px',
                          color: '#6d7175',
                          marginBottom: '24px',
                          maxWidth: '400px',
                        }}
                      >
                        {activeTab === 0 
                          ? (tableTemplates.length === 0 
                              ? "Get started by creating your first size chart template. Click the button above to begin."
                              : "Try adjusting your search terms to find what you're looking for.")
                          : (customTemplates.length === 0 
                              ? "Get started by creating your first custom measurement template. Click the button above to begin."
                              : "Try adjusting your search terms to find what you're looking for.")}
                      </Typography>
                      {(activeTab === 0 ? tableTemplates.length === 0 : customTemplates.length === 0) && (
                        <Button
                          variant="contained"
                          onClick={handleCreateChart}
                          sx={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            color: '#3b82f6',
                            textTransform: 'none',
                            fontSize: '14px',
                            padding: '10px 24px',
                            fontFamily: '"Poppins", sans-serif',
                            fontWeight: 500,
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.15)',
                            '&:hover': {
                              background: 'rgba(59, 130, 246, 0.3)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              boxShadow: '0 8px 32px 0 rgba(59, 130, 246, 0.25)',
                            },
                          }}
                        >
                          + Create Chart
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="bg-white border-b border-[#e5e7eb] hover:bg-gradient-to-r hover:from-[#f9fafb] hover:to-[#f3f4f6] transition-all duration-200 group"
                  >
                    {/* Name Column */}
                    <td className="p-5 text-sm font-semibold text-[#111827] group-hover:text-[#3b82f6] transition-colors">
                      <span>
                        {template.name}
                      </span>
                    </td>

                    {/* Date Column */}
                    <td className="p-5 text-sm text-[#6b7280] text-center">
                      {formatDateTime(template.createdAt)}
                    </td>

                    {/* Gender/Category Column */}
                    {activeTab === 0 ? (
                      <td className="p-5 text-center">
                        <span className={`inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold ${
                          template.gender?.toLowerCase() === 'male' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : template.gender?.toLowerCase() === 'female'
                            ? 'bg-pink-50 text-pink-700 border border-pink-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {template.gender ? template.gender.charAt(0).toUpperCase() + template.gender.slice(1) : "Unisex"}
                        </span>
                      </td>
                    ) : (
                      <td className="p-5 text-center">
                        <span className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">
                          {template.chartData?.category ? 
                            template.chartData.category.charAt(0).toUpperCase() + template.chartData.category.slice(1).replace(/_/g, ' ') 
                            : "Custom"}
                        </span>
                      </td>
                    )}

                    {/* Active Column */}
                    <td className="p-5 text-center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Switch
                          checked={template.active || false}
                          onChange={() => handleToggleActive(template.id)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#10b981',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#10b981',
                            },
                          }}
                        />
                        <span className={`text-xs font-semibold ${
                          template.active ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {template.active ? 'Active' : 'Inactive'}
                        </span>
                      </Box>
                    </td>

                    {/* Actions Column */}
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2 sm:gap-3">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleView(template.id)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '13px',
                            padding: '6px 16px',
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7',
                            border: 'none',
                            boxShadow: 'none',
                            minWidth: 'auto',
                            '&:hover': {
                              backgroundColor: '#bae6fd',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon sx={{ fontSize: '16px' }} />}
                          onClick={() => handleEdit(template.id)}
                          sx={{
                            textTransform: 'none',
                            backgroundColor: '#ffffff',
                            color: '#6b7280',
                            borderColor: '#e5e7eb',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            minWidth: 'auto',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: '#ffffff',
                              borderColor: '#e5e7eb',
                              color: '#6b7280',
                            },
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<LinkIcon sx={{ fontSize: '16px' }} />}
                          onClick={() => handleAssignTemplate(template.id)}
                          sx={{
                            textTransform: 'none',
                            backgroundColor: '#ffffff',
                            color: '#6b7280',
                            borderColor: '#e5e7eb',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            minWidth: 'auto',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: '#ffffff',
                              borderColor: '#e5e7eb',
                              color: '#6b7280',
                            },
                          }}
                        >
                          Assign
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(template.id)}
                          sx={{
                            color: '#dc2626',
                            fontSize: '18px',
                            padding: '6px',
                            '&:hover': {
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                            },
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-trash-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7h16" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /><path d="M10 12l4 4m0 -4l-4 4" /></svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <CreateChart 
        open={createChartOpen} 
        onClose={() => {
          setCreateChartOpen(false);
          setEditingTemplate(null); // Reset editing state when closing
        }}
        onSave={handleChartSaved}
        initialData={editingTemplate}
      />

      {/* Assign Template Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={(event, reason) => {
          // Prevent closing during loading/submitting
          if (fetcher.state === "submitting" || fetcher.state === "loading") {
            return;
          }
          // Prevent closing if there's a pending assign-products operation
          if (fetcher.formData?.get("intent") === "assign-products" && fetcher.state !== "idle") {
            return;
          }
          handleCloseAssignModal();
        }}
        disableEscapeKeyDown={fetcher.state === "submitting" || fetcher.state === "loading"}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            minHeight: '90vh',
            position: 'relative',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          },
        }}
        BackdropProps={{
          onClick: (e) => {
            // Prevent closing on backdrop click during loading/submitting
            if (fetcher.state === "submitting" || fetcher.state === "loading") {
              e.stopPropagation();
              return;
            }
            if (fetcher.formData?.get("intent") === "assign-products" && fetcher.state !== "idle") {
              e.stopPropagation();
              return;
            }
          },
        }}
      >
        {/* Loading Overlay */}
        {(fetcher.state === "submitting" || fetcher.state === "loading") && (
          <Backdrop
            open={true}
            sx={{
              position: 'absolute',
              zIndex: (theme) => theme.zIndex.modal + 1,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(4px)',
              borderRadius: '12px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={48} sx={{ color: '#3b82f6' }} />
              <Typography sx={{ color: '#202223', fontSize: '15px', fontWeight: 600 }}>
                Assigning products...
              </Typography>
            </Box>
          </Backdrop>
        )}
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(to right, #f9fafb, #ffffff)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              }}
            >
              <LinkIcon sx={{ color: '#ffffff', fontSize: '20px' }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: '20px',
                  fontWeight: 700,
                  
                  color: '#111827',
                  letterSpacing: '-0.02em',
                  marginBottom: '2px',
                }}
              >
                Assign Template to Products
              </Typography>
              <Typography
                sx={{
                  fontSize: '13px',
                  color: '#6b7280',
                  fontWeight: 400,
                }}
              >
                Select products to assign this size chart template{(() => {
                  const template = templates.find(t => t.id === selectedTemplate);
                  return template?.name ? ` "${template.name}"` : '';
                })()}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleCloseAssignModal}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              color: '#6b7280',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#f3f4f6',
                color: '#111827',
                transform: 'rotate(90deg)',
              },
              '&:disabled': {
                color: '#d1d5db',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* Search Bar */}
          <TextField
            fullWidth
            style={{ marginTop: '20px',marginBottom: '20px' }}
            placeholder="Search by product name, ID, or handle..."
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
            variant="outlined"
            size="medium"
            sx={{
            
              '& .MuiOutlinedInput-root': {
                fontSize: '14px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s',
                '& fieldset': {
                  borderColor: '#e5e7eb',
                  borderWidth: '1.5px',
                },
                '&:hover fieldset': {
                  borderColor: '#d1d5db',
                },
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3b82f6',
                  borderWidth: '2px',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9ca3af', fontSize: '22px' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Select All Checkbox */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1.5px solid #e5e7eb',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#3b82f6',
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Checkbox
                checked={filteredProducts.length > 0 && filteredProducts.every(product => 
                  selectedProducts.some(id => String(id) === String(product.id))
                )}
                indeterminate={
                  filteredProducts.length > 0 && 
                  filteredProducts.some(product => 
                    selectedProducts.some(id => String(id) === String(product.id))
                  ) &&
                  !filteredProducts.every(product => 
                    selectedProducts.some(id => String(id) === String(product.id))
                  )
                }
                onChange={handleSelectAll}
                size="small"
                sx={{
                  color: '#3b82f6',
                  padding: '2px',
                  '&.Mui-checked': {
                    color: '#3b82f6',
                  },
                  '&.MuiCheckbox-indeterminate': {
                    color: '#3b82f6',
                  },
                }}
              />
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                Select All
              </Typography>
            </Box>
            <Box
              sx={{
                padding: '3px 10px',
                borderRadius: '16px',
                backgroundColor: selectedProducts.length > 0 ? '#dbeafe' : '#f3f4f6',
                border: selectedProducts.length > 0 ? '1px solid #93c5fd' : '1px solid #e5e7eb',
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectedProducts.length > 0 ? '#1e40af' : '#6b7280',
                }}
              >
                {selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'} selected
              </Typography>
            </Box>
          </Box>

          {/* Product List */}
          <Box
            sx={{
              maxHeight: '480px',
              backgroundColor: '#ffffff',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#d1d5db',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#9ca3af',
                },
              },
            }}
          >
            {filteredProducts.length === 0 ? (
              <Box
                sx={{
                  padding: '60px 40px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SearchIcon sx={{ color: '#9ca3af', fontSize: '40px' }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#374151',
                    marginTop: '8px',
                  }}
                >
                  No products found
                </Typography>
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#6b7280',
                    maxWidth: '300px',
                  }}
                >
                  {productSearchQuery
                    ? `No products match "${productSearchQuery}". Try adjusting your search.`
                    : 'No products available to assign.'}
                </Typography>
              </Box>
            ) : (
              (() => {
                // Collect all debug info in an array
                const debugArray = [];
                
                const mappedProducts =               filteredProducts.map((product, index) => {
                const productId = String(product.id.split("/").pop());
                const existingAssignment = productTemplateMap[productId];
                
                // Get current template type
                const currentTemplate = templates.find(t => String(t.id) === String(selectedTemplate));
                const chartData = currentTemplate?.chartData 
                  ? (typeof currentTemplate.chartData === 'string' 
                      ? JSON.parse(currentTemplate.chartData) 
                      : currentTemplate.chartData)
                  : null;
                const isCurrentTemplateMeasurement = chartData?.isMeasurementTemplate === true;
                
                // Check if product is assigned to a different template of the same type
                let isAssignedToOtherTemplate = false;
                let existingTemplateName = null;
                
                // Check if product has an existing assignment to a different template
                if (existingAssignment && selectedTemplate && currentTemplate) {
                  const currentTemplateId = String(selectedTemplate);
                  
                  // Determine template type based on selected template
                  if (isCurrentTemplateMeasurement) {
                    // For custom templates (measurement templates)
                    // Check if product has a custom template assigned (and it's not the current one)
                    if (existingAssignment.customTemplate && 
                        existingAssignment.customTemplate.templateId) {
                      const existingTemplateId = String(existingAssignment.customTemplate.templateId);
                      // Only show warning if it's a different template
                      if (existingTemplateId !== currentTemplateId) {
                        isAssignedToOtherTemplate = true;
                        existingTemplateName = existingAssignment.customTemplate.templateName || 'Custom Template';
                      }
                    }
                  } else {
                    // For table templates (non-measurement templates)
                    // Check if product has a table template assigned (and it's not the current one)
                    if (existingAssignment.tableTemplate && 
                        existingAssignment.tableTemplate.templateId) {
                      const existingTemplateId = String(existingAssignment.tableTemplate.templateId);
                      // Only show warning if it's a different template
                      if (existingTemplateId !== currentTemplateId) {
                        isAssignedToOtherTemplate = true;
                        existingTemplateName = existingAssignment.tableTemplate.templateName || 'Table Template';
                      }
                    }
                  }
                }
                
                // Alternative check: Check all templates to see if this product is assigned to any other template of the same type
                if (!isAssignedToOtherTemplate && selectedTemplate && currentTemplate) {
                  const currentTemplateId = String(selectedTemplate);
                  
                  // Check all templates to find if this product is assigned to another template of the same type
                  templates.forEach(template => {
                    if (String(template.id) === currentTemplateId) return; // Skip current template
                    
                    const templateChartData = template.chartData 
                      ? (typeof template.chartData === 'string' 
                          ? JSON.parse(template.chartData) 
                          : template.chartData)
                      : null;
                    const isTemplateMeasurement = templateChartData?.isMeasurementTemplate === true;
                    
                    // Only check templates of the same type
                    if (isTemplateMeasurement === isCurrentTemplateMeasurement) {
                      // Check if this product is in the template's assignments
                      if (template.productAssignments && Array.isArray(template.productAssignments)) {
                        const isAssigned = template.productAssignments.some(assignment => {
                          const assignmentProductId = String(assignment.productId);
                          return assignmentProductId === productId;
                        });
                        
                        if (isAssigned) {
                          isAssignedToOtherTemplate = true;
                          existingTemplateName = template.name || (isTemplateMeasurement ? 'Custom Template' : 'Table Template');
                        }
                      }
                    }
                  });
                }
                
                // Collect debug info for this product (only on first render to avoid spam)
                if (index === 0) {
                  const debugInfo = {
                    productTitle: product.title,
                    productId,
                    productShopifyId: product.id,
                    hasExistingAssignment: !!existingAssignment,
                    existingAssignment,
                    selectedTemplate,
                    assignModalOpen: assignModalOpen,
                    currentTemplateId: currentTemplate?.id,
                    currentTemplateName: currentTemplate?.name,
                    isCurrentTemplateMeasurement,
                    isAssignedToOtherTemplate,
                    existingTemplateName,
                    productTemplateMapKeys: Object.keys(productTemplateMap),
                    productTemplateMapSize: Object.keys(productTemplateMap).length,
                    productTemplateMapSample: Object.keys(productTemplateMap).slice(0, 3).reduce((acc, key) => {
                      acc[key] = productTemplateMap[key];
                      return acc;
                    }, {})
                  };
                  debugArray.push(debugInfo);
                } else {
                  // For other products, just add basic info
                  debugArray.push({
                    productTitle: product.title,
                    productId,
                    hasExistingAssignment: !!existingAssignment,
                    isAssignedToOtherTemplate,
                    existingTemplateName
                  });
                }
                
                const isSelected = selectedProducts.some(id => String(id) === String(product.id));
                
                
                return (
                  <Box
                    key={product.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '10px 14px',
                      marginBottom: '10px',
                      marginTop: '10px',
                      border: isAssignedToOtherTemplate 
                        ? '1.5px solid #fbbf24' 
                        : '1px solid #cccc',
                      borderRadius: '6px',
                      backgroundColor: isSelected
                        ? isAssignedToOtherTemplate
                          ? '#fffbeb'
                          : '#eff6ff'
                        : isAssignedToOtherTemplate
                          ? '#fffbeb'
                          : 'transparent',
                      transition: 'all 0.2s',
                      boxShadow: isAssignedToOtherTemplate 
                        ? '0 1px 3px rgba(245, 158, 11, 0.2)' 
                        : 'none',
                      '&:hover': {
                        backgroundColor: isSelected
                          ? isAssignedToOtherTemplate
                            ? '#fef3c7'
                            : '#dbeafe'
                          : isAssignedToOtherTemplate
                            ? '#fef3c7'
                            : '#f9fafb',
                        borderColor: isAssignedToOtherTemplate ? '#f59e0b' : '#cccc',
                        boxShadow: isAssignedToOtherTemplate 
                          ? '0 2px 6px rgba(245, 158, 11, 0.3)' 
                          : '0 1px 2px rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggleProduct(product.id)}
                        size="small"
                        sx={{
                          color: '#3b82f6',
                          padding: '2px',
                          marginTop: '2px',
                          '&.Mui-checked': {
                            color: '#3b82f6',
                          },
                        }}
                      />
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                        }}
                      >
                        {/* Product Image */}
                        {product.featuredImage ? (
                          <Box
                            sx={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1.5px solid #e5e7eb',
                              backgroundColor: '#f9fafb',
                              flexShrink: 0,
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                          >
                            <img
                              src={product.featuredImage.url}
                              alt={product.featuredImage.altText || product.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '6px',
                              backgroundColor: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1.5px solid #e5e7eb',
                              flexShrink: 0,
                            }}
                          >
                            <Box
                              component="svg"
                              sx={{
                                width: '24px',
                                height: '24px',
                                color: '#9ca3af',
                              }}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </Box>
                          </Box>
                        )}
                        
                        {/* Product Details */}
                        <Box sx={{ flex: 1, minWidth: 0, marginBottom: '8px' }}>
                          <Typography
                            sx={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#111827',
                              marginBottom: '4px',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {product.title}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                            
                              gap: 1,
                              alignItems: 'center',
                            }}
                          >
                            {/* Product ID */}
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  color: '#6b7280',
                                }}
                              >
                                ID:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#374151',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {product.id.split("/").pop()}
                              </Typography>
                            </Box>
                            {isAssignedToOtherTemplate && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              
                                 width: "fit-content",
                                padding: '4px 8px',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fbbf24',
                                borderRadius: '6px',
                              }}
                            >
                              <Box
                                component="svg"
                                sx={{
                                  width: '18px',
                                  height: '18px',
                                  color: '#f59e0b',
                                  flexShrink: 0,
                                }}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#92400e',
                                  lineHeight: 1.4,
                                }}
                              >
                                {existingTemplateName ? (
                                  <>This product is already assigned to template: <strong>{existingTemplateName}</strong></>
                                ) : (
                                  <>This product is already assigned to a template</>
                                )}
                              </Typography>
                            </Box>
                          )}
                          </Box>
                          
                          {/* Warning Message for Already Assigned Template */}
                     
                          
                          {/* View Template Buttons */}
                          {(existingAssignment?.tableTemplate || existingAssignment?.customTemplate) && (
                            <Box
                              sx={{
                                display: 'flex',
                                gap: 1,
                                mt: 1.5,
                                flexWrap: 'wrap',
                              }}
                            >
                              {existingAssignment.tableTemplate && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                                  onClick={() => {
                                    const tableTemplate = templates.find(t => t.id === existingAssignment.tableTemplate.templateId);
                                    if (tableTemplate) {
                                      setTemplateToView(tableTemplate);
                                      setViewModalOpen(true);
                                    }
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '12px',
                                    padding: '4px 12px',
                                    borderColor: '#d1d5db',
                                    color: '#374151',
                                    '&:hover': {
                                      borderColor: '#9ca3af',
                                      backgroundColor: '#f9fafb',
                                    },
                                  }}
                                >
                                  View Table Template
                                </Button>
                              )}
                              {existingAssignment.customTemplate && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                                  onClick={() => {
                                    const customTemplate = templates.find(t => t.id === existingAssignment.customTemplate.templateId);
                                    if (customTemplate) {
                                      setTemplateToView(customTemplate);
                                      setViewModalOpen(true);
                                    }
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    fontSize: '12px',
                                    padding: '4px 12px',
                                    borderColor: '#d1d5db',
                                    color: '#374151',
                                    '&:hover': {
                                      borderColor: '#9ca3af',
                                      backgroundColor: '#f9fafb',
                                    },
                                  }}
                                >
                                  View Custom Size Template
                                </Button>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
                });
                
                // Log all debug info as an array after mapping
                console.log('[Template Assignment Debug Array]', debugArray);
                
                return mappedProducts;
              })()
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            padding: '20px 28px',
            borderTop: '1px solid #e5e7eb',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb',
            borderRadius: '0 0 12px 12px',    
          }}
        >
          <Button
            variant="outlined"
            startIcon={<CancelIcon sx={{ fontSize: '18px' }} />}
            onClick={handleCloseAssignModal}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              textTransform: 'none',
              color: '#6b7280',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s ease',
              '&:hover:not(:disabled)': {
                backgroundColor: '#f9fafb',
                borderColor: '#d1d5db',
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
                borderColor: '#e5e7eb',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignProducts}
            variant="contained"
            startIcon={fetcher.state === "submitting" || fetcher.state === "loading" ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <CheckCircleIcon sx={{ fontSize: '18px' }} />}
            disabled={
              fetcher.state === "submitting" || 
              fetcher.state === "loading" ||
              assignmentJustCompleted ||
              !hasSelectionChanged
            }
            sx={{
              textTransform: 'none',
              background: 
                'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease',
              '&:hover:not(:disabled)': {
                background: 
                   'linear-gradient(135deg, #059669 0%, #047857 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                background: '#e5e7eb',
                color: '#9ca3af',
                boxShadow: 'none',
                transform: 'none',
                cursor: 'not-allowed',
              },
            }}
          >
            {fetcher.state === "submitting" || fetcher.state === "loading" ? "Applying..." : "Apply"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onClose={(event, reason) => {
          // Prevent closing during deletion
          if (fetcher.state === "submitting" || fetcher.state === "loading") {
            return;
          }
          handleCancelDelete();
        }}
        disableEscapeKeyDown={fetcher.state === "submitting" || fetcher.state === "loading"}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            position: 'relative',
          },
        }}
      >
        {/* Loading Overlay */}
        {(fetcher.state === "submitting" || fetcher.state === "loading") && (
          <Backdrop
            open={true}
            sx={{
              position: 'absolute',
              zIndex: (theme) => theme.zIndex.modal + 1,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={48} sx={{ color: '#dc2626' }} />
              <Typography sx={{ color: '#202223', fontSize: '15px', fontWeight: 600 }}>
                Deleting template...
              </Typography>
            </Box>
          </Backdrop>
        )}
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #e1e3e5',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#202223' }}>
            Delete Template
          </span>
          <IconButton
            onClick={handleCancelDelete}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              color: '#6d7175',
              padding: '4px',
              '&:hover': {
                backgroundColor: '#f6f6f7',
              },
              '&:disabled': {
                opacity: 0.5,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ padding: '24px' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2,paddingTop: '20px' }}>
            <Box
              sx={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                
                color: '#dc2626', fontSize: '24px',
                flexShrink: 0,
              }}
            >
             
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-trash-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7h16" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /><path d="M10 12l4 4m0 -4l-4 4" /></svg>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#202223',
                  marginBottom: '8px',
                }}
              >
                Are you sure you want to delete this template?
              </Typography>
              {templateToDelete?.hasAssignments ? (
                <Box sx={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  marginBottom: '12px' 
                }}>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      color: '#dc2626',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    Cannot delete template
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '13px',
                      color: '#991b1b',
                    }}
                  >
                    This template is currently assigned to <strong>{templateToDelete.assignmentCount}</strong> product{templateToDelete.assignmentCount > 1 ? 's' : ''}. Please remove the template from all products before deleting.
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#6d7175',
                    marginBottom: '12px',
                  }}
                >
                  This will permanently delete <strong>"{templateToDelete?.name}"</strong>. This action cannot be undone.
                </Typography>
              )}
              {/* Show error message if deletion failed */}
              {actionData?.error && !actionData?.success && (
                <Box sx={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  marginTop: '12px' 
                }}>
                  <Typography
                    sx={{
                      fontSize: '13px',
                      color: '#991b1b',
                    }}
                  >
                    {actionData.error}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            padding: '16px 24px',
            borderTop: '1px solid #e1e3e5',
            justifyContent: 'flex-end',
            gap: 2,
          }}
        >
          <Button
            startIcon={<CancelIcon sx={{ fontSize: '18px' }} />}
            onClick={handleCancelDelete}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            variant="outlined"
            sx={{
              textTransform: 'none',
              color: '#6b7280',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              borderColor: '#e5e7eb',
              backgroundColor: '#ffffff',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#d1d5db',
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                opacity: 0.5,
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={templateToDelete?.hasAssignments || fetcher.state === "submitting"}
            sx={{
              textTransform: 'none',
              color: '#dc2626',
              padding: '8px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              background: 'rgba(220, 38, 38, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(220, 38, 38, 0.3)',
                borderColor: 'rgba(220, 38, 38, 0.4)',
                boxShadow: 'none',
              },
              '&:disabled': {
                background: 'rgba(229, 231, 235, 0.2)',
                color: '#9ca3af',
                borderColor: 'rgba(229, 231, 235, 0.3)',
              },
            }}
          >
            {fetcher.state === "submitting" ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Chart Modal */}
      <TemplateViewModal
        open={viewModalOpen}
        onClose={handleCloseViewModal}
        template={templateToView}
      />

      {/* Old modal code - keeping for reference but should not render */}
      {false && templateToView && (() => {
        const chartData = typeof templateToView.chartData === 'string' 
          ? JSON.parse(templateToView.chartData || '{}') 
          : templateToView.chartData;
        
        // Check if it's a custom measurement template
        if (chartData?.isMeasurementTemplate === true) {
          const measurementFields = chartData.measurementFields || [];
          const enabledFields = measurementFields.filter(f => f.enabled);
          
          return (
            <Dialog
              open={viewModalOpen}
              onClose={handleCloseViewModal}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 2,
                },
              }}
            >
              <DialogTitle
                sx={{
                  pb: 2.5,
                  pt: 3,
                  px: 3,
                  borderBottom: "2px solid #e5e7eb",
                  background: "linear-gradient(to right, #f9fafb, #ffffff)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: "#111827",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <StraightenIcon sx={{ color: "white", fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827", fontSize: "1.25rem" }}>
                      Enter Your Measurements
                    </Typography>
                  </div>
                  <IconButton
                    onClick={handleCloseViewModal}
                    size="small"
                    sx={{ 
                      color: "#6b7280",
                      border: "1px solid #e5e7eb",
                      "&:hover": {
                        background: "#fee2e2",
                        borderColor: "#fecaca",
                        color: "#dc2626",
                      },
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                </div>
              </DialogTitle>
              <DialogContent className="pt-5" sx={{ pt: 5, maxHeight: "calc(90vh - 140px)", overflowY: "auto" }}>
                {enabledFields.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body1" sx={{ color: "#6b7280" }}>
                      No measurement fields enabled for this template.
                    </Typography>
                  </Box>
                ) : (
                  <div className="space-y-4">
                    {enabledFields
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((field) => (
                        <Box key={field.id}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedGuideField(field);
                                setShowMeasurementGuideModal(true);
                              }}
                              sx={{
                                color: field.guideImageUrl || field.customInstructions ? "#3b82f6" : "#6b7280",
                                p: 0.5,
                                "&:hover": {
                                  bgcolor: "#dbeafe",
                                  color: "#3b82f6",
                                },
                              }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827" }}>
                              {field.name}
                              {field.required && (
                                <Typography component="span" sx={{ color: "#dc2626", ml: 0.5 }}>
                                  *
                                </Typography>
                              )}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-2">
                            <TextField
                              placeholder={`Enter ${field.name.toLowerCase()}`}
                              fullWidth
                              disabled
                              size="small"
                              sx={{
                                bgcolor: "white",
                                "& .MuiOutlinedInput-root": {
                                  "& fieldset": {
                                    borderColor: "#d1d5db",
                                  },
                                  "&:hover fieldset": {
                                    borderColor: "#9ca3af",
                                  },
                                  "&.Mui-disabled": {
                                    bgcolor: "#f9fafb",
                                  },
                                },
                              }}
                            />
                            <Chip
                              label={field.unit?.toUpperCase() || "IN"}
                              size="small"
                              sx={{
                                height: 32,
                                minWidth: 40,
                                bgcolor: "#f3f4f6",
                                color: "#6b7280",
                                border: "1px solid #e5e7eb",
                                fontWeight: 500,
                              }}
                            />
                          </div>
                        </Box>
                      ))}
                    
                    {chartData.fitPreferencesEnabled && enabledFields.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1.5 }}>
                          Fit Preference <Typography component="span" sx={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</Typography>
                        </Typography>
                        <FormControl fullWidth size="small" disabled>
                          <Select
                            value=""
                            displayEmpty
                            sx={{
                              bgcolor: "white",
                              "&.Mui-disabled": {
                                bgcolor: "#f9fafb",
                              },
                            }}
                          >
                            <MenuItem value="">Select fit preference</MenuItem>
                            {chartData.fitPreferences && Object.entries(chartData.fitPreferences).map(([key, fit]) => (
                              <MenuItem key={key} value={key}>
                                {fit.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}

                    {chartData.stitchingNotesEnabled && enabledFields.length > 0 && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827", mb: 1.5 }}>
                          Stitching Notes <Typography component="span" sx={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</Typography>
                        </Typography>
                        <TextField
                          multiline
                          rows={3}
                          size="small"
                          placeholder="E.g., I want slightly loose sleeves"
                          fullWidth
                          disabled
                          sx={{
                            bgcolor: "white",
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#d1d5db",
                              },
                              "&:hover fieldset": {
                                borderColor: "#9ca3af",
                              },
                              "&.Mui-disabled": {
                                bgcolor: "#f9fafb",
                              },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </div>
                )}
              </DialogContent>
              <DialogActions 
                sx={{ 
                  p: 3, 
                  pt: 2, 
                  borderTop: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  gap: 2 
                }}
              >
                <Button 
                  onClick={handleCloseViewModal}
                  sx={{ 
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    border: "1px solid #d1d5db",
                    color: "#374151",
                    bgcolor: "white",
                    "&:hover": {
                      bgcolor: "#f9fafb",
                      borderColor: "#9ca3af",
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  sx={{
                    bgcolor: "#111827",
                    color: "white",
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    "&:hover": {
                      bgcolor: "#1f2937",
                    },
                  }}
                >
                  Add to Cart
                </Button>
              </DialogActions>
            </Dialog>
          );
        }
        
        // Regular table-based size chart
        return (
          <SizeChart
            open={viewModalOpen}
            onClose={handleCloseViewModal}
            template={{
              ...templateToView,
              chartData: chartData,
            }}
            brandName={templateToView?.name || "Size Chart"}
          />
        );
      })()}

      {/* Measurement Guide Modal for View */}
      <Dialog 
        open={showMeasurementGuideModal} 
        onClose={() => {
          setShowMeasurementGuideModal(false);
          setSelectedGuideField(null);
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "90vh",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2, 
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
                How to Measure: {selectedGuideField?.name || ""}
              </Typography>
              <Typography variant="caption" sx={{ color: "#6b7280", mt: 0.5, display: "block" }}>
                Follow these instructions to get accurate measurements
              </Typography>
            </div>
            <IconButton
              onClick={() => {
                setShowMeasurementGuideModal(false);
                setSelectedGuideField(null);
              }}
              size="small"
              sx={{ 
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                "&:hover": {
                  background: "#fee2e2",
                  borderColor: "#fecaca",
                  color: "#dc2626",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent className="mt-4" sx={{ pt: 3 }}>
          {selectedGuideField && (
            <Box>
              {/* Guide Image */}
              {selectedGuideField.guideImageUrl ? (
                <Box
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 300,
                    p: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={selectedGuideField.guideImageUrl}
                    alt={`How to measure ${selectedGuideField.name}`}
                    sx={{
                      maxWidth: "100%",
                      maxHeight: "400px",
                      borderRadius: 1,
                      objectFit: "contain",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    mb: 3,
                    p: 4,
                    background: "#f9fafb",
                    borderRadius: 2,
                    border: "2px dashed #d1d5db",
                    textAlign: "center",
                  }}
                >
                  <ImageIcon sx={{ fontSize: 48, color: "#d1d5db", mb: 1 }} />
                  <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                    No guide image available
                  </Typography>
                </Box>
              )}

              {/* Instructions */}
              <Box
                sx={{
                  p: 3,
                  background: "#f9fafb",
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <DescriptionIcon sx={{ color: "#111827", fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827" }}>
                    Measurement Instructions
                  </Typography>
                </div>
                {selectedGuideField.customInstructions ? (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "#374151", 
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedGuideField.customInstructions}
                  </Typography>
                ) : selectedGuideField.description ? (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "#374151", 
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedGuideField.description}
                  </Typography>
                ) : (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: "#6b7280", 
                      lineHeight: 1.8,
                      fontStyle: "italic",
                    }}
                  >
                    No custom instructions available. Please refer to the guide image above.
                  </Typography>
                )}
              </Box>

              {/* Measurement Details */}
              <Box
                sx={{
                  mt: 3,
                  p: 2.5,
                  background: "#ffffff",
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", mb: 2 }}>
                  Measurement Details
                </Typography>
                <div className="grid grid-cols-2 gap-3">
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 0.5 }}>
                      Unit
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500 }}>
                      {selectedGuideField.unit === "in" ? "Inches" : "Centimeters"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 0.5 }}>
                      Range
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500 }}>
                      {selectedGuideField.min || 0} - {selectedGuideField.max || 100} {selectedGuideField.unit || "in"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 0.5 }}>
                      Required
                    </Typography>
                    <Typography variant="body2" sx={{ color: selectedGuideField.required ? "#dc2626" : "#6b7280", fontWeight: 500 }}>
                      {selectedGuideField.required ? "Yes" : "No"}
                    </Typography>
                  </Box>
                </div>
              </Box>
            </Box>
          )}
        </DialogContent>
      
      </Dialog>

      {/* Edit Custom Template Modal */}
      <Dialog
        open={editCustomTemplateModalOpen}
        onClose={() => {
          setEditCustomTemplateModalOpen(false);
          setEditingCustomTemplate(null);
        }}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: "95vh",
            width: "95vw",
            maxWidth: "1400px",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2.5, 
            pt: 3,
            px: 3,
            borderBottom: "2px solid #e5e7eb",
            background: "linear-gradient(to right, #f9fafb, #ffffff)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <EditIcon sx={{ color: "white", fontSize: 20 }} />
              </Box>
              <div>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827", fontSize: "1.25rem" }}>
                  Edit Custom Template
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.5 }}>
                  {editingCustomTemplate?.name || "Template"}
                </Typography>
              </div>
            </div>
            <IconButton
              onClick={() => {
                setEditCustomTemplateModalOpen(false);
                setEditingCustomTemplate(null);
              }}
              size="small"
              sx={{ 
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                "&:hover": {
                  background: "#fee2e2",
                  borderColor: "#fecaca",
                  color: "#dc2626",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: "hidden", height: "calc(95vh - 80px)" }}>
          {loadingCustomTemplate ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ height: "100%", overflow: "auto", p: 3 }}>
              {/* Template Name */}
              <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Box
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <DescriptionIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", fontSize: "1rem" }}>
                      Template Information
                    </Typography>
                  </div>
                  <TextField
                    value={customTemplateName}
                    onChange={(e) => setCustomTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    variant="outlined"
                    fullWidth
                    label="Template Name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EditIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#ffffff",
                        "&:hover": {
                          bgcolor: "#f9fafb",
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>

              {/* Category Presets */}
              <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Box
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CategoryIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", fontSize: "1rem" }}>
                      Tailor Presets
                    </Typography>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(TAILOR_PRESETS).map(([key, preset]) => (
                      <Button
                        key={key}
                        variant={customTemplateCategory === key ? "contained" : "outlined"}
                        onClick={() => setCustomTemplateCategory(key)}
                        startIcon={customTemplateCategory === key ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : null}
                        sx={{
                          textTransform: "none",
                          borderColor: customTemplateCategory === key ? "#111827" : "#d1d5db",
                          color: customTemplateCategory === key ? "white" : "#374151",
                          bgcolor: customTemplateCategory === key ? "#111827" : "white",
                          fontWeight: customTemplateCategory === key ? 600 : 500,
                          px: 2.5,
                          py: 1,
                          "&:hover": {
                            bgcolor: customTemplateCategory === key ? "#1f2937" : "#f9fafb",
                            borderColor: customTemplateCategory === key ? "#1f2937" : "#9ca3af",
                            transform: "translateY(-1px)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Measurement Fields */}
              <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Box
                        sx={{
                          p: 0.75,
                          borderRadius: 1,
                          bgcolor: "#e0f2fe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <StraightenIcon sx={{ color: "#0284c7", fontSize: 18 }} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#111827", fontSize: "1.1rem" }}>
                        Measurement Fields
                      </Typography>
                      <Chip
                        label={customMeasurementFields.filter(f => f.enabled).length}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: "0.75rem",
                          bgcolor: "#e0f2fe",
                          color: "#0284c7",
                          fontWeight: 700,
                          border: "1px solid #bae6fd",
                        }}
                      />
                    </div>
                    <Button
                      startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                      variant="contained"
                      size="medium"
                      onClick={() => {
                        setCustomNewField({
                          name: "",
                          description: "",
                          unit: "in",
                          required: false,
                          min: 0,
                          max: 100,
                        });
                        setCustomEditingField(null);
                        setCustomShowFieldDialog(true);
                      }}
                      sx={{
                        bgcolor: "#111827",
                        color: "white",
                        textTransform: "none",
                        fontWeight: 600,
                        px: 2.5,
                        "&:hover": {
                          bgcolor: "#1f2937",
                          transform: "translateY(-1px)",
                        },
                        transition: "all 0.2s ease",
                      }}
                    >
                      Add Field
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {customMeasurementFields.map((field, index) => (
                      <Box
                        key={field.id || index}
                        draggable
                        onDragStart={() => setCustomDraggedFieldIndex(index)}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (customDraggedFieldIndex !== null && customDraggedFieldIndex !== index) {
                            const updated = [...customMeasurementFields];
                            const draggedField = updated[customDraggedFieldIndex];
                            updated.splice(customDraggedFieldIndex, 1);
                            updated.splice(index, 0, draggedField);
                            updated.forEach((f, i) => {
                              f.order = i;
                            });
                            setCustomMeasurementFields(updated);
                          }
                          setCustomDraggedFieldIndex(null);
                        }}
                        sx={{
                          p: 2.5,
                          border: `2px solid ${field.enabled ? "#e5e7eb" : "#f3f4f6"}`,
                          borderRadius: 1.5,
                          bgcolor: field.enabled ? "white" : "#f9fafb",
                          opacity: customDraggedFieldIndex === index ? 0.5 : field.enabled ? 1 : 0.6,
                          cursor: "move",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: field.enabled ? "#9ca3af" : "#d1d5db",
                            bgcolor: field.enabled ? "#fafafa" : "#f9fafb",
                            transform: "translateY(-1px)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          },
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Box
                            sx={{
                              p: 0.75,
                              borderRadius: 1,
                              bgcolor: field.enabled ? "#f3f4f6" : "#f9fafb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              mt: 0.5,
                              cursor: "grab",
                              "&:active": {
                                cursor: "grabbing",
                              },
                            }}
                          >
                            <DragIndicatorIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                          </Box>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>
                                {field.name}
                              </Typography>
                              <Chip
                                icon={<StraightenIcon sx={{ fontSize: 12, color: "#0284c7" }} />}
                                label={field.unit.toUpperCase()}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: "0.7rem",
                                  bgcolor: "#e0f2fe",
                                  color: "#0284c7",
                                  border: "1px solid #bae6fd",
                                  fontWeight: 600,
                                }}
                              />
                              {field.required && (
                                <Chip
                                  icon={<RadioButtonCheckedIcon sx={{ fontSize: 12, color: "#991b1b" }} />}
                                  label="Required"
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.7rem",
                                    bgcolor: "#fee2e2",
                                    color: "#991b1b",
                                    border: "1px solid #fecaca",
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                              {!field.enabled && (
                                <Chip
                                  label="Hidden"
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.7rem",
                                    bgcolor: "#f3f4f6",
                                    color: "#6b7280",
                                    border: "1px solid #e5e7eb",
                                  }}
                                />
                              )}
                            </div>
                            {field.description && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: "#6b7280",
                                  display: "block",
                                  mb: 1,
                                  lineHeight: 1.5,
                                }}
                              >
                                {field.description}
                              </Typography>
                            )}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 500 }}>
                                Range:
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#111827", fontWeight: 600 }}>
                                {field.min} - {field.max} {field.unit}
                              </Typography>
                            </Box>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip title={field.required ? "Required" : "Optional"}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const updated = [...customMeasurementFields];
                                  updated[index].required = !updated[index].required;
                                  setCustomMeasurementFields(updated);
                                }}
                                disabled={!field.enabled}
                                sx={{
                                  color: field.required ? "#dc2626" : "#9ca3af",
                                  "&:hover": {
                                    bgcolor: "#f3f4f6",
                                  },
                                }}
                              >
                                {field.required ? (
                                  <RadioButtonCheckedIcon fontSize="small" />
                                ) : (
                                  <RadioButtonUncheckedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={field.enabled ? "Hide" : "Show"}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const updated = [...customMeasurementFields];
                                  updated[index].enabled = !updated[index].enabled;
                                  setCustomMeasurementFields(updated);
                                }}
                                sx={{
                                  color: field.enabled ? "#10b981" : "#9ca3af",
                                  "&:hover": {
                                    bgcolor: field.enabled ? "#d1fae5" : "#f3f4f6",
                                  },
                                }}
                              >
                                {field.enabled ? (
                                  <VisibilityIcon fontSize="small" />
                                ) : (
                                  <VisibilityOffIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="How to Measure">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCustomEditingHowToMeasureField(index);
                                  const defaultField = DEFAULT_TAILOR_MEASUREMENTS.find(df => df.id === field.id);
                                  setCustomHowToMeasureData({
                                    defaultDescription: defaultField?.description || field.description || "",
                                    customInstructions: field.customInstructions || "",
                                    guideImage: null,
                                    guideImageUrl: field.guideImageUrl || field.guideImage || null,
                                  });
                                  setCustomShowHowToMeasureDialog(true);
                                }}
                                sx={{
                                  color: field.guideImageUrl || field.customInstructions ? "#3b82f6" : "#6b7280",
                                  "&:hover": {
                                    bgcolor: "#dbeafe",
                                    color: "#3b82f6",
                                  },
                                }}
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setCustomNewField({ ...field });
                                  setCustomEditingField(index);
                                  setCustomShowFieldDialog(true);
                                }}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": {
                                    bgcolor: "#fef3c7",
                                    color: "#f59e0b",
                                  },
                                }}
                              >
                                <SettingsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const updated = customMeasurementFields.filter((_, i) => i !== index);
                                  updated.forEach((f, i) => {
                                    f.order = i;
                                  });
                                  setCustomMeasurementFields(updated);
                                }}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": {
                                    bgcolor: "#fee2e2",
                                    color: "#dc2626",
                                  },
                                }}
                              >
                                <RemoveCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </div>
                      </Box>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Features */}
              <Card sx={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Box
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <TuneIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#111827", fontSize: "1.1rem" }}>
                      Advanced Features
                    </Typography>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Fit Preference */}
                    <Box
                      sx={{
                        p: 2.5,
                        border: "1px solid #e5e7eb",
                        borderRadius: 1.5,
                        bgcolor: customFitPreferencesEnabled ? "#f0fdf4" : "#f9fafb",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customFitPreferencesEnabled}
                            onChange={(e) => setCustomFitPreferencesEnabled(e.target.checked)}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": {
                                color: "#10b981",
                              },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: "#10b981",
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>
                            Enable Fit Preference
                          </Typography>
                        }
                      />
                      {customFitPreferencesEnabled && (
                        <Box sx={{ ml: 5, mt: 2, p: 2.5, bgcolor: "#ffffff", borderRadius: 1, border: "1px solid #d1fae5" }}>
                          <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 1.5, fontWeight: 500 }}>
                            Fit options with ease allowance:
                          </Typography>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(FIT_PREFERENCES).map(([key, fit]) => (
                              <Chip
                                key={key}
                                label={`${fit.label}: +${fit.ease}"`}
                                size="small"
                                sx={{
                                  bgcolor: "#d1fae5",
                                  color: "#065f46",
                                  border: "1px solid #a7f3d0",
                                  fontWeight: 600,
                                  height: 24,
                                }}
                              />
                            ))}
                          </div>
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Stitching Notes */}
                    <Box
                      sx={{
                        p: 2.5,
                        border: "1px solid #e5e7eb",
                        borderRadius: 1.5,
                        bgcolor: customStitchingNotesEnabled ? "#fef3c7" : "#f9fafb",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={customStitchingNotesEnabled}
                            onChange={(e) => setCustomStitchingNotesEnabled(e.target.checked)}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": {
                                color: "#f59e0b",
                              },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: "#f59e0b",
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontWeight: 600, color: "#111827", fontSize: "0.95rem" }}>
                            Enable Stitching Notes
                          </Typography>
                        }
                      />
                      {customStitchingNotesEnabled && (
                        <Box sx={{ ml: 5, mt: 2, p: 2.5, bgcolor: "#ffffff", borderRadius: 1, border: "1px solid #fde68a" }}>
                          <Typography variant="caption" sx={{ color: "#6b7280", lineHeight: 1.6 }}>
                            Customers can add custom instructions like "I want slightly loose sleeves"
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </div>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions 
          sx={{ 
            p: 2.5, 
            px: 3,
            borderTop: "2px solid #e5e7eb",
            background: "linear-gradient(to right, #f9fafb, #ffffff)",
            gap: 1.5,
          }}
        >
          <Button
            onClick={() => {
              setEditCustomTemplateModalOpen(false);
              setEditingCustomTemplate(null);
            }}
            startIcon={<CancelIcon />}
            variant="outlined"
            sx={{
              textTransform: "none",
              color: "#6b7280",
              borderColor: "#d1d5db",
              fontWeight: 500,
              px: 3,
              "&:hover": {
                background: "#f3f4f6",
                borderColor: "#9ca3af",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={async () => {
              const enabledFields = customMeasurementFields.filter((f) => f.enabled);
              if (enabledFields.length === 0) {
                setCustomSnackbar({
                  open: true,
                  message: "At least one measurement field must be enabled",
                  severity: "error",
                });
                return;
              }

              const templateData = {
                name: customTemplateName,
                category: customTemplateCategory,
                measurementFields: customMeasurementFields,
                fitPreferencesEnabled: customFitPreferencesEnabled,
                stitchingNotesEnabled: customStitchingNotesEnabled,
                fitPreferences: FIT_PREFERENCES,
              };

              try {
                const formData = new FormData();
                formData.append("template", JSON.stringify(templateData));
                formData.append("id", editingCustomTemplate?.id || "");

                const response = await fetch("/api/measurement-template", {
                  method: "POST",
                  body: formData,
                });

                if (response.ok) {
                  setCustomSnackbar({
                    open: true,
                    message: "Template updated successfully",
                    severity: "success",
                  });
                  setEditCustomTemplateModalOpen(false);
                  setEditingCustomTemplate(null);
                  revalidator.revalidate();
                } else {
                  const error = await response.json();
                  setCustomSnackbar({
                    open: true,
                    message: error.error || "Failed to update template",
                    severity: "error",
                  });
                }
              } catch (error) {
                setCustomSnackbar({
                  open: true,
                  message: "Failed to update template",
                  severity: "error",
                });
              }
            }}
            disabled={loadingCustomTemplate}
            sx={{
              bgcolor: "#111827",
              color: "white",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              "&:hover": {
                bgcolor: "#1f2937",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(17, 24, 39, 0.3)",
              },
              "&:disabled": {
                bgcolor: "#9ca3af",
                transform: "none",
              },
              transition: "all 0.2s ease",
            }}
          >
            {loadingCustomTemplate ? "Saving..." : "Update Template"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Field Edit Dialog */}
      <Dialog
        open={customShowFieldDialog}
        onClose={() => {
          setCustomShowFieldDialog(false);
          setCustomEditingField(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 2,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div className="flex items-center gap-2">
            <Box
              sx={{
                p: 0.75,
                borderRadius: 1,
                bgcolor: "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {customEditingField !== null ? (
                <EditIcon sx={{ color: "white", fontSize: 18 }} />
              ) : (
                <AddIcon sx={{ color: "white", fontSize: 18 }} />
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
              {customEditingField !== null ? "Edit Measurement Field" : "Add Measurement Field"}
            </Typography>
          </div>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="Field Name"
              value={customNewField.name}
              onChange={(e) => setCustomNewField({ ...customNewField, name: e.target.value })}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <StraightenIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#ffffff",
                  "&:hover": {
                    bgcolor: "#f9fafb",
                  },
                },
              }}
            />
            <TextField
              label="Description"
              value={customNewField.description}
              onChange={(e) => setCustomNewField({ ...customNewField, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter a description for this measurement field..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                    <DescriptionIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#ffffff",
                  "&:hover": {
                    bgcolor: "#f9fafb",
                  },
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel>Unit</InputLabel>
              <Select
                value={customNewField.unit}
                onChange={(e) => setCustomNewField({ ...customNewField, unit: e.target.value })}
                label="Unit"
                startAdornment={
                  <InputAdornment position="start">
                    <StraightenIcon sx={{ color: "#9ca3af", fontSize: 18, ml: 1 }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="in">Inches (in)</MenuItem>
                <MenuItem value="cm">Centimeters (cm)</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Min Value"
                type="number"
                value={customNewField.min}
                onChange={(e) => setCustomNewField({ ...customNewField, min: parseFloat(e.target.value) || 0 })}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ color: "#9ca3af", fontSize: "0.875rem" }}>Min</Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#ffffff",
                  },
                }}
              />
              <TextField
                label="Max Value"
                type="number"
                value={customNewField.max}
                onChange={(e) => setCustomNewField({ ...customNewField, max: parseFloat(e.target.value) || 100 })}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ color: "#9ca3af", fontSize: "0.875rem" }}>Max</Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#ffffff",
                  },
                }}
              />
            </Box>
            <Box
              sx={{
                p: 2,
                border: "1px solid #e5e7eb",
                borderRadius: 1,
                bgcolor: "#f9fafb",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={customNewField.required}
                    onChange={(e) => setCustomNewField({ ...customNewField, required: e.target.checked })}
                    sx={{
                      color: customNewField.required ? "#dc2626" : "#9ca3af",
                      "&.Mui-checked": {
                        color: "#dc2626",
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontWeight: 500, color: "#111827" }}>
                    Required Field
                  </Typography>
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #e5e7eb", gap: 1.5 }}>
          <Button
            onClick={() => {
              setCustomShowFieldDialog(false);
              setCustomEditingField(null);
            }}
            variant="outlined"
            startIcon={<CancelIcon />}
            sx={{
              textTransform: "none",
              color: "#6b7280",
              borderColor: "#d1d5db",
              "&:hover": {
                borderColor: "#9ca3af",
                background: "#f3f4f6",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={customEditingField !== null ? <CheckCircleIcon /> : <AddIcon />}
            onClick={() => {
              if (!customNewField.name.trim()) {
                setCustomSnackbar({
                  open: true,
                  message: "Field name is required",
                  severity: "error",
                });
                return;
              }

              if (customEditingField !== null) {
                const updated = [...customMeasurementFields];
                updated[customEditingField] = {
                  ...updated[customEditingField],
                  ...customNewField,
                  id: updated[customEditingField].id || `custom-${Date.now()}`,
                };
                setCustomMeasurementFields(updated);
              } else {
                const newFieldData = {
                  ...customNewField,
                  id: `custom-${Date.now()}`,
                  enabled: true,
                  order: customMeasurementFields.length,
                };
                setCustomMeasurementFields([...customMeasurementFields, newFieldData]);
              }

              setCustomShowFieldDialog(false);
              setCustomEditingField(null);
            }}
            sx={{
              bgcolor: "#111827",
              color: "white",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "#1f2937",
              },
            }}
          >
            {customEditingField !== null ? "Update Field" : "Add Field"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* How to Measure Dialog */}
      <Dialog
        open={customShowHowToMeasureDialog}
        onClose={() => {
          setCustomShowHowToMeasureDialog(false);
          setCustomEditingHowToMeasureField(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 2,
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div className="flex items-center gap-2">
            <Box
              sx={{
                p: 0.75,
                borderRadius: 1,
                bgcolor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <InfoIcon sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <div>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
                How to Measure
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280", mt: 0.25 }}>
                {customEditingHowToMeasureField !== null ? customMeasurementFields[customEditingHowToMeasureField]?.name : ""}
              </Typography>
            </div>
          </div>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <div className="flex items-center gap-2 mb-1.5">
                <DescriptionIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827" }}>
                  Custom Instructions
                </Typography>
              </div>
              <TextField
                value={customHowToMeasureData.customInstructions}
                onChange={(e) => setCustomHowToMeasureData({ ...customHowToMeasureData, customInstructions: e.target.value })}
                fullWidth
                multiline
                rows={8}
                placeholder="Enter detailed instructions for how to measure this field..."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#ffffff",
                    "&:hover": {
                      bgcolor: "#f9fafb",
                    },
                  },
                }}
              />
            </Box>
            <Box>
              <div className="flex items-center gap-2 mb-1.5">
                <ImageIcon sx={{ color: "#6b7280", fontSize: 18 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827" }}>
                  Guide Image
                </Typography>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setCustomHowToMeasureData({
                        ...customHowToMeasureData,
                        guideImage: file,
                        guideImageUrl: reader.result,
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ display: "none" }}
                id="guide-image-upload"
              />
              <label htmlFor="guide-image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<ImageIcon />}
                  sx={{
                    textTransform: "none",
                    borderColor: "#d1d5db",
                    color: "#374151",
                    fontWeight: 500,
                    py: 1.5,
                    "&:hover": {
                      borderColor: "#9ca3af",
                      background: "#f9fafb",
                    },
                  }}
              >
                {customHowToMeasureData.guideImageUrl ? "Change Guide Image" : "Upload Guide Image"}
              </Button>
              </label>
              {customHowToMeasureData.guideImageUrl && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 2,
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    bgcolor: "#f9fafb",
                  }}
                >
                  <img
                    src={customHowToMeasureData.guideImageUrl}
                    alt="Guide"
                    style={{
                      maxWidth: "100%",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                  <Button
                    size="small"
                    startIcon={<RemoveCircleOutlineIcon />}
                    onClick={() => {
                      setCustomHowToMeasureData({
                        ...customHowToMeasureData,
                        guideImage: null,
                        guideImageUrl: null,
                      });
                    }}
                    sx={{
                      mt: 1.5,
                      textTransform: "none",
                      color: "#dc2626",
                      "&:hover": {
                        bgcolor: "#fee2e2",
                      },
                    }}
                  >
                    Remove Image
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: "1px solid #e5e7eb", gap: 1.5 }}>
          <Button
            onClick={() => {
              setCustomShowHowToMeasureDialog(false);
              setCustomEditingHowToMeasureField(null);
            }}
            variant="outlined"
            startIcon={<CancelIcon />}
            sx={{
              textTransform: "none",
              color: "#6b7280",
              borderColor: "#d1d5db",
              "&:hover": {
                borderColor: "#9ca3af",
                background: "#f3f4f6",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => {
              if (customEditingHowToMeasureField !== null) {
                const updated = [...customMeasurementFields];
                updated[customEditingHowToMeasureField] = {
                  ...updated[customEditingHowToMeasureField],
                  customInstructions: customHowToMeasureData.customInstructions,
                  guideImageUrl: customHowToMeasureData.guideImageUrl,
                  guideImage: customHowToMeasureData.guideImageUrl,
                };
                setCustomMeasurementFields(updated);
                setCustomShowHowToMeasureDialog(false);
                setCustomEditingHowToMeasureField(null);
                setCustomSnackbar({
                  open: true,
                  message: "How to measure guide updated successfully",
                  severity: "success",
                });
              }
            }}
            sx={{
              bgcolor: "#111827",
              color: "white",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "#1f2937",
              },
            }}
          >
            Save Instructions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={customSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setCustomSnackbar({ ...customSnackbar, open: false })}
      >
        <Alert severity={customSnackbar.severity} onClose={() => setCustomSnackbar({ ...customSnackbar, open: false })}>
          {customSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
