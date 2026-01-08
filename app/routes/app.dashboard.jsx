import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import { normalizeChartDataUrls } from "../utils/s3.server";
import {  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, CircularProgress, Backdrop, Chip, Menu, MenuItem, Divider, Tabs, Tab, Checkbox, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import AddIcon from "@mui/icons-material/Add";
import CancelIcon from "@mui/icons-material/Cancel";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SizeChart from "../shared/SizeChart";
import { useAppBridge } from "@shopify/app-bridge-react";
import prisma from "../db.server";

// Inline styles to force full width
const fullWidthStyle = {
  width: '100%',
  maxWidth: '100%',
  margin: '0',
  marginLeft: '0',
  marginRight: '0',
  paddingLeft: '0',
  paddingRight: '0',
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch products
  const productsResponse = await admin.graphql(
    `#graphql
      query getProducts($first: Int!) {
        products(first: $first) {
          nodes {
            id
            title
            handle
            description
            status
            vendor
            productType
            createdAt
            updatedAt
            featuredImage {
              url
              altText
            }
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }`,
    {
      variables: {
        first: 25,
      },
    },
  );

  const productsJson = await productsResponse.json();
  const products = productsJson.data?.products?.nodes || [];

  // Fetch template assignments for products
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  let productTemplateMap = {};
  try {
    const assignments = await prisma.sizeChartProductAssignment.findMany({
      where: { shop },
    });
    
    console.log("[Dashboard Loader] Fetched assignments count:", assignments.length);

    // Fetch templates for each assignment
    const assignmentsWithTemplates = [];
    for (const assignment of assignments) {
      // Fetch template separately since relation name is SizeChartTemplate (not template)
      const template = await prisma.sizeChartTemplate.findUnique({
        where: { id: assignment.templateId },
      });
      
      if (template) {
        assignmentsWithTemplates.push({
          ...assignment,
          template,
        });
      } else {
        console.warn("[Dashboard Loader] Template not found for assignment:", assignment.id, "templateId:", assignment.templateId);
      }
    }
    
    console.log("[Dashboard Loader] Assignments with templates:", assignmentsWithTemplates.length);
    
    assignmentsWithTemplates.forEach((assignment) => {
      if (!assignment.template) {
        console.warn("[Dashboard Loader] Assignment missing template:", assignment.id);
        return;
      }
      
      // Parse and normalize chartData URLs
      let chartData = {};
      try {
        chartData = typeof assignment.template.chartData === 'string' 
          ? JSON.parse(assignment.template.chartData || '{}') 
          : (assignment.template.chartData || {});
        // Normalize any s3:// URLs to HTTPS URLs
        chartData = normalizeChartDataUrls(chartData);
      } catch (e) {
        console.error('Error parsing chartData in dashboard loader:', e);
        chartData = {};
      }
      
      const templateData = {
        ...assignment.template,
        chartData,
      };
      
      // Ensure productId is stored as string for consistent matching
      const productId = String(assignment.productId).trim();
      
      // Store ALL templates for a product in an array (support multiple templates per product)
      if (!productTemplateMap[productId]) {
        productTemplateMap[productId] = [];
      }
      productTemplateMap[productId].push(templateData);
      
      // Also store without any whitespace for additional matching attempts
      const cleanProductId = productId.replace(/\s+/g, '');
      if (cleanProductId !== productId) {
        if (!productTemplateMap[cleanProductId]) {
          productTemplateMap[cleanProductId] = [];
        }
        productTemplateMap[cleanProductId].push(templateData);
      }
      
      console.log("[Dashboard Loader] Mapped productId:", productId, "to template:", assignment.template.name);
    });
    
    console.log("[Dashboard Loader] Product template map created with", Object.keys(productTemplateMap).length, "entries");
  } catch (error) {
    console.error("[Dashboard Loader] Error fetching template assignments:", error);
  }

  // Fetch templates for the selection modal
  let templates = [];
  try {
    templates = await prisma.sizeChartTemplate.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        gender: true,
        category: true,
        active: true,
        createdAt: true,
        chartData: true,
      },
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
  }

  // Fetch orders for dashboard statistics
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Fetch current month orders
    const ordersResponse = await admin.graphql(
      `#graphql
        query getOrders($first: Int!, $query: String!) {
          orders(first: $first, query: $query) {
            nodes {
              id
              displayFulfillmentStatus
            }
          }
        }`,
      {
        variables: {
          first: 250,
          query: `created_at:>${thirtyDaysAgo.toISOString().split('T')[0]}`,
        },
      },
    );

    const ordersJson = await ordersResponse.json();
    console.log("ordersJson",ordersJson);
    
    const orders = ordersJson.data?.orders?.nodes || [];

    // Fetch previous month orders for comparison
    const previousMonthResponse = await admin.graphql(
      `#graphql
        query getPreviousMonthOrders($first: Int!, $query: String!) {
          orders(first: $first, query: $query) {
            nodes {
              id
            }
          }
        }`,
      {
        variables: {
          first: 250,
          query: `created_at:>${sixtyDaysAgo.toISOString().split('T')[0]} AND created_at:<${thirtyDaysAgo.toISOString().split('T')[0]}`,
        },
      },
    );

    const previousMonthJson = await previousMonthResponse.json();
    const previousMonthOrders = previousMonthJson.data?.orders?.nodes || [];

    // Calculate statistics
    const totalOrders = orders.length;
    const previousMonthTotal = previousMonthOrders.length;
    const orderChange = previousMonthTotal > 0 
      ? ((totalOrders - previousMonthTotal) / previousMonthTotal * 100).toFixed(0)
      : totalOrders > 0 ? "100" : "0";

    // Categorize orders by fulfillment status
    const pendingOrders = orders.filter(order => 
      order.displayFulfillmentStatus === 'UNFULFILLED' || 
      order.displayFulfillmentStatus === 'PARTIAL'
    ).length;

    const completedOrders = orders.filter(order => 
      order.displayFulfillmentStatus === 'FULFILLED'
    ).length;

    // Fetch custom orders (orders with "_custom_order" property in line items)
    // Note: We query all recent orders and filter by line item properties since
    // Shopify GraphQL doesn't support querying by line item properties directly
    console.log("Fetching custom orders...");
    let customOrdersResponse;
    let allOrders = []; // Initialize before try block
    let queryError = null;
    
    try {
      // Calculate date range - try last 90 days first, then expand if needed
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const dateQuery = ninetyDaysAgo.toISOString().split('T')[0];
      
      console.log("Querying orders from date:", dateQuery);
      console.log("Current date:", now.toISOString().split('T')[0]);
      
      // Try querying ALL orders first (no date filter) to see if we get any results
      customOrdersResponse = await admin.graphql(
        `#graphql
          query getCustomOrders($first: Int!) {
            orders(first: $first) {
              nodes {
                id
                name
                createdAt
                cancelledAt
                displayFulfillmentStatus
                displayFinancialStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                lineItems(first: 10) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant {
                        title
                      }
                      customAttributes {
                        key
                        value
                      }
                    }
                  }
                }
              tags
              displayFulfillmentStatus
            }
          }
        }`,
        {
          variables: {
            first: 250,
          },
        },
      );

      const customOrdersJson = await customOrdersResponse.json();
      console.log("Orders response:", JSON.stringify(customOrdersJson, null, 2));
      
      if (customOrdersJson.errors) {
        console.error("GraphQL errors:", customOrdersJson.errors);
        queryError = `GraphQL errors: ${JSON.stringify(customOrdersJson.errors)}`;
        throw new Error(queryError);
      }
      
      allOrders = customOrdersJson.data?.orders?.nodes || [];
      console.log("Fetched orders count:", allOrders.length);
      
      if (allOrders.length === 0) {
        console.warn("No orders returned. This could mean:");
        console.warn("1. Store has no orders");
        console.warn("2. App doesn't have read_orders permission");
        console.warn("3. Orders are older than what we're querying");
      }
    } catch (graphqlError) {
      console.error("Error fetching orders:", graphqlError);
      console.error("Error stack:", graphqlError.stack);
      queryError = graphqlError.message || String(graphqlError);
      // Don't throw - return empty array so page still loads
      allOrders = [];
    }
    
    // Debug: Log first order to see structure
    if (allOrders.length > 0) {
      console.log("Sample order structure:", JSON.stringify(allOrders[0], null, 2));
      console.log("First order line items:", allOrders[0].lineItems?.edges?.[0]?.node);
    }
    
    // Filter orders that have "_custom_order" property in any line item
    // Since we're using standard cart flow, orders have properties, not tags
    // Also exclude cancelled orders (cancelledAt will be null for non-cancelled orders)
    const customOrders = allOrders.filter(order => {
      // Exclude cancelled orders - cancelledAt will be null for active orders
      if (order.cancelledAt) {
        return false;
      }
      
      const hasCustomOrder = order.lineItems?.edges?.some(({ node: lineItem }) => {
        // Check customAttributes - Shopify uses 'key' not 'name'
        const hasInAttributes = lineItem.customAttributes?.some(attr => 
          attr.key === '_custom_order' && attr.value === 'true'
        );
        
        return hasInAttributes;
      });
      
      if (hasCustomOrder) {
        console.log("Found custom order:", order.name, order.id);
      }
      
      return hasCustomOrder;
    });
    
    console.log("All orders:", allOrders.length, "Custom orders found:", customOrders.length);
    
    // If no custom orders found, log all order properties for debugging
    if (customOrders.length === 0 && allOrders.length > 0) {
      console.log("No custom orders found. Checking first order's line items:");
      allOrders[0].lineItems?.edges?.forEach(({ node: lineItem }, index) => {
        console.log(`Line item ${index}:`, {
          title: lineItem.title,
          customAttributes: lineItem.customAttributes,
          properties: lineItem.properties
        });
      });
    }

    // Calculate previous month stats for comparison
    const previousPendingResponse = await admin.graphql(
      `#graphql
        query getPreviousPending($first: Int!, $query: String!) {
          orders(first: $first, query: $query) {
            nodes {
              id
            }
          }
        }`,
      {
        variables: {
          first: 250,
          query: `created_at:>${sixtyDaysAgo.toISOString().split('T')[0]} AND created_at:<${thirtyDaysAgo.toISOString().split('T')[0]} AND fulfillment_status:unfulfilled`,
        },
      },
    );

    const previousPendingJson = await previousPendingResponse.json();
    const previousPending = previousPendingJson.data?.orders?.nodes?.length || 0;

    const pendingChange = previousPending > 0
      ? ((pendingOrders - previousPending) / previousPending * 100).toFixed(0)
      : pendingOrders > 0 ? "100" : "0";

    const previousCompletedResponse = await admin.graphql(
      `#graphql
        query getPreviousCompleted($first: Int!, $query: String!) {
          orders(first: $first, query: $query) {
            nodes {
              id
            }
          }
        }`,
      {
        variables: {
          first: 250,
          query: `created_at:>${sixtyDaysAgo.toISOString().split('T')[0]} AND created_at:<${thirtyDaysAgo.toISOString().split('T')[0]} AND fulfillment_status:fulfilled`,
        },
      },
    );

    const previousCompletedJson = await previousCompletedResponse.json();
    const previousCompleted = previousCompletedJson.data?.orders?.nodes?.length || 0;

    const completedChange = previousCompleted > 0
      ? ((completedOrders - previousCompleted) / previousCompleted * 100).toFixed(0)
      : completedOrders > 0 ? "100" : "0";

    return { 
      products,
      productTemplateMap,
      templates,
      customOrders: customOrders || [],
      allOrders: allOrders || [], // Include all orders for debugging
      queryError: queryError || null, // Include query error if any
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    console.error("Error details:", error.message, error.stack);
    // Return default values if API call fails - use variables if available
    return { 
      products: products || [],
      productTemplateMap: productTemplateMap || {},
      templates: templates || [],
      customOrders: [],
      allOrders: [], // Include empty array for allOrders
      error: error.message, // Include error message for debugging
      queryError: error.message, // Include query error
    };
  }
};

export const action = async ({ request }) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const intent = formData.get("intent");
    if (intent === "assign-template") {
      const templateId = formData.get("templateId");
      const productId = formData.get("productId");

      if (!templateId || !productId) {
        return { success: false, error: "Template ID and Product ID are required" };
      }

      // Extract numeric product ID from Shopify GID if needed
      const numericProductId = typeof productId === 'string' && productId.includes('/') 
        ? String(productId.split('/').pop()) 
        : String(productId);

      // Remove assignments from OTHER templates for this product
      // This ensures a product can only be assigned to one template at a time
      await prisma.sizeChartProductAssignment.deleteMany({
        where: {
          shop,
          productId: numericProductId,
          templateId: { not: templateId },
        },
      });

      // Check if assignment already exists
      const existingAssignment = await prisma.sizeChartProductAssignment.findFirst({
        where: {
          shop,
          templateId,
          productId: numericProductId,
        },
      });

      if (!existingAssignment) {
        // Get product details from Shopify
        const { admin } = await authenticate.admin(request);
        
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
          await prisma.sizeChartProductAssignment.create({
            data: {
              templateId,
              shop,
              productId: numericProductId,
              productTitle: product.title,
            },
          });
        } else {
          return { success: false, error: "Product not found" };
        }
      }

      return { success: true };
    } else if (intent === "unassign-template") {
      const templateId = formData.get("templateId");
      const productId = formData.get("productId");
      const chartType = formData.get("chartType"); // 'table', 'custom', 'all', or null

      if (!productId) {
        return { success: false, error: "Product ID is required" };
      }

      // Extract numeric product ID from Shopify GID if needed
      const numericProductId = typeof productId === 'string' && productId.includes('/') 
        ? String(productId.split('/').pop()) 
        : String(productId);

      let deletedCount = 0;

      if (chartType) {
        // Remove all templates of the specified type (or all if chartType === 'all')
        const assignments = await prisma.sizeChartProductAssignment.findMany({
          where: {
            shop,
            productId: numericProductId,
          },
        });

        let assignmentsToDelete = [];

        if (chartType === 'all') {
          assignmentsToDelete = assignments.map(a => a.id);
        } else {
          // Filter by template type
          for (const assignment of assignments) {
            const template = await prisma.sizeChartTemplate.findUnique({
              where: { id: assignment.templateId },
            });
            
            if (template) {
              const chartData = typeof template.chartData === 'string'
                ? JSON.parse(template.chartData || '{}')
                : (template.chartData || {});
              
              const isCustom = chartData.isMeasurementTemplate === true;
              
              if (chartType === 'table' && !isCustom) {
                assignmentsToDelete.push(assignment.id);
              } else if (chartType === 'custom' && isCustom) {
                assignmentsToDelete.push(assignment.id);
              }
            }
          }
        }

        // Delete the filtered assignments
        const result = await prisma.sizeChartProductAssignment.deleteMany({
          where: {
            id: { in: assignmentsToDelete },
          },
        });
        deletedCount = result.count;
      } else if (templateId) {
        // Remove specific template (original behavior)
        const result = await prisma.sizeChartProductAssignment.deleteMany({
        where: {
          shop,
          templateId,
          productId: numericProductId,
        },
      });
        deletedCount = result.count;
      } else {
        return { success: false, error: "Either Template ID or Chart Type is required" };
      }

      return { success: true, deletedCount };
    } else if (intent === "cancel-all-charts") {
      const chartType = formData.get("chartType"); // 'table', 'custom', or 'all'
      const selectedProductIdsStr = formData.get("selectedProductIds"); // Comma-separated product IDs or empty
      const selectedProductIds = selectedProductIdsStr ? selectedProductIdsStr.split(',').filter(Boolean) : [];
      
      // Fetch assignments - filter by selected products if any
      const whereClause = selectedProductIds.length > 0
        ? { shop, productId: { in: selectedProductIds } }
        : { shop };
      
      const assignments = await prisma.sizeChartProductAssignment.findMany({
        where: whereClause,
      });

      let assignmentsToDelete = [];
      
      if (chartType === 'all') {
        // Delete all assignments (already filtered by selected products if any)
        assignmentsToDelete = assignments.map(a => a.id);
      } else {
        // Filter assignments by template type - fetch templates separately
        for (const assignment of assignments) {
          const template = await prisma.sizeChartTemplate.findUnique({
            where: { id: assignment.templateId },
          });
          
          if (template) {
            const chartData = typeof template.chartData === 'string'
              ? JSON.parse(template.chartData || '{}')
              : (template.chartData || {});
            
            const isCustom = chartData.isMeasurementTemplate === true;
            
            if (chartType === 'table' && !isCustom) {
              assignmentsToDelete.push(assignment.id);
            } else if (chartType === 'custom' && isCustom) {
              assignmentsToDelete.push(assignment.id);
            }
          }
        }
      }

      // Delete the filtered assignments
      const deletedCount = await prisma.sizeChartProductAssignment.deleteMany({
        where: {
          id: { in: assignmentsToDelete },
        },
      });

      return { success: true, deletedCount: deletedCount.count, chartType };
    } else if (intent === "ready-to-dispatch") {
      const orderId = formData.get("orderId");
      
      if (!orderId) {
        return { success: false, error: "Order ID is required" };
      }

      try {
        // Update order tags to add "ready-to-dispatch"
        // Handle both GID format (gid://shopify/Order/123) and numeric ID
        let orderGid = orderId;
        if (!orderId.startsWith('gid://')) {
          // Extract numeric ID from string like "#1234" or "gid://shopify/Order/1234"
          const numericId = orderId.replace(/^#/, '').replace(/^gid:\/\/shopify\/Order\//, '').replace(/[^0-9]/g, '');
          if (numericId) {
            orderGid = `gid://shopify/Order/${numericId}`;
          } else {
            throw new Error('Invalid order ID format');
          }
        }
        
        // First, get current order to retrieve existing tags
        const getOrderResponse = await admin.graphql(
          `#graphql
            query getOrder($id: ID!) {
              order(id: $id) {
                id
                tags
              }
            }`,
          {
            variables: {
              id: orderGid,
            },
          },
        );

        const orderData = await getOrderResponse.json();
        
        if (orderData.errors) {
          throw new Error(`Failed to fetch order: ${JSON.stringify(orderData.errors)}`);
        }

        const currentTags = orderData.data?.order?.tags || [];
        const tagsArray = Array.isArray(currentTags) ? currentTags : currentTags.split(',').map(t => t.trim()).filter(Boolean);
        
        // Add "ready-to-dispatch" tag if not already present
        if (!tagsArray.includes('ready-to-dispatch')) {
          tagsArray.push('ready-to-dispatch');
        }
        
        const updatedTags = tagsArray.join(', ');

        // Update order with new tags
        const updateResponse = await admin.graphql(
          `#graphql
            mutation orderUpdate($input: OrderInput!) {
              orderUpdate(input: $input) {
                order {
                  id
                  tags
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
          {
            variables: {
              input: {
                id: orderGid,
                tags: updatedTags,
              },
            },
          },
        );

        const updateData = await updateResponse.json();
        
        if (updateData.errors || updateData.data?.orderUpdate?.userErrors?.length > 0) {
          const errors = updateData.errors || updateData.data?.orderUpdate?.userErrors;
          throw new Error(`Failed to update order: ${JSON.stringify(errors)}`);
        }

        return { success: true, message: "Order marked as ready to dispatch" };
      } catch (error) {
        console.error("Error updating order:", error);
        return { success: false, error: error.message };
      }
    } else if (intent === "cancel-dispatch") {
      const orderId = formData.get("orderId");
      
      if (!orderId) {
        return { success: false, error: "Order ID is required" };
      }

      try {
        // Remove "ready-to-dispatch" tag from order
        let orderGid = orderId;
        if (!orderId.startsWith('gid://')) {
          const numericId = orderId.replace(/^#/, '').replace(/^gid:\/\/shopify\/Order\//, '').replace(/[^0-9]/g, '');
          if (numericId) {
            orderGid = `gid://shopify/Order/${numericId}`;
          } else {
            throw new Error('Invalid order ID format');
          }
        }
        
        // Get current order to retrieve existing tags
        const getOrderResponse = await admin.graphql(
          `#graphql
            query getOrder($id: ID!) {
              order(id: $id) {
                id
                tags
              }
            }`,
          {
            variables: {
              id: orderGid,
            },
          },
        );

        const orderData = await getOrderResponse.json();
        
        if (orderData.errors) {
          throw new Error(`Failed to fetch order: ${JSON.stringify(orderData.errors)}`);
        }

        const currentTags = orderData.data?.order?.tags || [];
        const tagsArray = Array.isArray(currentTags) ? currentTags : currentTags.split(',').map(t => t.trim()).filter(Boolean);
        
        // Remove "ready-to-dispatch" tag if present
        const filteredTags = tagsArray.filter(tag => tag !== 'ready-to-dispatch');
        const updatedTags = filteredTags.join(', ');

        // Update order with new tags
        const updateResponse = await admin.graphql(
          `#graphql
            mutation orderUpdate($input: OrderInput!) {
              orderUpdate(input: $input) {
                order {
                  id
                  tags
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
          {
            variables: {
              input: {
                id: orderGid,
                tags: updatedTags,
              },
            },
          },
        );

        const updateData = await updateResponse.json();
        
        if (updateData.errors || updateData.data?.orderUpdate?.userErrors?.length > 0) {
          const errors = updateData.errors || updateData.data?.orderUpdate?.userErrors;
          throw new Error(`Failed to update order: ${JSON.stringify(errors)}`);
        }

        return { success: true, message: "Dispatch cancelled successfully" };
      } catch (error) {
        console.error("Error updating order:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: false, error: "Invalid intent" };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: error.message };
  }
};

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    if (hours === 0) {
      return "Just now";
    }
    const minutes = Math.floor((diffInHours % 1) * 60);
    return `${hours}h ${minutes}m ago`;
  } else if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

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
    return formatDate(dateString);
  }
}

// Memoized Product Row Component to prevent unnecessary re-renders
const ProductRow = React.memo(({ 
  product, 
  assignedTemplates,
  assignedTemplate, 
  hasSizeChart, 
  onViewSizeChart, 
  onOpenTemplateModal,
  onUnassignChart,
  isSelected,
  onSelect
}) => {
  const productId = String(product.id.split("/").pop());
  
  // Use assignedTemplate for backward compatibility (single template display)
  // But pass all templates to onViewSizeChart
  const templatesArray = Array.isArray(assignedTemplates) && assignedTemplates.length > 0 
    ? assignedTemplates 
    : (assignedTemplate ? [assignedTemplate] : []);
  
  // For display purposes, use first template
  const displayTemplate = templatesArray.length > 0 ? templatesArray[0] : assignedTemplate;

  // Calculate counts and status for table and custom charts for this product
  const productChartCounts = React.useMemo(() => {
    let tableCount = 0;
    let customCount = 0;
    let tableActive = false;
    let customActive = false;
    
    templatesArray.forEach((template) => {
      const chartData = typeof template.chartData === 'string' 
        ? JSON.parse(template.chartData || '{}') 
        : (template.chartData || {});
      if (chartData.isMeasurementTemplate) {
        customCount++;
        if (template.active === true) {
          customActive = true;
        }
      } else {
        tableCount++;
        if (template.active === true) {
          tableActive = true;
        }
      }
    });
    
    return { tableCount, customCount, totalCount: tableCount + customCount, tableActive, customActive };
  }, [templatesArray]);

  // Local state for menu in each row
  const [menuAnchor, setMenuAnchor] = React.useState(null);
  
  return (
    <tr
      className="border-b border-[#e1e3e5] hover:bg-[#fafbfb] transition-colors duration-150"
      style={{ backgroundColor: isSelected ? '#f0f9ff' : 'transparent' }}
    >
      {/* Checkbox Column */}
      <td className="py-2.5 pl-4 pr-3 align-middle">
        <Checkbox
          checked={isSelected}
          onChange={(e) => onSelect(productId, e.target.checked)}
          sx={{
            color: '#d1d5db',
            '&.Mui-checked': {
              color: '#202223',
            },
          }}
        />
      </td>

      {/* Product Column */}
      <td className="py-2.5 px-3 align-top">
        <div className="flex items-start gap-3">
          {product.featuredImage ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              className="w-12 h-12 object-cover rounded-lg bg-[#f6f6f7] flex-shrink-0 border border-[#e1e3e5]"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-[#f6f6f7] to-[#e1e3e5] rounded-lg flex items-center justify-center text-[#8c9196] text-lg flex-shrink-0 border border-[#e1e3e5]">
              📷
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#6d7175] mb-1 uppercase tracking-wide">
              ID: <span className="text-[#202223] font-bold">{productId}</span>
            </div>
            <div className="font-bold text-sm text-[#202223] truncate leading-tight" style={{ fontWeight: '600', lineHeight: '1.4' }}>
              {product.title}
            </div>
          </div>
        </div>
      </td>

      {/* Date Column */}
      <td className="py-2.5 px-3 text-sm text-[#5c5f62] text-center align-middle whitespace-nowrap font-medium">
        {formatDateTime(product.updatedAt || product.createdAt)}
      </td>

      {/* Table Chart Status Column */}
      <td className="py-2.5 px-3 text-center align-middle">
        {productChartCounts.tableCount > 0 ? (
          <span className={`inline-flex items-center justify-center px-3 py-1 font-semibold rounded-lg border text-xs min-w-[90px] ${productChartCounts.tableActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`} style={{ fontWeight: '600' }}>
            {productChartCounts.tableActive ? '✓ Active' : 'Not Active'}
            </span>
          ) : (
          <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-50 text-gray-400 font-semibold rounded-lg border border-gray-200 text-xs min-w-[90px]" style={{ fontWeight: '600' }}>
            -
            </span>
        )}
      </td>

      {/* Custom Chart Status Column */}
      <td className="py-2.5 px-3 text-center align-middle">
        {productChartCounts.customCount > 0 ? (
          <span className={`inline-flex items-center justify-center px-3 py-1 font-semibold rounded-lg border text-xs min-w-[90px] ${productChartCounts.customActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`} style={{ fontWeight: '600' }}>
            {productChartCounts.customActive ? '✓ Active' : 'Not Active'}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-50 text-gray-400 font-semibold rounded-lg border border-gray-200 text-xs min-w-[90px]" style={{ fontWeight: '600' }}>
            -
          </span>
        )}
      </td>

      {/* Action Column */}
      <td className="py-2.5 pl-3 pr-4 text-right align-middle">
        {hasSizeChart ? (
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityIcon sx={{ fontSize: '16px' }} />}
              onClick={() => onViewSizeChart(product, templatesArray)}
              sx={{
                textTransform: 'none',
                backgroundColor: '#eff6ff',
                color: '#1e40af',
                borderColor: '#3b82f6',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)',
                '&:hover': {
                  backgroundColor: '#dbeafe',
                  borderColor: '#2563eb',
                  color: '#1e3a8a',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(59, 130, 246, 0.2)',
                },
              }}
            >
              View 
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
                size="small"
                
                endIcon={<ArrowDropDownIcon sx={{ fontSize: '16px' }} />}
                onClick={(e) => {
                  setMenuAnchor(e.currentTarget);
                }}
              sx={{
                textTransform: 'none',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderColor: '#fca5a5',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(220, 38, 38, 0.1)',
                '&:hover': {
                  backgroundColor: '#fee2e2',
                  borderColor: '#f87171',
                  color: '#b91c1c',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(220, 38, 38, 0.2)',
                },
              }}
            >
              Cancel Chart
            </Button>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: '220px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                  {productChartCounts.tableCount > 0 && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        onUnassignChart(product, null, 'table');
                      }}
                      sx={{
                        py: 1.5,
                        px: 2,
                        fontSize: '14px',
                        fontWeight: 500,
                        '&:hover': {
                          backgroundColor: '#fef2f2',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography sx={{ fontWeight: 600, color: '#202223' }}>
                          Remove Table Chart
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#6d7175', mt: 0.5 }}>
                          {productChartCounts.tableCount} chart{productChartCounts.tableCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                  {productChartCounts.customCount > 0 && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        onUnassignChart(product, null, 'custom');
                      }}
                      sx={{
                        py: 1.5,
                        px: 2,
                        fontSize: '14px',
                        fontWeight: 500,
                        '&:hover': {
                          backgroundColor: '#fef2f2',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Typography sx={{ fontWeight: 600, color: '#202223' }}>
                          Remove Custom Chart
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#6d7175', mt: 0.5 }}>
                          {productChartCounts.customCount} chart{productChartCounts.customCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )}
                  {(productChartCounts.tableCount > 0 || productChartCounts.customCount > 0) && (
                    <>
                      <Divider />
                      <MenuItem
                        onClick={() => {
                          setMenuAnchor(null);
                          onUnassignChart(product, null, 'all');
                        }}
                        sx={{
                          py: 1.5,
                          px: 2,
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#dc2626',
                          '&:hover': {
                            backgroundColor: '#fef2f2',
                          },
                        }}
                      >
                        Remove All Charts ({productChartCounts.totalCount})
                      </MenuItem>
                    </>
                  )}
              </Menu>
            </Box>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: '18px' }} />}
            onClick={() => onOpenTemplateModal(product)}
            sx={{
              textTransform: 'none',
              backgroundColor: '#ffffff',
              color: '#374151',
              borderColor: '#e5e7eb',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              '&:hover': {
                backgroundColor: '#f9fafb',
                borderColor: '#d1d5db',
                color: '#111827',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            Set Chart
          </Button>
        )}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders
  const prevTemplates = Array.isArray(prevProps.assignedTemplates) ? prevProps.assignedTemplates : (prevProps.assignedTemplate ? [prevProps.assignedTemplate] : []);
  const nextTemplates = Array.isArray(nextProps.assignedTemplates) ? nextProps.assignedTemplates : (nextProps.assignedTemplate ? [nextProps.assignedTemplate] : []);
  
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.hasSizeChart === nextProps.hasSizeChart &&
    prevProps.isSelected === nextProps.isSelected &&
    prevTemplates.length === nextTemplates.length &&
    prevTemplates.every((t, i) => t?.id === nextTemplates[i]?.id && t?.active === nextTemplates[i]?.active)
  );
});

ProductRow.displayName = 'ProductRow';

export default function Dashboard() {
  const { products,  productTemplateMap = {}, templates = [], customOrders = [], allOrders = [], error, queryError } = useLoaderData();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  
  // Debug: Log what we received
  console.log("Dashboard data loaded:", {
    productsCount: products?.length || 0,
    allOrdersCount: allOrders?.length || 0,
    customOrdersCount: customOrders?.length || 0,
    error: error,
    allOrdersType: typeof allOrders,
    allOrdersIsArray: Array.isArray(allOrders),
    allOrdersValue: allOrders
  });
  
  // Debug function when Custom Orders tab is clicked
  const handleCustomOrdersTabClick = () => {
    console.log("=== CUSTOM ORDERS TAB CLICKED ===");
    console.log("Active tab before:", activeTab);
    console.log("All orders data:", allOrders);
    console.log("All orders type:", typeof allOrders);
    console.log("All orders is array:", Array.isArray(allOrders));
    console.log("All orders length:", allOrders?.length);
    console.log("Custom orders data:", customOrders);
    console.log("Custom orders length:", customOrders?.length);
    console.log("Error:", error);
    
    // Log first order if exists
    if (allOrders && allOrders.length > 0) {
      console.log("First order:", allOrders[0]);
      console.log("First order line items:", allOrders[0].lineItems);
      if (allOrders[0].lineItems?.edges?.length > 0) {
        console.log("First line item:", allOrders[0].lineItems.edges[0].node);
        console.log("First line item customAttributes:", allOrders[0].lineItems.edges[0].node.customAttributes);
        console.log("First line item properties:", allOrders[0].lineItems.edges[0].node.properties);
      }
    } else {
      console.log("No orders found in allOrders array");
    }
    
    setActiveTab("Custom Orders");
    console.log("Active tab after:", "Custom Orders");
    console.log("=== END DEBUG ===");
  };
  const [activeTab, setActiveTab] = useState("Products");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Date");
  const [tableChartStatusFilter, setTableChartStatusFilter] = useState(null);
  const [customChartStatusFilter, setCustomChartStatusFilter] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateSelectionModalOpen, setTemplateSelectionModalOpen] = useState(false);
  const [productToAssign, setProductToAssign] = useState(null);
  const [viewingFromTemplateModal, setViewingFromTemplateModal] = useState(false);
  const [unassignConfirmModalOpen, setUnassignConfirmModalOpen] = useState(false);
  const [productToUnassign, setProductToUnassign] = useState(null);
  const [templateToUnassign, setTemplateToUnassign] = useState(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [measurementsModalOpen, setMeasurementsModalOpen] = useState(false);
  const [selectedOrderMeasurements, setSelectedOrderMeasurements] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [readyToDispatchLoading, setReadyToDispatchLoading] = useState({});
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [templateTabValue, setTemplateTabValue] = useState(0); // 0 = table, 1 = custom
  const [cancelAllConfirmOpen, setCancelAllConfirmOpen] = useState(false);
  const [cancelMenuAnchor, setCancelMenuAnchor] = useState(null);
  const [selectedCancelType, setSelectedCancelType] = useState(null); // 'table', 'custom', or 'all'
  const [selectedProductIds, setSelectedProductIds] = useState(new Set()); // Set of selected product IDs
  const app = useAppBridge();
  
  // Track processed responses to avoid duplicate processing
  const lastProcessedResponseRef = useRef(null);
  const lastSubmittedIntentRef = useRef(null);
  const prevFetcherStateRef = useRef(fetcher.state);
  
  // Handle ready-to-dispatch and cancel-dispatch responses
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const intent = fetcher.formData?.get('intent');
      if (intent === 'ready-to-dispatch' || intent === 'cancel-dispatch') {
        const orderId = fetcher.formData?.get('orderId');
        if (orderId) {
          // Always clear loading state
          setReadyToDispatchLoading(prev => {
            const newState = { ...prev };
            delete newState[orderId];
            return newState;
          });
          
          // Close the menu
          setActionMenuAnchor(null);
          setSelectedOrderForAction(null);
          
          if (fetcher.data.success) {
            // Revalidate to refresh the order list
            revalidator.revalidate();
            if (app?.toast?.show) {
              const message = intent === 'ready-to-dispatch' 
                ? 'Order marked as ready to dispatch!'
                : 'Dispatch cancelled successfully!';
              app.toast.show(message);
            }
          } else if (fetcher.data.error) {
            // Show error message
            if (app?.toast?.show) {
              app.toast.show(`Error: ${fetcher.data.error}`, { isError: true });
            } else {
              alert(`Error: ${fetcher.data.error}`);
            }
          }
        }
      }
    }
  }, [fetcher.state, fetcher.data, fetcher.formData, revalidator, app]);

  // Handle template assignment response
  useEffect(() => {
    // Track state transition from submitting to idle

    const isNowIdle = fetcher.state === "idle";
    prevFetcherStateRef.current = fetcher.state;

    // Only process when fetcher transitions to idle with new data
    const responseKey = fetcher.data ? JSON.stringify(fetcher.data) : null;
    const alreadyProcessed = responseKey && lastProcessedResponseRef.current === responseKey;
    
    // Get intent from formData if available, otherwise use the tracked intent
    const intent = fetcher.formData?.get("intent") || lastSubmittedIntentRef.current;
    
    if (isNowIdle && fetcher.data && !alreadyProcessed && (intent === "assign-template" || intent === "unassign-template" || intent === "cancel-all-charts")) {
      lastProcessedResponseRef.current = responseKey;
      
      if (fetcher.data.success === true) {
        if (app?.toast?.show) {
          if (intent === "cancel-all-charts") {
            const deletedCount = fetcher.data.deletedCount || 0;
            const chartType = fetcher.data.chartType || 'all';
            const typeLabel = chartType === 'table' ? 'table ' : chartType === 'custom' ? 'custom ' : '';
            app.toast.show(`Successfully removed ${deletedCount} ${typeLabel}chart assignment${deletedCount !== 1 ? 's' : ''}!`);
          } else if (intent === "unassign-template") {
            app.toast.show("Template unassigned successfully!");
          } else {
            app.toast.show("Template assigned successfully!");
          }
        }
        
        // Close modals based on intent
        if (intent === "cancel-all-charts") {
          setCancelAllConfirmOpen(false);
          setSelectedCancelType(null);
        } else if (intent === "unassign-template") {
          setUnassignConfirmModalOpen(false);
          // Close template selection modal if it was opened from there
          const productIdToUnassign = productToUnassign?.id;
          const productIdToAssign = productToAssign?.id;
          if (productIdToUnassign && productIdToAssign && productIdToUnassign === productIdToAssign) {
            setTemplateSelectionModalOpen(false);
            setProductToAssign(null);
          }
          setProductToUnassign(null);
          setTemplateToUnassign(null);
          setSelectedCancelType(null);
        } else {
          setTemplateSelectionModalOpen(false);
          setProductToAssign(null);
        }
        
        // Delay revalidation slightly to avoid immediate re-render cascade
        setTimeout(() => {
          revalidator.revalidate();
        }, 100);
      } else if (fetcher.data.success === false) {
        if (app?.toast?.show) {
          if (intent === "cancel-all-charts") {
            app.toast.show(fetcher.data.error || "Failed to cancel all charts. Please try again.");
          } else if (intent === "unassign-template") {
            app.toast.show(fetcher.data.error || "Failed to unassign template. Please try again.");
          } else {
            app.toast.show(fetcher.data.error || "Failed to assign template. Please try again.");
          }
        }
      }
    }
  }, [fetcher.state, fetcher.data, fetcher.formData, app, revalidator, productToUnassign, productToAssign]);

  // Reset response tracking when starting a new assignment
  const handleAssignTemplate = useCallback((templateId) => {
    lastProcessedResponseRef.current = null;
    lastSubmittedIntentRef.current = "assign-template";
    if (productToAssign) {
      fetcher.submit(
        {
          intent: "assign-template",
          templateId,
          productId: productToAssign.id,
        },
        { method: "post" }
      );
    }
  }, [productToAssign, fetcher]);

  const handleUnassignTemplate = useCallback((templateId) => {
    // Find the template object from templates array
    const template = templates.find(t => t.id === templateId);
    if (productToAssign && template) {
      setProductToUnassign(productToAssign);
      setTemplateToUnassign(template);
      setUnassignConfirmModalOpen(true);
    }
  }, [productToAssign, templates]);

  const handleUnassignChart = useCallback((product, assignedTemplate, chartType = null) => {
    setProductToUnassign(product);
    setTemplateToUnassign(assignedTemplate);
    setSelectedCancelType(chartType); // Store chartType for row-level unassign
    setUnassignConfirmModalOpen(true);
  }, []);


  const confirmUnassignChart = useCallback(() => {
    lastProcessedResponseRef.current = null;
    lastSubmittedIntentRef.current = "unassign-template";
    if (productToUnassign) {
      // If chartType is provided, remove all templates of that type
      // Otherwise, remove the specific template
      if (selectedCancelType && selectedCancelType !== 'all') {
        fetcher.submit(
          {
            intent: "unassign-template",
            productId: productToUnassign.id,
            chartType: selectedCancelType, // 'table' or 'custom'
          },
          { method: "post" }
        );
      } else if (selectedCancelType === 'all') {
        fetcher.submit(
          {
            intent: "unassign-template",
            productId: productToUnassign.id,
            chartType: 'all', // Remove all charts for this product
          },
          { method: "post" }
        );
      } else if (templateToUnassign) {
      fetcher.submit(
        {
          intent: "unassign-template",
          templateId: templateToUnassign.id,
          productId: productToUnassign.id,
        },
        { method: "post" }
      );
      }
      // Don't close modal here - wait for API response
    }
  }, [productToUnassign, templateToUnassign, selectedCancelType, fetcher]);

  const handleCloseUnassignConfirmModal = useCallback(() => {
    if (fetcher.state !== "submitting" && fetcher.state !== "loading") {
      setUnassignConfirmModalOpen(false);
      setProductToUnassign(null);
      setTemplateToUnassign(null);
      setSelectedCancelType(null);
      lastSubmittedIntentRef.current = null; // Reset intent tracking
    }
  }, [fetcher.state]);

  const handleViewTemplate = useCallback((template) => {
    // Ensure template is always passed as array for consistency
    setSelectedTemplate(template ? [template] : null);
    setSelectedProduct(productToAssign);
    // Mark that we're viewing from template modal so we can restore it when chart closes
    setViewingFromTemplateModal(true);
    setSizeChartOpen(true);
  }, [productToAssign]);

  // Memoize modal handlers
  const handleOpenTemplateModal = useCallback((product) => {
    setProductToAssign(product);
    setTemplateSelectionModalOpen(true);
  }, []);

  const handleCloseTemplateModal = useCallback(() => {
    if (fetcher.state !== "submitting" && fetcher.state !== "loading") {
      setTemplateSelectionModalOpen(false);
      setProductToAssign(null);
      setViewingFromTemplateModal(false);
      setTemplateSearchQuery(""); // Reset search
      setTemplateTabValue(0); // Reset to table templates tab
      lastProcessedResponseRef.current = null; // Reset response tracking
      lastSubmittedIntentRef.current = null; // Reset intent tracking
    }
  }, [fetcher.state]);

  const handleCloseSizeChart = useCallback(() => {
    setSizeChartOpen(false);
    // If we were viewing from template selection modal, keep it open
    if (viewingFromTemplateModal) {
      setViewingFromTemplateModal(false);
      // Keep template selection modal open - don't reset productToAssign
      // Clear chart modal state but keep template selection modal state
      setSelectedProduct(null);
      setSelectedTemplate(null);
    } else {
      // Normal close - reset everything
      setSelectedProduct(null);
      setSelectedTemplate(null);
    }
  }, [viewingFromTemplateModal]);

  const handleViewSizeChart = useCallback((product, templates) => {
    setSelectedProduct(product);
    // templates can be single template or array of templates
    // Normalize to array
    const templatesArray = Array.isArray(templates) ? templates : (templates ? [templates] : []);
    setSelectedTemplate(templatesArray.length > 0 ? templatesArray : null);
    setSizeChartOpen(true);
  }, []);


  

  // Memoize filtered products to prevent recalculation on every render
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) => {
        const productId = product.id.split("/").pop();
        return (
          productId.includes(query) ||
          product.title.toLowerCase().includes(query) ||
          product.status?.toLowerCase().includes(query)
        );
      });
    }
    
    // Apply table chart status filter
    if (tableChartStatusFilter !== null) {
      filtered = filtered.filter((product) => {
        const productId = String(product.id.split("/").pop());
        const assignedTemplates = productTemplateMap[productId] 
          || productTemplateMap[String(productId)]
          || productTemplateMap[Number(productId)];
        
        // Normalize to array
        const templatesArray = Array.isArray(assignedTemplates) 
          ? assignedTemplates 
          : assignedTemplates 
            ? [assignedTemplates] 
            : [];
        
        // Get only table charts (not measurement templates)
        const tableTemplates = templatesArray.filter(t => {
          const chartData = typeof t.chartData === 'string' 
            ? JSON.parse(t.chartData || '{}') 
            : (t.chartData || {});
          return chartData.isMeasurementTemplate !== true;
        });
        
        const hasTableChart = tableTemplates.length > 0;
        
        if (tableChartStatusFilter === "Active") {
          return hasTableChart && tableTemplates.some(t => t.active === true);
        } else if (tableChartStatusFilter === "Not Active") {
          return hasTableChart && !tableTemplates.some(t => t.active === true);
        } else if (tableChartStatusFilter === "Not Assigned") {
          return !hasTableChart;
        }
        return true;
      });
    }
    
    // Apply custom chart status filter
    if (customChartStatusFilter !== null) {
      filtered = filtered.filter((product) => {
        const productId = String(product.id.split("/").pop());
        const assignedTemplates = productTemplateMap[productId] 
          || productTemplateMap[String(productId)]
          || productTemplateMap[Number(productId)];
        
        // Normalize to array
        const templatesArray = Array.isArray(assignedTemplates) 
          ? assignedTemplates 
          : assignedTemplates 
            ? [assignedTemplates] 
            : [];
        
        // Get only custom charts (measurement templates)
        const customTemplates = templatesArray.filter(t => {
          const chartData = typeof t.chartData === 'string' 
            ? JSON.parse(t.chartData || '{}') 
            : (t.chartData || {});
          return chartData.isMeasurementTemplate === true;
        });
        
        const hasCustomChart = customTemplates.length > 0;
        
        if (customChartStatusFilter === "Active") {
          return hasCustomChart && customTemplates.some(t => t.active === true);
        } else if (customChartStatusFilter === "Not Active") {
          return hasCustomChart && !customTemplates.some(t => t.active === true);
        } else if (customChartStatusFilter === "Not Assigned") {
          return !hasCustomChart;
        }
        return true;
      });
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "Chart Status") {
        const aId = String(a.id.split("/").pop());
        const bId = String(b.id.split("/").pop());
        const aTemplates = productTemplateMap[aId] || productTemplateMap[String(aId)] || productTemplateMap[Number(aId)];
        const bTemplates = productTemplateMap[bId] || productTemplateMap[String(bId)] || productTemplateMap[Number(bId)];
        
        // Normalize to array
        const aTemplatesArray = Array.isArray(aTemplates) ? aTemplates : (aTemplates ? [aTemplates] : []);
        const bTemplatesArray = Array.isArray(bTemplates) ? bTemplates : (bTemplates ? [bTemplates] : []);
        
        const aHasChart = aTemplatesArray.length > 0;
        const bHasChart = bTemplatesArray.length > 0;
        
        if (aHasChart && bHasChart) {
          // Both have charts - sort by active status (active first)
          const aHasActive = aTemplatesArray.some(t => t.active === true);
          const bHasActive = bTemplatesArray.some(t => t.active === true);
          if (aHasActive === bHasActive) {
            return 0;
          }
          return aHasActive ? -1 : 1;
        }
        // Products with charts come first
        return aHasChart ? -1 : bHasChart ? 1 : 0;
      } else {
        // Date (default)
        const aDate = new Date(a.updatedAt || a.createdAt);
        const bDate = new Date(b.updatedAt || b.createdAt);
        return bDate - aDate;
      }
    });
    
    return sorted;
  }, [products, searchQuery, tableChartStatusFilter, customChartStatusFilter, sortBy, productTemplateMap]);

  // Memoize parsed templates to avoid re-parsing on every render
  const parsedTemplates = useMemo(() => {
    return templates.map(template => ({
      ...template,
      chartData: typeof template.chartData === 'string' 
        ? JSON.parse(template.chartData || '{}') 
        : template.chartData,
    }));
  }, [templates]);

  // Filter templates for the modal by type and search query
  const filteredTemplates = useMemo(() => {
    // First filter by template type (table or custom)
    let typeFiltered = parsedTemplates.filter((template) => {
      const chartData = template.chartData || {};
      const isCustom = chartData.isMeasurementTemplate === true;
      // tabValue 0 = table templates, 1 = custom templates
      return templateTabValue === 0 ? !isCustom : isCustom;
    });

    // Then filter by search query if provided
    if (!templateSearchQuery) return typeFiltered;
    const query = templateSearchQuery.toLowerCase();
    return typeFiltered.filter((template) => {
      return (
        template.name.toLowerCase().includes(query) ||
        template.gender?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query)
      );
    });
  }, [parsedTemplates, templateSearchQuery, templateTabValue]);

  // Check if there are any products with assigned charts
  const hasAnyAssignedCharts = useMemo(() => {
    return Object.keys(productTemplateMap || {}).length > 0;
  }, [productTemplateMap]);

  // Calculate counts for table and custom charts
  const chartCounts = useMemo(() => {
    let tableCount = 0;
    let customCount = 0;
    
    Object.values(productTemplateMap || {}).forEach((templatesArray) => {
      if (Array.isArray(templatesArray)) {
        templatesArray.forEach((template) => {
          const chartData = typeof template.chartData === 'string' 
            ? JSON.parse(template.chartData || '{}') 
            : (template.chartData || {});
          if (chartData.isMeasurementTemplate) {
            customCount++;
          } else {
            tableCount++;
          }
        });
      }
    });
    
    return { tableCount, customCount, totalCount: tableCount + customCount };
  }, [productTemplateMap]);

  return (
    <>
    <s-page heading="Dashboard" style={fullWidthStyle} />
       
      <div className="w-full max-w-full px-4 sm:px-6 md:px-8 py-6 sm:py-8 bg-[#f6f6f7] min-h-screen" style={{ ...fullWidthStyle }}>
       

     

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-[#e1e3e5] p-1.5 mb-6 inline-flex gap-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab("Products")}
            className={`px-6 py-3 text-sm font-bold rounded-lg cursor-pointer transition-all duration-200 whitespace-nowrap ${
              activeTab === "Products"
                ? "bg-gradient-to-r from-[#202223] to-[#374151] text-white shadow-md"
                : "text-[#6d7175] hover:text-[#202223] hover:bg-[#f6f6f7]"
            }`}
          >
            Products
          </button>
          <button
            onClick={handleCustomOrdersTabClick}
            className={`px-6 py-3 text-sm font-bold rounded-lg cursor-pointer transition-all duration-200 whitespace-nowrap ${
              activeTab === "Custom Orders"
                ? "bg-gradient-to-r from-[#202223] to-[#374151] text-white shadow-md"
                : "text-[#6d7175] hover:text-[#202223] hover:bg-[#f6f6f7]"
            }`}
          >
            Custom Orders
          </button>
        </div>

      {activeTab === "Products" && (
   <div className="bg-white rounded-xl border border-[#e1e3e5] px-6">
          {/* Search and Filter Bar - Sticky Top Section */}
          <div className="sticky rounded-t-xl top-0 bg-white z-10 pt-6 pb-4 border-b border-[#e1e3e5] -mx-6 px-6 ">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
            <TextField
              fullWidth
              placeholder="Search by ID, name, status..."
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
                    borderColor: '#202223',
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
                {(tableChartStatusFilter !== null || customChartStatusFilter !== null || searchQuery) && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setTableChartStatusFilter(null);
                      setCustomChartStatusFilter(null);
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

              {/* Table Chart Status Filter */}
              <Box sx={{ marginBottom: '16px' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>
                  Table Chart Status
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {["All", "Active", "Not Active", "Not Assigned"].map((status) => {
                    const isAllStatus = status === "All";
                    const isSelected = isAllStatus ? tableChartStatusFilter === null : tableChartStatusFilter === status;
                    
                    return (
                  <Chip
                    key={status}
                    label={status}
                        onClick={() => setTableChartStatusFilter(isAllStatus ? null : status)}
                        variant={isSelected ? "filled" : "outlined"}
                    sx={{
                          ...(isSelected ? {
                            background: 'linear-gradient(to right, #202223, #374151)',
                            color: '#ffffff',
                            borderColor: '#374151',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                          } : {
                            backgroundColor: '#ffffff',
                            color: '#6b7280',
                            borderColor: '#e5e7eb',
                          }),
                      fontWeight: 600,
                      fontSize: '13px',
                      '&:hover': {
                            ...(isSelected ? {
                              background: 'linear-gradient(to right, #202223, #374151)',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            } : {
                              backgroundColor: '#f3f4f6',
                            }),
                      },
                    }}
                  />
                    );
                  })}
              </Box>
            </Box>

              {/* Custom Chart Status Filter */}
              <Box sx={{ marginBottom: '8px' }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>
                  Custom Chart Status
              </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {["All", "Active", "Not Active", "Not Assigned"].map((status) => {
                    const isAllStatus = status === "All";
                    const isSelected = isAllStatus ? customChartStatusFilter === null : customChartStatusFilter === status;
                    
                    return (
                <Chip
                        key={status}
                        label={status}
                        onClick={() => setCustomChartStatusFilter(isAllStatus ? null : status)}
                        variant={isSelected ? "filled" : "outlined"}
                  sx={{
                          ...(isSelected ? {
                            background: 'linear-gradient(to right, #202223, #374151)',
                            color: '#ffffff',
                            borderColor: '#374151',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                          } : {
                            backgroundColor: '#ffffff',
                      color: '#6b7280',
                            borderColor: '#e5e7eb',
                          }),
                          fontWeight: 600,
                          fontSize: '13px',
                          '&:hover': {
                            ...(isSelected ? {
                              background: 'linear-gradient(to right, #202223, #374151)',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            } : {
                              backgroundColor: '#f3f4f6',
                            }),
                    },
                  }}
                />
                    );
                  })}
                </Box>
              </Box>
            </Menu>
            </div>
            {/* Cancel Charts Dropdown Button - Right aligned in same row */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon sx={{ fontSize: '18px' }} />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => {
                  if (hasAnyAssignedCharts) {
                    setCancelMenuAnchor(e.currentTarget);
                  }
                }}
                disabled={!hasAnyAssignedCharts}
                  sx={{
                  textTransform: 'none',
                  backgroundColor: hasAnyAssignedCharts ? '#fef2f2' : '#f9fafb',
                  color: hasAnyAssignedCharts ? '#dc2626' : '#9ca3af',
                  borderColor: hasAnyAssignedCharts ? '#fca5a5' : '#e5e7eb',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: hasAnyAssignedCharts ? '0 1px 2px rgba(220, 38, 38, 0.1)' : 'none',
                  minWidth: { xs: '100%', sm: 'auto' },
                  alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  whiteSpace: 'nowrap',
                  cursor: hasAnyAssignedCharts ? 'pointer' : 'not-allowed',
                  '&:hover': hasAnyAssignedCharts ? {
                    backgroundColor: '#fee2e2',
                    borderColor: '#f87171',
                    color: '#b91c1c',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(220, 38, 38, 0.2)',
                  } : {},
                  '&:disabled': {
                    backgroundColor: '#f9fafb',
                    color: '#9ca3af',
                    borderColor: '#e5e7eb',
                    cursor: 'not-allowed',
                  },
                }}
              >
                Cancel Charts{selectedProductIds.size > 0 ? ` (${selectedProductIds.size})` : ''}
              </Button>
              <Menu
                anchorEl={cancelMenuAnchor}
                open={Boolean(cancelMenuAnchor)}
                onClose={() => setCancelMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: '220px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    setSelectedCancelType('table');
                    setCancelMenuAnchor(null);
                    setCancelAllConfirmOpen(true);
                  }}
                  disabled={chartCounts.tableCount === 0}
                  sx={{
                    py: 1.5,
                    px: 2,
                    fontSize: '14px',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#fef2f2',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography sx={{ fontWeight: 600, color: '#202223' }}>
                      Remove Table Charts
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#6d7175', mt: 0.5 }}>
                      {selectedProductIds.size > 0 
                        ? `${selectedProductIds.size} product${selectedProductIds.size !== 1 ? 's' : ''}`
                        : `${chartCounts.tableCount} chart${chartCounts.tableCount !== 1 ? 's' : ''}`
                      }
                    </Typography>
            </Box>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setSelectedCancelType('custom');
                    setCancelMenuAnchor(null);
                    setCancelAllConfirmOpen(true);
                  }}
                  disabled={chartCounts.customCount === 0}
                  sx={{
                    py: 1.5,
                    px: 2,
                    fontSize: '14px',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#fef2f2',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography sx={{ fontWeight: 600, color: '#202223' }}>
                      Remove Custom Charts
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#6d7175', mt: 0.5 }}>
                      {selectedProductIds.size > 0 
                        ? `${selectedProductIds.size} product${selectedProductIds.size !== 1 ? 's' : ''}`
                        : `${chartCounts.customCount} chart${chartCounts.customCount !== 1 ? 's' : ''}`
                      }
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setSelectedCancelType('all');
                    setCancelMenuAnchor(null);
                    setCancelAllConfirmOpen(true);
                  }}
                  disabled={!hasAnyAssignedCharts}
                  sx={{
                    py: 1.5,
                    px: 2,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#dc2626',
                    '&:hover': {
                      backgroundColor: '#fef2f2',
                    },
                  }}
                >
                  Remove All Charts ({selectedProductIds.size > 0 ? selectedProductIds.size : chartCounts.totalCount})
                </MenuItem>
              </Menu>
            </Box>
          </div>


          </div>

          {/* Products Table */}
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-[#6d7175] text-base font-medium mb-2">No products found</div>
              <div className="text-[#8c9196] text-sm">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[800px]" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr className="border-b-2 border-[#e1e3e5]">
                  <th className="py-2.5 pl-4 pr-3 text-center font-bold text-xs text-[#6b7280] uppercase tracking-wider bg-[#f9fafb]" style={{ fontWeight: '700', letterSpacing: '0.8px', width: '50px', position: 'sticky', top: '0', zIndex: 5 }}>
                    <Checkbox
                      checked={selectedProductIds.size > 0 && selectedProductIds.size === filteredProducts.length}
                      indeterminate={selectedProductIds.size > 0 && selectedProductIds.size < filteredProducts.length}
                      onChange={(e) => {
                        setSelectedProductIds(prevSet => {
                          if (e.target.checked) {
                            const allIds = new Set(filteredProducts.map(p => String(p.id.split("/").pop())));
                            return allIds;
                          } else {
                            return new Set();
                          }
                        });
                      }}
                      sx={{
                        color: '#9ca3af',
                        '&.Mui-checked': {
                          color: '#000000',
                        },
                        '&.MuiCheckbox-indeterminate': {
                          color: '#000000',
                        },
                      }}
                    />
                  </th>
                  <th className="py-2.5 px-3 text-left font-bold text-xs text-[#6d7175] uppercase tracking-wider bg-[#f9fafb]" style={{ fontWeight: '700', letterSpacing: '0.8px', position: 'sticky', top: '0', zIndex: 5 }}>Product</th>
                  <th className="py-2.5 px-3 text-center font-bold text-xs text-[#6d7175] uppercase tracking-wider bg-[#f9fafb]" style={{ fontWeight: '700', letterSpacing: '0.8px', position: 'sticky', top: '0', zIndex: 5 }}>Date</th>
                  <th className="py-2.5 px-3 text-center font-bold text-xs text-[#6d7175] uppercase tracking-wider bg-[#f9fafb]" style={{ fontWeight: '700', letterSpacing: '0.8px', position: 'sticky', top: '0', zIndex: 5 }}>Table Chart Status</th>
                  <th className="py-2.5 px-3 text-center font-bold text-xs text-[#6d7175] uppercase tracking-wider bg-[#f9fafb]" style={{ fontWeight: '700', letterSpacing: '0.8px', position: 'sticky', top: '0', zIndex: 5 }}>Custom Chart Status</th>
                  <th className="py-2.5 pl-3 pr-4 text-right font-bold text-xs text-[#6d7175] uppercase tracking-wider bg-[#f9fafb]" style={{ fontWeight: '700', letterSpacing: '0.8px', position: 'sticky', top: '0', zIndex: 5 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  // Extract numeric product ID from Shopify GID (format: gid://shopify/Product/123456)
                  const productId = String(product.id.split("/").pop());
                  
                  // Check if product has assigned templates (can be array or single template)
                  // Try multiple formats to ensure we find it
                  const assignedTemplates = productTemplateMap[productId] 
                    || productTemplateMap[String(productId)]
                    || productTemplateMap[Number(productId)];
                  
                  // Normalize to array
                  const templatesArray = Array.isArray(assignedTemplates) 
                    ? assignedTemplates 
                    : assignedTemplates 
                      ? [assignedTemplates] 
                      : [];
                  
                  const hasSizeChart = templatesArray.length > 0;
                  
                  // Debug logging for assigned products
                  if (templatesArray.length > 0) {
                    console.log(`[Dashboard] Product ${productId} has ${templatesArray.length} assigned template(s):`, 
                      templatesArray.map(t => t.name).join(', '));
                  }

                  return (
                    <ProductRow
                      key={product.id}
                      product={product}
                      assignedTemplates={templatesArray}
                      assignedTemplate={templatesArray.length > 0 ? templatesArray[0] : null}
                      hasSizeChart={hasSizeChart}
                      onViewSizeChart={handleViewSizeChart}
                      onOpenTemplateModal={handleOpenTemplateModal}
                      onUnassignChart={handleUnassignChart}
                      isSelected={selectedProductIds.has(productId)}
                      onSelect={(id, checked) => {
                        setSelectedProductIds(prevSet => {
                          const newSet = new Set(prevSet);
                          if (checked) {
                            newSet.add(id);
                          } else {
                            newSet.delete(id);
                          }
                          return newSet;
                        });
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "Custom Orders" && (
        <div className="bg-white rounded-xl border border-[#e1e3e5]">
          <div className="p-6 border-b border-[#e1e3e5]">
            <h2 className="text-xl font-semibold text-[#202223]">Custom Orders</h2>
            <p className="text-sm text-[#6d7175] mt-1">
              Orders with custom measurements ({customOrders?.length || 0} {customOrders?.length === 1 ? 'order' : 'orders'})
            </p>
            {(error || queryError) && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-sm text-red-700 font-semibold">Error loading orders:</div>
                <div className="text-xs text-red-600 mt-1">{error || queryError}</div>
              </div>
            )}
          </div>
          
          {!customOrders || customOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-[#6d7175] text-lg font-semibold mb-2">No Custom Orders</div>
              <div className="text-[#8c9196] text-sm">
                Custom orders will appear here once customers place orders with measurements.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f6f6f7] border-b border-[#e1e3e5]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Measurements</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#202223] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#e1e3e5]">
                  {customOrders.map((order) => {
                    const orderTotal = order.totalPriceSet?.shopMoney?.amount || '0';
                    const currency = order.totalPriceSet?.shopMoney?.currencyCode || 'USD';
                    const orderDate = formatDateTime(order.createdAt);
                    
                    // Extract measurements from line item properties
                    const measurements = [];
                    
                    order.lineItems?.edges?.forEach(({ node: lineItem }) => {
                      if (lineItem.customAttributes) {
                        lineItem.customAttributes.forEach((attr) => {
                          // Exclude the _custom_order marker, only show actual measurements
                          if (attr.key !== '_custom_order' && attr.value) {
                            measurements.push({ name: attr.key, value: attr.value });
                          }
                        });
                      }
                    });

                    // Get product title from first line item
                    const productTitle = order.lineItems?.edges?.[0]?.node?.title || 'N/A';
                    const variantTitle = order.lineItems?.edges?.[0]?.node?.variant?.title || '';
                    const quantity = order.lineItems?.edges?.[0]?.node?.quantity || 1;

                    // Status badges with clearer labels
                    const fulfillmentStatus = order.displayFulfillmentStatus || 'UNFULFILLED';
                    const financialStatus = order.displayFinancialStatus || 'PENDING';
                    
                    const getStatusInfo = (status, type) => {
                      const statusLower = status?.toLowerCase() || '';
                      let label = '';
                      let className = '';
                      
                      if (type === 'fulfillment') {
                        if (statusLower.includes('fulfilled')) {
                          label = 'Fulfilled';
                          className = 'bg-green-50 text-green-700 border-green-200';
                        } else if (statusLower.includes('partial')) {
                          label = 'Partially Fulfilled';
                          className = 'bg-blue-50 text-blue-700 border-blue-200';
                        } else {
                          label = 'Unfulfilled';
                          className = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                        }
                      } else if (type === 'payment') {
                        if (statusLower.includes('paid')) {
                          label = 'Paid';
                          className = 'bg-green-50 text-green-700 border-green-200';
                        } else if (statusLower.includes('partial')) {
                          label = 'Partially Paid';
                          className = 'bg-blue-50 text-blue-700 border-blue-200';
                        } else if (statusLower.includes('pending')) {
                          label = 'Pending Payment';
                          className = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                        } else if (statusLower.includes('refunded')) {
                          label = 'Refunded';
                          className = 'bg-red-50 text-red-700 border-red-200';
                        } else {
                          label = 'Pending';
                          className = 'bg-gray-50 text-gray-700 border-gray-200';
                        }
                      }
                      
                      return { label, className };
                    };
                    
                    const fulfillmentInfo = getStatusInfo(fulfillmentStatus, 'fulfillment');
                    const paymentInfo = getStatusInfo(financialStatus, 'payment');

                    return (
                      <tr key={order.id} className="hover:bg-[#fafbfb] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-[#202223]">{order.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-[#202223]">{productTitle}</div>
                          {quantity > 1 && (
                            <div className="text-xs text-[#6d7175]">Qty: {quantity}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {measurements.length > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedOrderMeasurements(measurements);
                                setSelectedOrderId(order.name);
                                setMeasurementsModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#202223] bg-white border border-[#202223] rounded-md hover:bg-[#202223] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                              style={{
                                minWidth: '80px',
                              }}
                            >
                              <VisibilityIcon sx={{ fontSize: '16px', marginRight: '6px' }} />
                              View
                            </button>
                          ) : (
                            <span className="text-xs text-[#8c9196]">No measurements</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#202223]">{orderDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-[#202223]">
                            {currency} {parseFloat(orderTotal).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center px-3 py-1.5 font-semibold rounded-md border text-sm ${paymentInfo.className}`}>
                            {paymentInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <IconButton
                            onClick={(e) => {
                              setActionMenuAnchor(e.currentTarget);
                              setSelectedOrderForAction(order);
                            }}
                            disabled={readyToDispatchLoading[order.id]}
                            size="small"
                            sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            {readyToDispatchLoading[order.id] ? (
                              <CircularProgress size={20} />
                            ) : (
                              <MoreVertIcon />
                            )}
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
   </div>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => {
          setActionMenuAnchor(null);
          setSelectedOrderForAction(null);
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            minWidth: '220px',
            padding: '8px 0',
            border: '1px solid #e1e3e5',
          },
        }}
        MenuListProps={{
          sx: {
            padding: 0,
          },
        }}
      >
        {selectedOrderForAction && (() => {
          const tags = selectedOrderForAction.tags || [];
          const tagsArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : []);
          const isReadyToDispatch = tagsArray.includes('ready-to-dispatch');
          
          return (
            <>
              {!isReadyToDispatch ? (
                <MenuItem
                  onClick={() => {
                    const orderId = selectedOrderForAction.id;
                    setReadyToDispatchLoading(prev => ({ ...prev, [orderId]: true }));
                    
                    // Close the menu immediately when API call starts
                    setActionMenuAnchor(null);
                    setSelectedOrderForAction(null);
                    
                    const formData = new FormData();
                    formData.append('intent', 'ready-to-dispatch');
                    formData.append('orderId', orderId);
                    
                    fetcher.submit(formData, { method: 'post' });
                    
                    // Fallback: clear loading state after 10 seconds if no response
                    setTimeout(() => {
                      setReadyToDispatchLoading(prev => {
                        if (prev[orderId]) {
                          const newState = { ...prev };
                          delete newState[orderId];
                          return newState;
                        }
                        return prev;
                      });
                    }, 10000);
                  }}
                  disabled={readyToDispatchLoading[selectedOrderForAction.id]}
                  sx={{
                    py: 1.75,
                    px: 2.5,
                    mx: 0.5,
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, width: '100%' }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: '#4caf50', fontSize: '16px', fontWeight: 'bold' }}>✓</span>
                    </Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#202223' }}>
                      Ready to Dispatch
                    </Typography>
                  </Box>
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => {
                    const orderId = selectedOrderForAction.id;
                    setReadyToDispatchLoading(prev => ({ ...prev, [orderId]: true }));
                    
                    // Close the menu immediately when API call starts
                    setActionMenuAnchor(null);
                    setSelectedOrderForAction(null);
                    
                    const formData = new FormData();
                    formData.append('intent', 'cancel-dispatch');
                    formData.append('orderId', orderId);
                    
                    fetcher.submit(formData, { method: 'post' });
                    
                    // Fallback: clear loading state after 10 seconds if no response
                    setTimeout(() => {
                      setReadyToDispatchLoading(prev => {
                        if (prev[orderId]) {
                          const newState = { ...prev };
                          delete newState[orderId];
                          return newState;
                        }
                        return prev;
                      });
                    }, 10000);
                  }}
                  disabled={readyToDispatchLoading[selectedOrderForAction.id]}
                  sx={{
                    py: 1.75,
                    px: 2.5,
                    mx: 0.5,
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.5,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, width: '100%' }}>
                    <Box
                      sx={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: '#ff9800', fontSize: '16px', fontWeight: 'bold' }}>✕</span>
                    </Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#202223' }}>
                      Cancel Dispatch
                    </Typography>
                  </Box>
                </MenuItem>
              )}
            </>
          );
        })()}
      </Menu>

      {/* Measurements View Modal */}
      <Dialog
        open={measurementsModalOpen}
        onClose={() => setMeasurementsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid #e1e3e5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#202223', fontSize: '20px' }}>
            Order Measurements
          </Typography>
          <IconButton
            onClick={() => setMeasurementsModalOpen(false)}
            size="small"
            sx={{
              color: '#6d7175',
              '&:hover': {
                backgroundColor: '#f6f6f7',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: '24px' }}>
          <div id="measurements-print-content">
            <Box sx={{ marginBottom: '24px' }}>
              <Typography
                variant="h5"
                sx={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#202223',
                  marginBottom: '4px',
                }}
              >
                Order: {selectedOrderId}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '14px',
                  color: '#6d7175',
                  fontWeight: 500,
                }}
              >
                Custom Measurements
              </Typography>
            </Box>
            {selectedOrderMeasurements && selectedOrderMeasurements.length > 0 ? (
              <Box
                sx={{
                  border: '1px solid #e1e3e5',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f6f6f7' }}>
                      <th
                        style={{
                          padding: '16px 20px',
                          textAlign: 'left',
                          borderBottom: '2px solid #e1e3e5',
                          fontWeight: 600,
                          color: '#202223',
                          fontSize: '13px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Measurement
                      </th>
                      <th
                        style={{
                          padding: '16px 20px',
                          textAlign: 'right',
                          borderBottom: '2px solid #e1e3e5',
                          fontWeight: 600,
                          color: '#202223',
                          fontSize: '13px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrderMeasurements.map((measurement, idx) => (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfb',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <td
                          style={{
                            padding: '16px 20px',
                            borderBottom: idx === selectedOrderMeasurements.length - 1 ? 'none' : '1px solid #e1e3e5',
                            color: '#202223',
                            fontWeight: 500,
                            fontSize: '14px',
                          }}
                        >
                          {measurement.name}
                        </td>
                        <td
                          style={{
                            padding: '16px 20px',
                            borderBottom: idx === selectedOrderMeasurements.length - 1 ? 'none' : '1px solid #e1e3e5',
                            color: '#202223',
                            fontWeight: 600,
                            fontSize: '15px',
                            textAlign: 'right',
                          }}
                        >
                          {measurement.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Box
                sx={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#6d7175',
                }}
              >
                <Typography variant="body1" sx={{ fontSize: '16px', fontWeight: 500 }}>
                  No measurements found
                </Typography>
              </Box>
            )}
          </div>
        </DialogContent>
        <DialogActions
          sx={{
            padding: '16px 24px',
            borderTop: '1px solid #e1e3e5',
            justifyContent: 'space-between',
          }}
        >
          <Button
            onClick={() => {
              const printContent = document.getElementById('measurements-print-content');
              const printWindow = window.open('', '_blank');
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Order Measurements - ${selectedOrderId}</title>
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 40px; }
                      h1 { color: #202223; margin-bottom: 8px; font-size: 28px; font-weight: 700; }
                      h2 { color: #6d7175; font-size: 14px; margin-bottom: 24px; font-weight: 500; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #e1e3e5; border-radius: 8px; overflow: hidden; }
                      th, td { padding: 16px 20px; text-align: left; }
                      th { background-color: #f6f6f7; font-weight: 600; color: #202223; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e1e3e5; }
                      td { color: #202223; font-size: 14px; border-bottom: 1px solid #e1e3e5; }
                      tr:last-child td { border-bottom: none; }
                      @media print { body { padding: 20px; } }
                    </style>
                  </head>
                  <body>
                    ${printContent?.innerHTML || ''}
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }}
            variant="contained"
            startIcon={<PrintIcon />}
            sx={{
              backgroundColor: '#202223',
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              '&:hover': {
                backgroundColor: '#374151',
              },
            }}
          >
            Print
          </Button>
          <Button
            onClick={() => setMeasurementsModalOpen(false)}
            variant="outlined"
            sx={{
              borderColor: '#e1e3e5',
              color: '#202223',
              fontWeight: 500,
              textTransform: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              '&:hover': {
                borderColor: '#202223',
                backgroundColor: '#f6f6f7',
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Size Chart Modal */}
      <SizeChart
        open={sizeChartOpen}
        onClose={handleCloseSizeChart}
        brandName={selectedProduct?.vendor || selectedProduct?.title || "ALPHA TRIBE"}
        productName={selectedProduct?.title || null}
        templates={selectedTemplate}
        productId={selectedProduct?.id ? selectedProduct.id.split("/").pop() : null}
      />

      {/* Template Selection Modal */}
      <Dialog
        open={templateSelectionModalOpen}
        onClose={handleCloseTemplateModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            maxHeight: '90vh',
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
                Assigning template...
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
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#111827',
                marginBottom: '4px',
              }}
            >
              Select Template
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              Choose a size chart template to assign to this product
            </Typography>
          </Box>
          <Button
            onClick={handleCloseTemplateModal}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              minWidth: 'auto',
              padding: '8px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <CloseIcon />
          </Button>
        </DialogTitle>

        <DialogContent sx={{ padding: '0' }}>
          {/* Filter Row with Tabs and Search */}
          {parsedTemplates.length > 0 && (
            <Box sx={{ 
              borderBottom: '1px solid #e5e7eb', 
              backgroundColor: '#f9fafb',
              px: 3,
              py: 2,
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
              }}>
                {/* Tabs */}
                <Box sx={{ 
                  flex: { xs: '1 1 100%', sm: '0 0 auto' },
                  minWidth: 0,
                }}>
                  <Tabs 
                    value={templateTabValue}
                    onChange={(e, newValue) => setTemplateTabValue(newValue)}
                    sx={{
                      minHeight: '40px',
                      '& .MuiTabs-flexContainer': {
                        gap: '8px',
                      },
                      '& .MuiTab-root': {
                        minHeight: '40px',
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'none',
                        color: '#6d7175',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        border: '1px solid transparent',
                        '&:hover': {
                          backgroundColor: '#ffffff',
                          color: '#202223',
                        },
                        '&.Mui-selected': {
                          color: '#202223',
                          backgroundColor: '#ffffff',
                          borderColor: '#d1d5db',
                          border: '1px solid #d1d5db',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        },
                      },
                      '& .MuiTabs-indicator': {
                        display: 'none',
                      },
                    }}
                  >
                    <Tab label="Table Template" />
                    <Tab label="Custom Size Template" />
                  </Tabs>
                </Box>

                {/* Search Bar */}
                <Box sx={{ 
                  flex: { xs: '1 1 100%', sm: '1 1 auto' },
                  minWidth: { xs: '100%', sm: '200px' },
                  maxWidth: { xs: '100%', sm: '400px' },
                }}>
              <TextField
                fullWidth
                    placeholder="Search templates..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#6b7280', fontSize: '18px' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                      backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-root': {
                        fontSize: '13px',
                    color: '#202223',
                    borderRadius: '8px',
                        height: '40px',
                    '& fieldset': {
                      borderColor: '#e1e3e5',
                      borderWidth: '1px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#c9cccf',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#202223',
                          borderWidth: '1.5px',
                    },
                  },
                  '& .MuiInputBase-input': {
                        padding: '8px 12px',
                        height: '40px',
                        boxSizing: 'border-box',
                  },
                }}
              />
                </Box>
              </Box>
            </Box>
          )}

          <Box sx={{  maxHeight: '60vh' }}>
            {parsedTemplates.length === 0 ? (
              <Box sx={{ textAlign: 'center', padding: '60px 20px' }}>
                <Box
                  sx={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Typography sx={{ fontSize: '32px' }}>📋</Typography>
                </Box>
                <Typography sx={{ fontSize: '16px', color: '#111827', fontWeight: 600, marginBottom: '8px' }}>
                  No templates available
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>
                  Please create a template first before assigning it to products.
                </Typography>
              </Box>
            ) : filteredTemplates.length === 0 ? (
              <Box sx={{ textAlign: 'center', padding: '40px 20px' }}>
                <Typography sx={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
                  No templates found
                </Typography>
                <Typography sx={{ fontSize: '14px', color: '#9ca3af' }}>
                  Try adjusting your search query
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 ,padding: '24px'}}>
                {filteredTemplates.map((template) => {
                // Check if this template is currently assigned to the product
                const productId = productToAssign ? String(productToAssign.id.split("/").pop()) : null;
                const assignedTemplate = productId 
                  ? (productTemplateMap[productId] || productTemplateMap[String(productId)] || productTemplateMap[Number(productId)])
                  : null;
                const isCurrentlyAssigned = assignedTemplate && assignedTemplate.id === template.id;

                return (
                  <Box
                    key={template.id}
                    sx={{
                      padding: '10px',
                      border: isCurrentlyAssigned ? '2px solid #10b981' : '1px solid #e5e7eb',
                      borderRadius: '5px',
                      backgroundColor: isCurrentlyAssigned ? '#f0fdf4' : '#ffffff',
                      transition: 'all 0.2s',
                      boxShadow: isCurrentlyAssigned ? '0 2px 8px rgba(16, 185, 129, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                      '&:hover': {
                        borderColor: isCurrentlyAssigned ? '#10b981' : '#3b82f6',
                        backgroundColor: isCurrentlyAssigned ? '#f0fdf4' : '#f9fafb',
                        boxShadow: isCurrentlyAssigned ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, marginBottom: '12px', flexWrap: 'wrap' }}>
                          <Typography
                            sx={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: '#111827',
                              lineHeight: 1.3,
                            }}
                          >
                            {template.name}
                          </Typography>
                          {isCurrentlyAssigned && (
                            <Chip
                              label="Currently Assigned"
                              size="small"
                              sx={{
                                fontSize: '11px',
                                height: '24px',
                                color: '#10b981',
                                backgroundColor: '#d1fae5',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                border: '1px solid #10b981',
                                '& .MuiChip-label': {
                                  padding: '0 8px',
                                },
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                          {template.gender && (
                            <Chip
                              label={template.gender.charAt(0).toUpperCase() + template.gender.slice(1)}
                              size="small"
                              sx={{
                                fontSize: '12px',
                                height: '28px',
                                color: '#374151',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                  padding: '0 10px',
                                },
                              }}
                            />
                          )}
                          {template.category && (
                            <Chip
                              label={template.category}
                              size="small"
                              sx={{
                                fontSize: '12px',
                                height: '28px',
                                color: '#374151',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                  padding: '0 10px',
                                },
                              }}
                            />
                          )}
                          <Chip
                            label={template.active ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              fontSize: '12px',
                              height: '28px',
                              color: template.active ? '#10b981' : '#ef4444',
                              backgroundColor: template.active ? '#d1fae5' : '#fee2e2',
                              border: `1px solid ${template.active ? '#10b981' : '#ef4444'}`,
                              fontWeight: 600,
                              '& .MuiChip-label': {
                                padding: '0 10px',
                              },
                            }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                          variant="outlined"
                          startIcon={<VisibilityIcon sx={{ fontSize: '18px' }} />}
                          onClick={() => handleViewTemplate(template)}
                          disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
                          sx={{
                            textTransform: 'none',
                            backgroundColor: '#ffffff',
                            color: '#6b7280',
                            borderColor: '#e5e7eb',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: '#ffffff',
                              borderColor: '#e5e7eb',
                              color: '#6b7280',
                            },
                            '&:disabled': {
                              backgroundColor: '#e5e7eb',
                              color: '#9ca3af',
                              borderColor: '#e5e7eb',
                            },
                          }}
                        >
                          View
                        </Button>
                        {isCurrentlyAssigned ? (
                          <Button
                            variant="outlined"
                            onClick={() => handleUnassignTemplate(template.id)}
                            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
                            sx={{
                              textTransform: 'none',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              padding: '8px 20px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: '#fee2e2',
                                borderColor: '#f87171',
                                color: '#dc2626',
                              },
                              '&:disabled': {
                                backgroundColor: '#e5e7eb',
                                color: '#9ca3af',
                                borderColor: '#e5e7eb',
                              },
                            }}
                          >
                            Cancel Chart
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            startIcon={<AddIcon sx={{ fontSize: '18px' }} />}
                            onClick={() => handleAssignTemplate(template.id)}
                            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
                            sx={{
                              textTransform: 'none',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '10px 24px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 700,
                              letterSpacing: '0.3px',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25), 0 1px 2px rgba(59, 130, 246, 0.15)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 12px rgba(59, 130, 246, 0.35), 0 2px 4px rgba(59, 130, 246, 0.2)',
                              },
                              '&:active': {
                                transform: 'translateY(0)',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25), 0 1px 2px rgba(59, 130, 246, 0.15)',
                              },
                              '&:disabled': {
                                background: '#e5e7eb',
                                color: '#9ca3af',
                                transform: 'none',
                                boxShadow: 'none',
                                cursor: 'not-allowed',
                              },
                            }}
                          >
                            Assign Chart
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCloseTemplateModal}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              textTransform: 'none',
              backgroundColor: '#ffffff',
              color: '#6b7280',
              borderColor: '#e5e7eb',
              border: '1px solid',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                color: '#6b7280',
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                borderColor: '#e5e7eb',
              },
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unassign Confirmation Modal */}
      <Dialog
        open={unassignConfirmModalOpen}
        onClose={handleCloseUnassignConfirmModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Typography
            sx={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Confirm Cancel Chart
          </Typography>
          <Button
            onClick={handleCloseUnassignConfirmModal}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              minWidth: 'auto',
              padding: '8px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <CloseIcon />
          </Button>
        </DialogTitle>

        <DialogContent >
          <Typography
            sx={{
              fontSize: '16px',
              color: '#374151',
              marginBottom: '16px',
              paddingTop: '24px',
            }}
          >
            {selectedCancelType === 'table' 
              ? 'Are you sure you want to remove all table charts from this product?'
              : selectedCancelType === 'custom'
              ? 'Are you sure you want to remove all custom charts from this product?'
              : selectedCancelType === 'all'
              ? 'Are you sure you want to remove all charts from this product?'
              : 'Are you sure you want to cancel the assignment of this chart template from the product?'}
          </Typography>
          {productToUnassign && (
            <Box
              sx={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
            >
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}
              >
                Product: {productToUnassign.title}
              </Typography>
              {selectedCancelType ? (
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#6b7280',
                  }}
                >
                  Chart Type: {selectedCancelType === 'table' ? 'Table Charts' : selectedCancelType === 'custom' ? 'Custom Charts' : 'All Charts'}
                </Typography>
              ) : templateToUnassign && (
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: '#6b7280',
                  }}
                >
                  Template: {templateToUnassign.name}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            justifyContent: 'flex-end',
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCloseUnassignConfirmModal}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              textTransform: 'none',
              backgroundColor: '#ffffff',
              color: '#6b7280',
              borderColor: '#e5e7eb',
              border: '1px solid',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                color: '#6b7280',
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                borderColor: '#e5e7eb',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={confirmUnassignChart}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              textTransform: 'none',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderColor: '#fca5a5',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#fee2e2',
                borderColor: '#f87171',
                color: '#dc2626',
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                borderColor: '#e5e7eb',
              },
            }}
          >
            {fetcher.state === "submitting" || fetcher.state === "loading" ? "Canceling..." : "Confirm Cancel"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel All Charts Confirmation Modal */}
      <Dialog
        open={cancelAllConfirmOpen}
        onClose={() => {
          if (fetcher.state !== "submitting" && fetcher.state !== "loading") {
            setCancelAllConfirmOpen(false);
            setSelectedCancelType(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Typography
            sx={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            {selectedCancelType === 'table' ? 'Remove Table Charts' :
             selectedCancelType === 'custom' ? 'Remove Custom Charts' :
             'Cancel All Chart Assignments'}
          </Typography>
          <Button
            onClick={() => {
              if (fetcher.state !== "submitting" && fetcher.state !== "loading") {
                setCancelAllConfirmOpen(false);
                setSelectedCancelType(null);
              }
            }}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              minWidth: 'auto',
              padding: '8px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            <CloseIcon />
          </Button>
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              fontSize: '16px',
              color: '#374151',
              marginBottom: '16px',
              paddingTop: '24px',
            }}
          >
            {selectedProductIds.size > 0 
              ? selectedCancelType === 'table'
                ? `Are you sure you want to remove table charts from ${selectedProductIds.size} selected product${selectedProductIds.size !== 1 ? 's' : ''}? This action cannot be undone.`
                : selectedCancelType === 'custom'
                ? `Are you sure you want to remove custom charts from ${selectedProductIds.size} selected product${selectedProductIds.size !== 1 ? 's' : ''}? This action cannot be undone.`
                : `Are you sure you want to remove all charts from ${selectedProductIds.size} selected product${selectedProductIds.size !== 1 ? 's' : ''}? This action cannot be undone.`
              : selectedCancelType === 'table' 
                ? `Are you sure you want to remove ${chartCounts.tableCount} table chart assignment${chartCounts.tableCount !== 1 ? 's' : ''}? This action cannot be undone.`
                : selectedCancelType === 'custom'
                ? `Are you sure you want to remove ${chartCounts.customCount} custom chart assignment${chartCounts.customCount !== 1 ? 's' : ''}? This action cannot be undone.`
                : 'Are you sure you want to cancel all chart assignments for all products? This action cannot be undone.'}
          </Typography>
          <Box
            sx={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#991b1b',
                marginBottom: '4px',
              }}
            >
              ⚠️ Warning: This will remove {selectedCancelType === 'table' 
                ? `${chartCounts.tableCount} table chart assignment${chartCounts.tableCount !== 1 ? 's' : ''}`
                : selectedCancelType === 'custom'
                ? `${chartCounts.customCount} custom chart assignment${chartCounts.customCount !== 1 ? 's' : ''}`
                : 'all size chart assignments from all products'}.
            </Typography>
            <Typography
              sx={{
                fontSize: '13px',
                color: '#7f1d1d',
              }}
            >
              You will need to reassign charts individually if needed.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            justifyContent: 'flex-end',
            gap: 1.5,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              if (fetcher.state !== "submitting" && fetcher.state !== "loading") {
                setCancelAllConfirmOpen(false);
                setSelectedCancelType(null);
              }
            }}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              textTransform: 'none',
              backgroundColor: '#ffffff',
              color: '#6b7280',
              borderColor: '#e5e7eb',
              border: '1px solid',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                color: '#6b7280',
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                borderColor: '#e5e7eb',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              lastProcessedResponseRef.current = null;
              lastSubmittedIntentRef.current = "cancel-all-charts";
              const selectedIdsArray = Array.from(selectedProductIds);
              fetcher.submit(
                { 
                  intent: "cancel-all-charts",
                  chartType: selectedCancelType || 'all',
                  selectedProductIds: selectedIdsArray.join(','),
                },
                { method: "post" }
              );
            }}
            disabled={fetcher.state === "submitting" || fetcher.state === "loading"}
            sx={{
              textTransform: 'none',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderColor: '#fca5a5',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: '#fee2e2',
                borderColor: '#f87171',
                color: '#dc2626',
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                borderColor: '#e5e7eb',
              },
            }}
          >
            {fetcher.state === "submitting" || fetcher.state === "loading" ? "Canceling All..." : "Confirm Cancel All"}
          </Button>
        </DialogActions>
      </Dialog>
        </>
     
  );
}
