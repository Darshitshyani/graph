import { authenticate } from "../shopify.server";
import * as subscriptionUtils from "../utils/subscription.server";

/**
 * API route for subscription management
 * GET: Get shop subscription and limits
 * POST: Update shop subscription
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const [subscription, limits, usage] = await Promise.all([
      subscriptionUtils.getShopSubscription(shop),
      subscriptionUtils.getPlanLimits(shop),
      subscriptionUtils.getShopUsage(shop),
    ]);

    return Response.json({
      subscription: {
        planName: subscription?.planName || "free",
        status: subscription?.status || "active",
        currentPeriodEnd: subscription?.currentPeriodEnd,
        trialEndsAt: subscription?.trialEndsAt,
      },
      limits,
      usage,
      canCreateTemplate: await subscriptionUtils.canCreateTemplate(shop),
      canAssignToProduct: await subscriptionUtils.canAssignToProduct(shop),
    });
  } catch (error) {
    console.error("Error loading subscription:", error);
    return Response.json({ error: "Failed to load subscription" }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "update") {
      const planName = formData.get("planName");
      if (!planName) {
        return Response.json({ error: "Plan name required" }, { status: 400 });
      }

      const subscription = await subscriptionUtils.updateShopSubscription(shop, planName);
      return Response.json({ success: true, subscription });
    }

    return Response.json({ error: "Invalid intent" }, { status: 400 });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return Response.json({ error: error.message || "Failed to update subscription" }, { status: 500 });
  }
};
