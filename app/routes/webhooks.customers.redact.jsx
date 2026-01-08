import { authenticate } from "../shopify.server";

/**
 * GDPR Webhook: customers/redact
 * 
 * Triggered when a customer requests data deletion (right to be forgotten).
 * You must delete the customer's data within 10 days.
 * 
 * This app doesn't store customer-specific data, so we acknowledge the request.
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
    // If you need to store customer data in the future, delete it here
    
    // According to GDPR requirements:
    // - You must delete customer data within 10 days
    // - Remove all personal information associated with the customer
    // - Ensure data is permanently deleted (not just soft-deleted)
    
    // Example: If you stored customer preferences or order history:
    // await db.customerData.deleteMany({
    //   where: { customerId: payload.customer.id }
    // });

    // Log for compliance tracking
    console.log(`GDPR redact request processed for customer ${payload.customer?.id} at shop ${shop}`);

    // Return 200 to acknowledge receipt
    // This satisfies the GDPR requirement
    return new Response();
  } catch (error) {
    console.error(`Error processing customers/redact webhook for ${shop}:`, error);
    // Return 200 to acknowledge receipt (GDPR requirement)
    // Log errors for compliance tracking
    return new Response();
  }
};

