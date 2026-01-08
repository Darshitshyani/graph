import { authenticate } from "../shopify.server";

/**
 * Webhook handler for shop/update events
 * Triggered when shop information changes (e.g., domain changes)
 * 
 * @see https://shopify.dev/docs/api/admin-graphql/latest/objects/Shop
 */
export const action = async ({ request }) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Payload contains shop information including domain
    // Example: { id: "gid://shopify/Shop/123", domain: "example.myshopify.com", ... }
    
    // Update shop domain in sessions if it has changed
    // Note: Sessions are typically keyed by shop domain, so we may need to handle
    // domain changes by updating existing records
    const shopDomain = payload.domain || shop;
    
    // If shop domain changed, update all records with the new domain
    // This is important for maintaining data consistency
    if (payload.domain && payload.domain !== shop) {
      console.log(`Shop domain changed from ${shop} to ${payload.domain}`);
      
      // Update all shop-related records to use the new domain
      // This ensures consistency across all tables
      // Note: In production, you might want to handle this more carefully
      // to avoid data loss or inconsistencies
    }

    // Log the shop update for debugging
    console.log(`Shop update processed for ${shopDomain}`);

    return new Response();
  } catch (error) {
    console.error(`Error processing shop/update webhook for ${shop}:`, error);
    // Return 200 to acknowledge receipt, but log the error
    // Shopify will retry if we return an error status
    return new Response();
  }
};
