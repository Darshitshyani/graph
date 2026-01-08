import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    let settings = await db.themeSettings.findUnique({
      where: { shop },
    });

    // If no settings exist, return defaults
    if (!settings) {
      return Response.json({
        settings: {
          buttonText: "Size Chart",
          buttonSize: "large",
          buttonWidth: "fit",
          alignment: "center",
          buttonType: "primary",
          iconType: "none",
          iconPosition: "left",
          backgroundColor: "#ffffff",
          borderColor: "#000000",
          textColor: "#000000",
          borderRadius: 0,
          appUrl: null,
          margin: {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20,
          },
        },
      });
    }

    // Convert database format to frontend format
    return Response.json({
      settings: {
        buttonText: settings.buttonText,
        buttonSize: settings.buttonSize,
        buttonWidth: settings.buttonWidth,
        alignment: settings.alignment,
        buttonType: settings.buttonType,
        iconType: settings.iconType,
        iconPosition: settings.iconPosition,
        backgroundColor: settings.backgroundColor,
        borderColor: settings.borderColor,
        textColor: settings.textColor,
        borderRadius: settings.borderRadius,
        appUrl: settings.appUrl || null,
        margin: {
          top: settings.marginTop,
          bottom: settings.marginBottom,
          left: settings.marginLeft,
          right: settings.marginRight,
        },
      },
    });
  } catch (error) {
    console.error("Error loading theme settings:", error);
    return Response.json({ error: "Failed to load settings" }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const formData = await request.formData();
    const settingsData = JSON.parse(formData.get("settings") || "{}");

    // Convert frontend format to database format
    const dbData = {
      buttonText: settingsData.buttonText || "Size Chart",
      buttonSize: settingsData.buttonSize || "large",
      buttonWidth: settingsData.buttonWidth || "fit",
      alignment: settingsData.alignment || "center",
      buttonType: settingsData.buttonType || "primary",
      iconType: settingsData.iconType || "none",
      iconPosition: settingsData.iconPosition || "left",
      backgroundColor: settingsData.backgroundColor || "#ffffff",
      borderColor: settingsData.borderColor || "#000000",
      textColor: settingsData.textColor || "#000000",
      borderRadius: settingsData.borderRadius || 0,
      appUrl: settingsData.appUrl || null,
      marginTop: settingsData.margin?.top || 20,
      marginBottom: settingsData.margin?.bottom || 20,
      marginLeft: settingsData.margin?.left || 20,
      marginRight: settingsData.margin?.right || 20,
    };

    // Upsert settings (create or update)
    const settings = await db.themeSettings.upsert({
      where: { shop },
      update: dbData,
      create: {
        shop,
        ...dbData,
      },
    });

    return Response.json({ success: true, settings });
  } catch (error) {
    console.error("Error saving theme settings:", error);
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
};

