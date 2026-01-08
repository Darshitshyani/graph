import prisma from "../db.server";

/**
 * Subscription and Plan Management Utilities
 * 
 * This module provides functions to:
 * - Get shop subscription
 * - Check plan limits
 * - Verify feature access
 * - Initialize default plans
 */

// Default plan limits
const PLAN_LIMITS = {
  free: {
    maxTemplates: 3,
    maxProductAssignments: 10,
    customBranding: false,
    apiAccess: false,
    prioritySupport: false,
  },
  basic: {
    maxTemplates: 10,
    maxProductAssignments: 50,
    customBranding: false,
    apiAccess: false,
    prioritySupport: false,
  },
  pro: {
    maxTemplates: 50,
    maxProductAssignments: 500,
    customBranding: true,
    apiAccess: true,
    prioritySupport: false,
  },
  enterprise: {
    maxTemplates: -1, // unlimited
    maxProductAssignments: -1, // unlimited
    customBranding: true,
    apiAccess: true,
    prioritySupport: true,
  },
};

/**
 * Get or create subscription for a shop
 */
export async function getShopSubscription(shop) {
  let subscription = await prisma.subscription.findUnique({
    where: { shop },
    include: { Plan: true },
  });

  // If no subscription exists, create a free one
  if (!subscription) {
    // Ensure free plan exists
    await ensureDefaultPlans();
    
    const freePlan = await prisma.plan.findUnique({
      where: { name: "free" },
    });

    if (freePlan) {
      subscription = await prisma.subscription.create({
        data: {
          shop,
          planId: freePlan.id,
          planName: "free",
          status: "active",
          limits: JSON.stringify(PLAN_LIMITS.free),
        },
        include: { Plan: true },
      });
    }
  }

  return subscription;
}

/**
 * Get plan limits for a shop
 */
export async function getPlanLimits(shop) {
  const subscription = await getShopSubscription(shop);
  
  if (!subscription) {
    return PLAN_LIMITS.free;
  }

  // Parse limits from subscription or use defaults
  let limits = PLAN_LIMITS[subscription.planName] || PLAN_LIMITS.free;
  
  if (subscription.limits) {
    try {
      const customLimits = JSON.parse(subscription.limits);
      limits = { ...limits, ...customLimits };
    } catch (e) {
      console.error("Error parsing subscription limits:", e);
    }
  }

  return limits;
}

/**
 * Check if shop has access to a feature
 */
export async function hasFeatureAccess(shop, feature) {
  const subscription = await getShopSubscription(shop);
  
  if (!subscription || subscription.status !== "active") {
    return false;
  }

  const limits = await getPlanLimits(shop);
  return limits[feature] === true;
}

/**
 * Check if shop is within plan limits
 */
export async function checkPlanLimit(shop, limitType, currentCount) {
  const limits = await getPlanLimits(shop);
  const limit = limits[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1 };
  }

  const remaining = limit - currentCount;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit,
  };
}

/**
 * Get current usage for a shop
 */
export async function getShopUsage(shop) {
  const [templateCount, assignmentCount] = await Promise.all([
    prisma.sizeChartTemplate.count({
      where: { shop, active: true },
    }),
    prisma.sizeChartProductAssignment.count({
      where: { shop },
    }),
  ]);

  return {
    templates: templateCount,
    productAssignments: assignmentCount,
  };
}

/**
 * Check if shop can create a new template
 */
export async function canCreateTemplate(shop) {
  const usage = await getShopUsage(shop);
  const limitCheck = await checkPlanLimit(shop, "maxTemplates", usage.templates);
  
  return limitCheck.allowed;
}

/**
 * Check if shop can assign chart to a product
 */
export async function canAssignToProduct(shop) {
  const usage = await getShopUsage(shop);
  const limitCheck = await checkPlanLimit(shop, "maxProductAssignments", usage.productAssignments);
  
  return limitCheck.allowed;
}

/**
 * Ensure default plans exist in database
 */
export async function ensureDefaultPlans() {
  const defaultPlans = [
    {
      name: "free",
      displayName: "Free",
      price: 0,
      currency: "USD",
      interval: "month",
      features: JSON.stringify(["basic_size_charts", "theme_integration"]),
      limits: JSON.stringify(PLAN_LIMITS.free),
      active: true,
    },
    {
      name: "basic",
      displayName: "Basic",
      price: 9.99,
      currency: "USD",
      interval: "month",
      features: JSON.stringify(["basic_size_charts", "theme_integration", "more_templates"]),
      limits: JSON.stringify(PLAN_LIMITS.basic),
      active: true,
    },
    {
      name: "pro",
      displayName: "Pro",
      price: 29.99,
      currency: "USD",
      interval: "month",
      features: JSON.stringify(["basic_size_charts", "theme_integration", "unlimited_templates", "custom_branding", "api_access"]),
      limits: JSON.stringify(PLAN_LIMITS.pro),
      active: true,
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      price: 99.99,
      currency: "USD",
      interval: "month",
      features: JSON.stringify(["all_features", "unlimited_everything", "custom_branding", "api_access", "priority_support", "custom_integrations"]),
      limits: JSON.stringify(PLAN_LIMITS.enterprise),
      active: true,
    },
  ];

  for (const planData of defaultPlans) {
    await prisma.plan.upsert({
      where: { name: planData.name },
      update: {
        displayName: planData.displayName,
        price: planData.price,
        features: planData.features,
        limits: planData.limits,
      },
      create: planData,
    });
  }
}

/**
 * Update shop subscription
 */
export async function updateShopSubscription(shop, planName, subscriptionData = {}) {
  const plan = await prisma.plan.findUnique({
    where: { name: planName },
  });

  if (!plan) {
    throw new Error(`Plan ${planName} not found`);
  }

  const limits = JSON.parse(plan.limits || JSON.stringify(PLAN_LIMITS[planName] || PLAN_LIMITS.free));

  return await prisma.subscription.upsert({
    where: { shop },
    update: {
      planId: plan.id,
      planName: planName,
      limits: JSON.stringify(limits),
      ...subscriptionData,
    },
    create: {
      shop,
      planId: plan.id,
      planName: planName,
      status: subscriptionData.status || "active",
      limits: JSON.stringify(limits),
      ...subscriptionData,
    },
  });
}

