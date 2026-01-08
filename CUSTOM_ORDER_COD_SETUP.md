# Custom Order COD Restriction Setup Guide

## Overview

This guide explains how to configure your Shopify store to disable Cash on Delivery (COD) for custom orders while keeping it available for regular orders.

**⚠️ CRITICAL CONFIGURATION:**
- **Normal products** (regular cart checkout) → Must use **Default shipping profile** with COD-enabled rates
- **Custom order products** → Must use **"Custom Orders – No COD"** profile with prepaid-only rates
- The app does NOT modify regular checkout - COD availability is controlled ONLY by shipping profiles

## Current Implementation

The app automatically:
- ✅ Creates draft orders with `custom-order` tag
- ✅ Adds measurement data as line item properties
- ✅ Includes clear notes that COD is not available
- ✅ Tags orders for identification

## Shopify Limitation

**Important:** Shopify does not allow programmatic control of payment methods for draft orders. Payment customization functions and checkout extensions do not work for draft order checkouts.

## ✅ Correct Solution: Shipping Profiles Control COD

**How COD Works in Shopify:**
- COD only appears as a payment option when a COD-enabled shipping rate exists
- Shipping profiles control which shipping rates are available
- Draft orders respect shipping profiles
- **If no COD shipping rate exists → COD cannot appear at checkout**

This is the correct, Shopify-supported way to restrict COD for custom orders.

## ✅ Recommended Solution: Shipping Profile Method

This is the **correct, Shopify-supported solution** that works for draft orders without requiring third-party apps.

### Step 1: Create Shipping Profile

1. Go to **Shopify Admin > Settings > Shipping and delivery**
2. Scroll to **Shipping profiles** section
3. Click **Create shipping profile**
4. Name it: **"Custom Orders – No COD"** (exact name recommended)

### Step 2: Configure Shipping Rates (CRITICAL)

1. In the **"Custom Orders – No COD"** shipping profile:
   - **Add only prepaid shipping rates**
   - **Do NOT include any shipping rates or carriers that support COD**
   - Examples of prepaid-only shipping:
     - Standard shipping (prepaid carriers only)
     - Express shipping (prepaid carriers only)
     - Flat rate shipping
     - Free shipping
   - **Exclude COD-enabled carriers:**
     - Any local courier services that offer COD
     - Regional carriers with COD support
     - Any shipping method that enables COD payment

2. **Important:** In regions where COD is tied to specific carriers:
   - Identify which carriers/methods enable COD in your region
   - Do NOT include those carriers in this profile
   - Only include carriers that require prepayment

### Step 3: Assign Profile to Custom Order Products

1. Go to **Products** in your Shopify admin
2. For each product that can be custom ordered:
   - Edit the product
   - Scroll to **Shipping** section
   - Under **Shipping profile**, select **"Custom Orders – No COD"**
   - Save the product

3. **Important:** Normal products (non-custom orders) must:
   - Remain on the **default shipping profile**
   - Keep COD-enabled shipping rates available
   - This ensures COD stays enabled for normal orders

### Step 4: Verify Setup

1. **Test Normal Order:**
   - Add a normal product to cart
   - Go to standard checkout
   - Verify COD is available ✅
   - Verify online payments are available ✅

2. **Test Custom Order:**
   - Create a custom order through the app
   - Check the draft order checkout page
   - Verify COD is NOT available ❌
   - Verify online payment methods (Razorpay, Credit Card, etc.) are available ✅
   - Verify only prepaid shipping rates are shown ✅

## Alternative Solutions

### Option 1: Third-Party Apps

Consider using apps that can conditionally hide COD:
- **Payfy: Hide Payment Rules** - Can hide payment methods based on conditions
- **Codify COD** - Advanced COD management with conditional rules

**Note:** Effectiveness may vary for draft orders due to Shopify limitations.

### Option 2: Manual Review

For low-volume stores:
- Review each custom order draft before sending invoice
- Manually remove COD option if it appears
- Send invoice only after verifying payment method

### Option 3: Store Policy

Add a clear store policy:
- Display on product pages: "Custom orders require prepayment"
- Add to checkout notes
- Include in order confirmation emails

## Testing

1. **Test Normal Order:**
   - Add product to cart normally
   - Go to standard checkout
   - Verify COD is available ✅

2. **Test Custom Order:**
   - Click "Custom Order" button
   - Fill measurements
   - Complete draft order checkout
   - Verify COD is NOT available ❌
   - Verify online payments are available ✅

## Troubleshooting

### ❌ COD Not Available in Regular Cart Checkout

**This is a configuration issue, not a code issue. The app does NOT affect regular checkout.**

If COD is missing from regular cart checkout:

1. **Check Product Shipping Profiles:**
   - Go to **Products** in Shopify admin
   - Edit the product that's in your cart
   - Scroll to **Shipping** section
   - **IMPORTANT:** Normal products must use the **"Default"** shipping profile (NOT "Custom Orders – No COD")
   - If product is assigned to "Custom Orders – No COD", change it to "Default"
   - Save the product

2. **Verify Default Shipping Profile Has COD:**
   - Go to **Settings > Shipping and delivery**
   - Find the **"Default"** shipping profile (or your main profile)
   - Click **Manage rates**
   - Ensure at least one shipping rate has **COD enabled**
   - If no COD shipping rates exist, add one:
     - Click **Add rate** or **Add shipping zone**
     - Select a carrier that supports COD (e.g., local courier)
     - Enable **Cash on Delivery** option
     - Save the rate

3. **Check Global COD Settings:**
   - Go to **Settings > Payments**
   - Verify **Cash on Delivery** is enabled
   - If disabled, enable it
   - Save settings

4. **Verify Shipping Zone:**
   - Go to **Settings > Shipping and delivery**
   - Check your shipping zones
   - Ensure your customer's location is covered by a shipping zone
   - That shipping zone must have COD-enabled rates

5. **Test Again:**
   - Clear cart and add product again
   - Go to checkout
   - COD should now be available ✅

**Key Point:** Only products used for **Custom Orders** should use "Custom Orders – No COD" profile. All other products must use the **Default** profile with COD-enabled rates.

### COD Still Appears on Custom Orders

If COD still appears after setting up the shipping profile:

1. **Check Shipping Profile Assignment:**
   - Verify custom order products are assigned to "Custom Orders – No COD" profile
   - Go to Products > Edit product > Shipping section
   - Confirm the correct profile is selected

2. **Verify Shipping Rates:**
   - Go to Settings > Shipping and delivery
   - Edit "Custom Orders – No COD" profile
   - Check that NO COD-enabled shipping rates are included
   - Remove any shipping methods that support COD

3. **Check Carrier Settings:**
   - Some carriers enable COD automatically
   - Review each shipping rate in the profile
   - Remove carriers that offer COD as a payment option

4. **Test Shipping Rates:**
   - Create a test custom order
   - Check which shipping rates appear
   - If COD shipping rates appear, they're still in the profile
   - Remove them from the profile

5. **Verify Default Profile:**
   - Ensure normal products use default profile
   - Default profile should have COD-enabled rates
   - This keeps COD available for normal orders

### Online Payments Not Showing

1. Verify payment gateways are enabled (Settings > Payments)
2. Check payment gateway configuration
3. Ensure payment gateways support draft orders
4. Contact payment gateway support if needed

### Online Payments Not Showing

1. Verify payment gateways are enabled (Settings > Payments)
2. Check payment gateway configuration
3. Ensure payment gateways support draft orders
4. Contact payment gateway support if needed

## Support

If you need assistance:
1. Check Shopify's documentation on shipping profiles
2. Contact Shopify Support for payment method configuration
3. Review third-party app documentation for conditional payment rules

## Compliance & Safety

- ✅ Works on all Shopify plans
- ✅ Fully compatible with public Shopify apps
- ✅ No third-party payment apps required
- ✅ Shopify App Review-safe
- ✅ No checkout manipulation
- ✅ Uses native Shopify shipping profile functionality
- ✅ Draft orders respect shipping profiles automatically

