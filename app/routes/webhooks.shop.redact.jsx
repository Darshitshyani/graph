import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR Webhook: shop/redact
 * 
 * Triggered when a shop owner requests data deletion (right to be forgotten).
 * You must delete ALL shop data within 10 days.
 * 
 * This is a critical webhook - it requires complete data deletion for the shop.
 * 
 * @see https://shopify.dev/docs/apps/store/data-protection/gdpr-resources
 */
export const action = async ({ request }) => {
  const { payload, shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log(`Shop ID: ${payload.shop_id}, Shop Domain: ${payload.shop_domain}`);

  try {
    // According to GDPR requirements, we must delete ALL data for this shop
    // This includes:
    // - Size chart templates
    // - Product assignments
    // - Theme settings
    // - Subscription data
    // - Any other shop-related data
    
    // Use transactions to ensure atomicity
    await db.$transaction(async (tx) => {
      // Delete in order respecting foreign key constraints
      
      // 1. Delete product assignments (references templates)
      await tx.sizeChartProductAssignment.deleteMany({
        where: { shop },
      });

      // 2. Delete size chart templates
      await tx.sizeChartTemplate.deleteMany({
        where: { shop },
      });

      // 3. Delete theme settings
      await tx.themeSettings.deleteMany({
        where: { shop },
      });

      // 4. Delete subscription
      await tx.subscription.deleteMany({
        where: { shop },
      });

      // 5. Delete sessions (already handled by app/uninstalled, but ensure cleanup)
      await tx.session.deleteMany({
        where: { shop },
      });
    });

    // Log for compliance tracking
    console.log(`GDPR shop redact completed - all data deleted for shop ${shop}`);

    // Return 200 to acknowledge receipt
    // This satisfies the GDPR requirement
    return new Response();
  } catch (error) {
    console.error(`Error processing shop/redact webhook for ${shop}:`, error);
    // Return 200 to acknowledge receipt (GDPR requirement)
    // Log errors for compliance tracking
    // Note: In production, you may want to implement retry logic or alerts
    return new Response();
  }
};

