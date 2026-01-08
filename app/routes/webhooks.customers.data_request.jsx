import { authenticate } from "../shopify.server";

/**
 * GDPR Webhook: customers/data_request
 * 
 * Triggered when a customer requests their data.
 * You must return the customer's data within 10 days.
 * 
 * This app doesn't store customer-specific data, so we return an empty response.
 * 
 * @see https://shopify.dev/docs/apps/store/data-protection/gdpr-resources
 */
export const action = async ({ request }) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log(`Customer ID: ${payload.customer?.id}, Email: ${payload.customer?.email}`);

  try {
    // This app doesn't store customer-specific data
    // Size charts, templates, and assignments are shop/product-level data
    // If you need to store customer data in the future, return it here
    
    // According to GDPR requirements:
    // - You must respond within 10 days
    // - Return customer data in JSON format
    // - Include any data you've collected about the customer
    
    // Since we don't store customer data, we acknowledge the request
    // but return empty data
    const customerData = {
      // Add any customer-specific data your app stores here
      // Example: orders, preferences, etc.
      customer_id: payload.customer?.id,
      requested_at: new Date().toISOString(),
      data: [], // Empty array since we don't store customer data
    };

    // Log for compliance tracking
    console.log(`GDPR data request processed for customer ${payload.customer?.id} at shop ${shop}`);

    // Return 200 to acknowledge receipt
    // Shopify will handle the data delivery to the customer
    return new Response();
  } catch (error) {
    console.error(`Error processing customers/data_request webhook for ${shop}:`, error);
    // Return 200 to acknowledge receipt (GDPR requirement)
    // Log errors for compliance tracking
    return new Response();
  }
};

