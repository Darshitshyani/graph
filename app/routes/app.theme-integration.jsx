import { useState, useEffect, useRef, useCallback } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { FormControl, Select, MenuItem, Box, IconButton, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab, ToggleButton, ToggleButtonGroup, TextField, Tooltip, DialogContent } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StraightenIcon from "@mui/icons-material/Straighten";
import InfoIcon from "@mui/icons-material/Info";
import { authenticate } from "../shopify.server";

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
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  // Get the app URL from the request or environment
  const appUrl = new URL(request.url).origin;
  const configuredAppUrl = process.env.SHOPIFY_APP_URL || appUrl;

  try {
    // Fetch theme integration settings from API
    const response = await fetch(`${appUrl}/api/theme-settings`, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { settings: data.settings, appUrl: configuredAppUrl };
    }

    // Fallback to defaults if API fails
    const defaultSettings = {
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
      buttonText: "Size Chart",
      margin: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
      marginLinked: {
        bottom: false,
        right: false,
      },
    };

    return { settings: defaultSettings, appUrl: configuredAppUrl };
  } catch (error) {
    console.error("Error loading theme integration settings:", error);
    return { settings: null, appUrl: configuredAppUrl };
  }
};

const ThemeIntegration = () => {
  const { settings: initialSettings, appUrl: detectedAppUrl } = useLoaderData();
  const fetcher = useFetcher();
  
  // Track if we've mounted to only sync from initialSettings on first load
  const hasMountedRef = useRef(false);

  // Initialize state from loader data or defaults
  const defaultSettings = {
    buttonSize: "large",
    buttonWidth: "fit",
    alignment: "center",
    buttonType: "primary",
    iconType: "none",
    iconPosition: "left",
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    textColor: "#ffffff",
    borderRadius: 6,
    buttonText: "Size Chart",
    margin: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
    marginLinked: {
      bottom: false,
      right: false,
    },
  };

  const settings = initialSettings || defaultSettings;

  // Button state - initialized from loader
  const [buttonSize, setButtonSize] = useState(settings.buttonSize);
  const [buttonWidth, setButtonWidth] = useState(settings.buttonWidth);
  const [alignment, setAlignment] = useState(settings.alignment);
  const [buttonType, setButtonType] = useState(settings.buttonType);
  const [iconType, setIconType] = useState(settings.iconType);
  const [iconPosition, setIconPosition] = useState(settings.iconPosition);
  const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor);
  const [borderColor, setBorderColor] = useState(settings.borderColor);
  const [textColor, setTextColor] = useState(settings.textColor);
  const [borderRadius, setBorderRadius] = useState(settings.borderRadius);
  const [buttonText, setButtonText] = useState(settings.buttonText);
  const [customSizeButtonText, setCustomSizeButtonText] = useState(settings.customSizeButtonText || "Custom Size");
  const [appUrl, setAppUrl] = useState(settings.appUrl || detectedAppUrl || "");
  const [margin, setMargin] = useState(settings.margin);
  const [marginLinked, setMarginLinked] = useState(settings.marginLinked);
  const [previewView, setPreviewView] = useState("desktop"); // "mobile" or "desktop"
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [customSizeModalOpen, setCustomSizeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = Size Guide, 1 = How to Measure
  const [customSizeActiveTab, setCustomSizeActiveTab] = useState(0); // 0 = Details, 1 = How to Measure
  const [buttonTypeTab, setButtonTypeTab] = useState('sizeChart'); // 'sizeChart' or 'customSize'
  const [showBothButtons, setShowBothButtons] = useState(false); // true = show both buttons, false = show single button
  const [unit, setUnit] = useState('in');
  const [customSizeUnit, setCustomSizeUnit] = useState('in');
  const [customSizeFormData, setCustomSizeFormData] = useState({});
  const previewContainerRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: '50%', left: '50%' });
  const [backdropStyle, setBackdropStyle] = useState({ top: 0, height: '100%' });

  // Default size chart template data with 4 columns and XS to 2XL sizes
  const defaultSizeChartTemplate = {
    name: "Default Size Chart",
    description: "",
    chartData: {
      columns: [
        { id: "col1", label: "Chest (inches)" },
        { id: "col2", label: "Waist (inches)" },
        { id: "col3", label: "Length (inches)" },
        { id: "col4", label: "Shoulder (inches)" },
      ],
      sizeData: [
        { size: "XS", col1: "34", col2: "28", col3: "26", col4: "16" },
        { size: "S", col1: "36", col2: "30", col3: "27", col4: "16.5" },
        { size: "M", col1: "38", col2: "32", col3: "28", col4: "17" },
        { size: "L", col1: "40", col2: "34", col3: "29", col4: "17.5" },
        { size: "XL", col1: "42", col2: "36", col3: "30", col4: "18" },
        { size: "2XL", col1: "44", col2: "38", col3: "31", col4: "18.5" },
      ],
    },
  };

  // Sample custom size measurement fields for preview
  const sampleCustomSizeFields = [
    { id: "chest", name: "Chest", required: true, enabled: true, description: "Measure around the fullest part of your chest", min: 0, max: 200, unit: "in" },
    { id: "waist", name: "Waist", required: true, enabled: true, description: "Measure around your natural waistline", min: 0, max: 200, unit: "in" },
    { id: "hips", name: "Hips", required: false, enabled: true, description: "Measure around the widest part of your hips", min: 0, max: 200, unit: "in" },
    { id: "shoulder", name: "Shoulder", required: true, enabled: true, description: "Measure across your shoulders", min: 0, max: 200, unit: "in" },
  ];

  // Update state when loader data changes (only on initial mount)
  useEffect(() => {
    if (initialSettings && !hasMountedRef.current) {
      setButtonSize(initialSettings.buttonSize);
      setButtonWidth(initialSettings.buttonWidth);
      setAlignment(initialSettings.alignment);
      setButtonType(initialSettings.buttonType);
      setIconType(initialSettings.iconType);
      setIconPosition(initialSettings.iconPosition);
      setBackgroundColor(initialSettings.backgroundColor);
      setBorderColor(initialSettings.borderColor);
      setTextColor(initialSettings.textColor);
      setBorderRadius(initialSettings.borderRadius);
      setButtonText(initialSettings.buttonText);
      setCustomSizeButtonText(initialSettings.customSizeButtonText || "Custom Size");
      setShowBothButtons(initialSettings.showBothButtons || false);
      setAppUrl(initialSettings.appUrl || "");
      setMargin(initialSettings.margin);
      setMarginLinked(initialSettings.marginLinked);
      hasMountedRef.current = true;
    }
  }, [initialSettings]);

  // Calculate modal position relative to visible viewport when it opens
  useEffect(() => {
    if ((sizeChartOpen || customSizeModalOpen) && previewContainerRef.current) {
      const container = previewContainerRef.current;
      const scrollTop = container.scrollTop;
      const visibleHeight = container.clientHeight;
      
      // Calculate position: scroll position + half of visible height
      // This centers the modal in the visible viewport regardless of scroll
      const centerPosition = scrollTop + (visibleHeight / 2);
      
      setModalPosition({
        top: `${centerPosition}px`,
        left: '50%'
      });
      
      // Set backdrop to cover only the visible viewport area
      setBackdropStyle({
        top: `${scrollTop}px`,
        height: `${visibleHeight}px`
      });
    }
  }, [sizeChartOpen, customSizeModalOpen]);

  const handleMarginChange = (side, value) => {
    setMargin((prev) => {
      const newMargin = { ...prev, [side]: value };
      
      // If linked, update all margins
      if (marginLinked[side]) {
        Object.keys(newMargin).forEach((key) => {
          newMargin[key] = value;
        });
      }
      
      return newMargin;
    });
  };

  const toggleMarginLink = (side) => {
    setMarginLinked((prev) => ({
      ...prev,
      [side]: !prev[side],
    }));
  };

  // Save settings function
  const saveSettings = useCallback(() => {
    const settingsToSave = {
      buttonText,
      customSizeButtonText,
      showBothButtons,
      buttonSize,
      buttonWidth,
      alignment,
      buttonType,
      iconType,
      iconPosition,
      backgroundColor,
      borderColor,
      textColor,
      borderRadius,
      appUrl: appUrl.trim() || null,
      margin,
    };

    fetcher.submit(
      { settings: JSON.stringify(settingsToSave) },
      {
        method: "POST",
        action: "/api/theme-settings",
      }
    );
  }, [
    buttonText,
    customSizeButtonText,
    showBothButtons,
    buttonSize,
    buttonWidth,
    alignment,
    buttonType,
    iconType,
    iconPosition,
    backgroundColor,
    borderColor,
    textColor,
    borderRadius,
    appUrl,
    margin,
    fetcher,
  ]);

  // Auto-save settings with debounce (1 second delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only save if settings have changed from initial
      if (initialSettings) {
        saveSettings();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    buttonText,
    customSizeButtonText,
    showBothButtons,
    buttonSize,
    buttonWidth,
    alignment,
    buttonType,
    iconType,
    iconPosition,
    backgroundColor,
    borderColor,
    textColor,
    borderRadius,
    appUrl,
    margin,
    saveSettings,
    initialSettings,
  ]);

  // Get button styles based on type (only hover effects, colors via inline styles)
  const getButtonStyles = (type) => {
    // Return only hover/transition classes, colors will be applied via inline styles
    return "hover:opacity-90";
  };

  // Get button inline styles for custom colors - always apply all colors
  const getButtonInlineStyles = () => {
    const styles = {
      backgroundColor: backgroundColor,
      color: textColor,
      borderRadius: `${borderRadius}px`,
      borderColor: borderColor,
      borderWidth: buttonType === "outline" || buttonType === "custom" ? "2px" : "1px",
      borderStyle: "solid",
    };

    return styles;
  };

  // Get button size classes
  const getSizeClasses = () => {
    switch (buttonSize) {
      case "small":
        return "px-3 py-1.5 text-sm";
      case "medium":
        return "px-4 py-2 text-base";
      case "large":
        return "px-6 py-3 text-lg";
      default:
        return "px-4 py-2 text-base";
    }
  };

  // Get alignment classes
  const getAlignmentClasses = () => {
    switch (alignment) {
      case "left":
        return "justify-start";
      case "center":
        return "justify-center";
      case "right":
        return "justify-end";
      default:
        return "justify-center";
    }
  };

  // Get width classes
  const getWidthClasses = () => {
    return buttonWidth === "fill" ? "w-full" : "w-auto";
  };

  // Icon components
  const getIcon = (type) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case "arrow-right":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-ruler-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M17 3l4 4l-14 14l-4 -4z" /><path d="M16 7l-1.5 -1.5" /><path d="M13 10l-1.5 -1.5" /><path d="M10 13l-1.5 -1.5" /><path d="M7 16l-1.5 -1.5" /></svg>
        );
      case "arrow-left":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-ruler-2-off"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12.03 7.97l4.97 -4.97l4 4l-5 5m-2 2l-7 7l-4 -4l7 -7" /><path d="M16 7l-1.5 -1.5" /><path d="M10 13l-1.5 -1.5" /><path d="M7 16l-1.5 -1.5" /><path d="M3 3l18 18" /></svg>
        );
      case "check":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-ruler"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h14a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-7a1 1 0 0 0 -1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1" /><path d="M4 8l2 0" /><path d="M4 12l3 0" /><path d="M4 16l2 0" /><path d="M8 4l0 2" /><path d="M12 4l0 3" /><path d="M16 4l0 2" /></svg>
        );
      case "plus":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-ruler-measure-2"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 19.875c0 .621 -.512 1.125 -1.143 1.125h-5.714a1.134 1.134 0 0 1 -1.143 -1.125v-15.875a1 1 0 0 1 1 -1h5.857c.631 0 1.143 .504 1.143 1.125z" /><path d="M12 9h-2" /><path d="M12 6h-3" /><path d="M12 12h-3" /><path d="M12 18h-3" /><path d="M12 15h-2" /><path d="M21 3h-4" /><path d="M19 3v18" /><path d="M21 21h-4" /></svg>
        );
      case "x":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-ruler-measure"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19.875 12c.621 0 1.125 .512 1.125 1.143v5.714c0 .631 -.504 1.143 -1.125 1.143h-15.875a1 1 0 0 1 -1 -1v-5.857c0 -.631 .504 -1.143 1.125 -1.143h15.75z" /><path d="M9 12v2" /><path d="M6 12v3" /><path d="M12 12v3" /><path d="M18 12v3" /><path d="M15 12v2" /><path d="M3 3v4" /><path d="M3 5h18" /><path d="M21 3v4" /></svg>
        );
      case "star":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-ruler-off"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 4h11a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-4m-3.713 .299a1 1 0 0 0 -.287 .701v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-14c0 -.284 .118 -.54 .308 -.722" /><path d="M4 8h2" /><path d="M4 12h3" /><path d="M4 16h2" /><path d="M12 4v3" /><path d="M16 4v2" /><path d="M3 3l18 18" /></svg>
        );
      case "heart":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case "ruler":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <s-page heading="Theme Integration" style={fullWidthStyle} />
      
      <div className="w-full max-w-full px-4 md:px-6 py-6 bg-[#f6f6f7] min-h-screen" style={{ ...fullWidthStyle }}>
        <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Layout Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Layout</h2>
          
          {/* Show Both Buttons or Single Button */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Button Display
            </label>
            <div className="inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={() => setShowBothButtons(false)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  !showBothButtons
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Single Button
              </button>
              <button
                onClick={() => setShowBothButtons(true)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                  showBothButtons
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Both Buttons
              </button>
            </div>
          </div>

          {/* Button Type Tabs - Only show when Single Button is selected */}
          {!showBothButtons && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Button Type
              </label>
              <div className="inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setButtonTypeTab('sizeChart')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    buttonTypeTab === 'sizeChart'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Size Chart
                </button>
                <button
                  onClick={() => setButtonTypeTab('customSize')}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                    buttonTypeTab === 'customSize'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Custom Size
                </button>
              </div>
            </div>
          )}

          {/* Button Text Inputs */}
          {!showBothButtons ? (
            // Single Button Mode - Show one input based on selected tab
            buttonTypeTab === 'sizeChart' ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Button Text
            </label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Size Chart"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Button Text
                </label>
                <input
                  type="text"
                  value={customSizeButtonText}
                  onChange={(e) => setCustomSizeButtonText(e.target.value)}
                  placeholder="Custom Size"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            )
          ) : (
            // Both Buttons Mode - Show both inputs
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Size Chart Button Text
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Size Chart"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Custom Size Button Text
                </label>
                <input
                  type="text"
                  value={customSizeButtonText}
                  onChange={(e) => setCustomSizeButtonText(e.target.value)}
                  placeholder="Custom Size"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
          )}
          
          {/* Button Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Button size
            </label>
            <div className="flex gap-2">
              {["small", "medium", "large"].map((size) => (
                <button
                  key={size}
                  onClick={() => setButtonSize(size)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                    buttonSize === size
                      ? "bg-black border-2 border-black text-white"
                      : "bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Button Width */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Button width
            </label>
            <div className="flex gap-2">
              {["fill", "fit"].map((width) => (
                <button
                  key={width}
                  onClick={() => setButtonWidth(width)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    buttonWidth === width
                      ? "bg-black border-2 border-black text-white"
                      : "bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {width === "fill" ? "Fill" : "Fit to text"}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Alignment
            </label>
            <div className="flex gap-2">
              {[
                { value: "left", icon: "│=" },
                { value: "center", icon: "⇄│" },
                { value: "right", icon: "=│" },
              ].map((align) => (
                <button
                  key={align.value}
                  onClick={() => setAlignment(align.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    alignment === align.value
                      ? "bg-black border-2 border-black text-white"
                      : "bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {align.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Button Text */}
       
        </div>

        {/* Design Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Design</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Icon
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { value: "none", label: "None" },
                { value: "arrow-right", label: "→" },
                { value: "arrow-left", label: "←" },
                { value: "check", label: "✓" },
                { value: "plus", label: "+" },
                { value: "x", label: "×" },
                { value: "star", label: "★" },
              ].map((icon) => (
                <button
                  key={icon.value}
                  onClick={() => setIconType(icon.value)}
                  className={`p-3 border-2 rounded-lg transition-all flex items-center justify-center ${
                    iconType === icon.value
                      ? "border-black bg-black"
                      : "border-gray-300 hover:border-gray-400 bg-white"
                  }`}
                  title={icon.label}
                >
                  {icon.value === "none" ? (
                    <span className={`text-sm ${iconType === icon.value ? "text-white" : "text-gray-900"}`}>None</span>
                  ) : (
                    <div className={iconType === icon.value ? "text-white" : "text-gray-900"}>{getIcon(icon.value)}</div>
                  )}
                </button>
              ))}
            </div>
            {iconType !== "none" && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon Position
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => setIconPosition(pos.value)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        iconPosition === pos.value
                      ? "bg-black border-2 border-black text-white"
                      : "bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type
            </label>
            <div className="space-y-3">
              {[
                { value: "primary", label: "Primary", preview: "bg-blue-600 text-white", bg: "#3b82f6", text: "#ffffff", border: "#3b82f6" },
                { value: "secondary", label: "Secondary", preview: "bg-gray-300 text-gray-600", bg: "#d1d5db", text: "#374151", border: "#d1d5db" },
                { value: "outline", label: "Outline", preview: "bg-white text-blue-600 border-2 border-blue-600", bg: "#ffffff", text: "#2563eb", border: "#2563eb" },
                { value: "custom", label: "Custom", preview: "bg-white text-gray-700 border-2 border-gray-300", bg: "#ffffff", text: "#374151", border: "#d1d5db" },
              ].map((type) => (
                <div
                  key={type.value}
                  onClick={() => {
                    setButtonType(type.value);
                    setBackgroundColor(type.bg);
                    setTextColor(type.text);
                    setBorderColor(type.border);
                  }}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    buttonType === type.value
                      ? "border-green-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <button
                      className={`${type.preview} px-6 py-2 rounded-full text-sm font-medium`}
                    >
                      Button
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* Color Customization */}
          <div className="my-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Border Radius Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Border Radius
                </label>
                <span className="text-sm text-gray-600 min-w-[50px] text-right">
                  {borderRadius}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={borderRadius}
                onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                style={{
                  background: `linear-gradient(to right, #000000 0%, #000000 ${(borderRadius / 50) * 100}%, #e5e7eb ${(borderRadius / 50) * 100}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          </div>

         
       
        </div>

        {/* Margin Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Margin</h2>
          
          {[
            { side: "top", icon: "─", label: "Top" },
            { side: "bottom", icon: "─", label: "Bottom", linkable: true },
            { side: "left", icon: "│", label: "Left" },
            { side: "right", icon: "│", label: "Right", linkable: true },
          ].map(({ side, icon, label, linkable }) => (
            <div key={side} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{icon}</span>
                  <label className="text-sm font-medium text-gray-700">
                    {label}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 min-w-[50px] text-right">
                    {margin[side]}px
                  </span>
                  {linkable && (
                    <button
                      onClick={() => toggleMarginLink(side)}
                      className={`p-1.5 rounded border transition-colors ${
                        marginLinked[side]
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Link margins"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={margin[side]}
                onChange={(e) => handleMarginChange(side, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                style={{
                  background: `linear-gradient(to right, #000000 0%, #000000 ${margin[side]}%, #e5e7eb ${margin[side]}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          ))}
        </div>
          </div>

          {/* Right Column - Button Preview (60% of screen) */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6 flex flex-col h-[calc(100vh-50px)]">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Button Preview</h2>
                
                {/* View Toggle Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewView("desktop")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewView === "desktop"
                        ? "bg-[#3b82f6] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="Desktop View"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPreviewView("mobile")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewView === "mobile"
                        ? "bg-[#3b82f6] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title="Mobile View"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Preview Container with View Mode - Scrollable */}
              <div 
                ref={previewContainerRef}
                className={`flex-1 pr-2 -mr-2 relative ${(sizeChartOpen || customSizeModalOpen) ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
              >
                {/* Backdrop Overlay */}
                {(sizeChartOpen || customSizeModalOpen) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: backdropStyle.top,
                      left: 0,
                      right: 0,
                      height: backdropStyle.height,
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      zIndex: 999,
                    }}
                    onClick={() => {
                      setSizeChartOpen(false);
                      setCustomSizeModalOpen(false);
                      setActiveTab(0);
                      setCustomSizeActiveTab(0);
                    }}
                  />
                )}

                {/* Size Chart Modal - Centered within Preview Section */}
                {sizeChartOpen && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: modalPosition.left,
                      top: modalPosition.top,
                      transform: 'translate(-50%, -50%)',
                      width: previewView === "mobile" ? 'calc(100% - 32px)' : '85%',
                      maxWidth: previewView === "mobile" ? '375px' : '600px',
                      maxHeight: 'calc(100% - 32px)',
                      minHeight: previewView === "mobile" ? '300px' : '400px',
                      height: previewView === "mobile" ? 'auto' : 'auto',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #e1e3e5',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Modal Header */}
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderBottom: '1px solid #e1e3e5',
                      bgcolor: '#ffffff',
                      flexShrink: 0,
                    }}>
                      <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>
                        Size Chart
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Unit Toggle */}
                        <ToggleButtonGroup
                          value={unit}
                          exclusive
                          onChange={(e, newUnit) => {
                            if (newUnit !== null) {
                              setUnit(newUnit);
                            }
                          }}
                          size="small"
                          sx={{
                            '& .MuiToggleButton-root': {
                              padding: '6px 16px',
                              fontSize: '13px',
                              fontWeight: 600,
                              border: '1px solid #202223',
                              color: '#202223',
                              backgroundColor: '#ffffff',
                              textTransform: 'none',
                              '&.Mui-selected': {
                                backgroundColor: '#202223',
                                color: '#ffffff',
                                '&:hover': {
                                  backgroundColor: '#202223',
                                },
                              },
                              '&:hover': {
                                backgroundColor: '#f5f5f5',
                              },
                            },
                          }}
                        >
                          <ToggleButton value="in">in</ToggleButton>
                          <ToggleButton value="cm">cm</ToggleButton>
                        </ToggleButtonGroup>
                        <IconButton
                          onClick={() => {
                            setSizeChartOpen(false);
                            setActiveTab(0); // Reset to Size Guide tab
                          }}
                          size="small"
                          sx={{
                            padding: '4px',
                            color: '#202223',
                            '&:hover': {
                              backgroundColor: '#f5f5f5',
                            },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: '20px' }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ borderBottom: '1px solid #e1e3e5', flexShrink: 0, backgroundColor: '#ffffff' }}>
                      <Tabs 
                        value={activeTab} 
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        sx={{
                          minHeight: '48px',
                          '& .MuiTab-root': {
                            minHeight: '48px',
                            fontSize: '14px',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: '#6d7175',
                            '&.Mui-selected': {
                              color: '#202223',
                            },
                          },
                          '& .MuiTabs-indicator': {
                            backgroundColor: '#202223',
                            height: '2px',
                          },
                        }}
                      >
                        <Tab label="Size Guide" />
                        <Tab label="How to Measure" />
                      </Tabs>
                    </Box>
                    
                    {/* Tab Content */}
                    <Box sx={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'auto',
                      p: 2,
                      minHeight: 0,
                    }}>
                      {activeTab === 0 ? (
                        /* Size Guide Tab */
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e1e3e5', borderRadius: '4px', overflowX: 'auto' }}>
                            <Table sx={{ minWidth: 350 }}>
                              <TableHead>
                                <TableRow sx={{ backgroundColor: '#f6f6f7' }}>
                                  <TableCell sx={{ 
                                    fontWeight: 600, 
                                    fontSize: '12px', 
                                    color: '#202223', 
                                    borderRight: '1px solid #e1e3e5', 
                                    position: 'sticky', 
                                    left: 0, 
                                    backgroundColor: '#f6f6f7', 
                                    zIndex: 2,
                                    boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
                                  }}>
                                    Size
                                  </TableCell>
                                  {defaultSizeChartTemplate.chartData.columns.map((col) => (
                                    <TableCell key={col.id} sx={{ fontWeight: 600, fontSize: '12px', color: '#202223', borderRight: '1px solid #e1e3e5', minWidth: '100px' }}>
                                      {col.label}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {defaultSizeChartTemplate.chartData.sizeData.map((row, idx) => (
                                  <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                                    <TableCell sx={{ 
                                      fontSize: '12px', 
                                      fontWeight: 500, 
                                      borderRight: '1px solid #e1e3e5', 
                                      position: 'sticky', 
                                      left: 0, 
                                      backgroundColor: '#ffffff', 
                                      zIndex: 2,
                                      boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
                                    }}>
                                      {row.size}
                                    </TableCell>
                                    {defaultSizeChartTemplate.chartData.columns.map((col) => (
                                      <TableCell key={col.id} sx={{ fontSize: '12px', color: '#6d7175', borderRight: '1px solid #e1e3e5' }}>
                                        {row[col.id] || '-'}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      ) : (
                        /* How to Measure Tab */
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontSize: '16px',
                              fontWeight: 600,
                              mb: 3,
                              color: '#202223',
                            }}
                          >
                            How to measure
                          </Typography>

                          {/* Measurement Guide Image - Only show if image exists */}
                          {/* Note: defaultSizeChartTemplate doesn't have measurementFile, so this won't show */}
                          
                          {/* Measurement Instructions */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: '15px',
                                  fontWeight: 600,
                                  mb: 1.5,
                                  color: '#202223',
                                }}
                              >
                                CHEST:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '14px',
                                  color: '#6d7175',
                                  lineHeight: 1.7,
                                }}
                              >
                                Measure around the fullest part of your chest, keeping the tape measure horizontal.
                              </Typography>
                            </Box>

                            <Box>
                              <Typography
                                sx={{
                                  fontSize: '15px',
                                  fontWeight: 600,
                                  mb: 1.5,
                                  color: '#202223',
                                }}
                              >
                                WAIST:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '14px',
                                  color: '#6d7175',
                                  lineHeight: 1.7,
                                }}
                              >
                                Wrap the measuring tape around your torso at the smallest part of your waist. Typically this is an inch or so above your belly button and is also known as the natural waistline.
                              </Typography>
                            </Box>

                            <Box>
                              <Typography
                                sx={{
                                  fontSize: '15px',
                                  fontWeight: 600,
                                  mb: 1.5,
                                  color: '#202223',
                                }}
                              >
                                HIPS:
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '14px',
                                  color: '#6d7175',
                                  lineHeight: 1.7,
                                }}
                              >
                                Wrap the measuring tape around the widest part of the seat.
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Custom Size Modal */}
                {customSizeModalOpen && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: modalPosition.left,
                      top: modalPosition.top,
                      transform: 'translate(-50%, -50%)',
                      width: previewView === "mobile" ? 'calc(100% - 32px)' : '85%',
                      maxWidth: previewView === "mobile" ? '375px' : '600px',
                      maxHeight: 'calc(100% - 32px)',
                      minHeight: previewView === "mobile" ? '300px' : '400px',
                      height: previewView === "mobile" ? 'auto' : 'auto',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #e1e3e5',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Modal Header */}
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      borderBottom: '1px solid #e1e3e5',
                      bgcolor: '#ffffff',
                      flexShrink: 0,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <StraightenIcon sx={{ color: '#111827', fontSize: '20px' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '18px' }}>
                          Enter Your Measurements
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => {
                          setCustomSizeModalOpen(false);
                          setCustomSizeActiveTab(0);
                        }}
                        size="small"
                        sx={{
                          color: '#6b7280',
                          '&:hover': {
                            backgroundColor: '#f3f4f6',
                            color: '#111827',
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: '20px' }} />
                      </IconButton>
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ borderBottom: '1px solid #e1e3e5', flexShrink: 0, backgroundColor: '#ffffff' }}>
                      <Tabs 
                        value={customSizeActiveTab} 
                        onChange={(e, newValue) => setCustomSizeActiveTab(newValue)}
                        sx={{
                          minHeight: '48px',
                          '& .MuiTab-root': {
                            minHeight: '48px',
                            fontSize: '14px',
                            fontWeight: 600,
                            textTransform: 'none',
                            color: '#6d7175',
                            '&.Mui-selected': {
                              color: '#202223',
                            },
                          },
                          '& .MuiTabs-indicator': {
                            backgroundColor: '#202223',
                            height: '2px',
                          },
                        }}
                      >
                        <Tab label="Details" />
                        <Tab label="How to Measure" />
                      </Tabs>
                    </Box>
                    
                    {/* Tab Content */}
                    <Box sx={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'auto',
                      p: 2,
                      minHeight: 0,
                    }}>
                      {customSizeActiveTab === 0 ? (
                        /* Details Tab */
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                          {sampleCustomSizeFields.map((field) => (
                            <Box 
                              key={field.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                              }}
                            >
                              {/* Info Icon */}
                              <Tooltip 
                                title={field.description || 'Measurement guide'}
                                arrow
                              >
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#6b7280',
                                    p: 0.5,
                                    minWidth: '24px',
                                    minHeight: '24px',
                                    '&:hover': {
                                      bgcolor: '#f3f4f6',
                                      color: '#111827',
                                    },
                                  }}
                                >
                                  <InfoIcon sx={{ fontSize: '16px' }} />
                                </IconButton>
                              </Tooltip>
                              
                              {/* Label */}
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 500, 
                                  color: '#111827',
                                  fontSize: '14px',
                                  minWidth: '140px',
                                }}
                              >
                                {field.name}
                                {field.required && (
                                  <Typography component="span" sx={{ color: '#dc2626', ml: 0.5 }}>
                                    *
                                  </Typography>
                                )}
                              </Typography>
                              
                              {/* Input Field */}
                              <TextField
                                type="number"
                                size="small"
                                placeholder={`Enter ${field.name.toLowerCase()}`}
                                value={customSizeFormData[field.id] || ''}
                                onChange={(e) =>
                                  setCustomSizeFormData({
                                    ...customSizeFormData,
                                    [field.id]: e.target.value,
                                  })
                                }
                                required={field.required}
                                fullWidth
                                inputProps={{
                                  min: field.min,
                                  max: field.max,
                                  step: field.unit === 'in' ? 0.25 : 0.5,
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: '#ffffff',
                                    fontSize: '14px',
                                    '& fieldset': {
                                      borderColor: '#e5e7eb',
                                      borderWidth: '1px',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#3b82f6',
                                      borderWidth: '2px',
                                    },
                                  },
                                }}
                              />
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        /* How to Measure Tab */
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {sampleCustomSizeFields.map((field) => (
                            <Box
                              key={field.id}
                              sx={{
                                p: 2.5,
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                bgcolor: '#f9fafb',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '15px',
                                  fontWeight: 600,
                                  mb: 1,
                                  color: '#202223',
                                }}
                              >
                                {field.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <InfoIcon sx={{ fontSize: '16px', color: '#6b7280' }} />
                                <Typography
                                  sx={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  Click the info button for more details
                                </Typography>
                              </Box>
                              <Typography
                                sx={{
                                  fontSize: '14px',
                                  color: '#6d7175',
                                  lineHeight: 1.7,
                                }}
                              >
                                {field.description}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Product Preview */}
                <div
                  className={`rounded-lg transition-all bg-white ${
                    previewView === "mobile"
                      ? "border-gray-300 bg-gray-50 max-w-[375px] mx-auto overflow-hidden"
                      : "border-gray-200 w-full"
                  }`}
                  style={{
                    width: previewView === "mobile" ? "375px" : "100%",
                  }}
                >
                  {/* Realistic Product Page Preview */}
                  <div className={`${previewView === "mobile" ? "scale-90 origin-top" : ""}`}>
                    {/* Desktop Layout */}
                    {previewView === "desktop" ? (
                    <div className="grid grid-cols-2 gap-6 p-6">
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                        <div className="text-center p-8">
                          <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-400">Product Image</p>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="space-y-5">
                        {/* Product Title */}
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 mb-2">Classic White T-Shirt</h1>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-semibold text-gray-900">$29.99</span>
                            <span className="text-lg text-gray-400 line-through">$39.99</span>
                            <span className="text-sm bg-red-50 text-red-600 px-2 py-1 rounded">25% OFF</span>
                          </div>
                        </div>

                        {/* Product Description */}
                        <div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            A timeless classic t-shirt made from premium cotton blend. Perfect for everyday wear, 
                            this comfortable piece features a relaxed fit and soft fabric that gets better with every wash.
                          </p>
                        </div>

                        {/* Size Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Size <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {["XS", "S", "M", "L", "XL", "XXL"].map((size, index) => (
                              <button
                                key={size}
                                className={`w-12 h-12 border-2 rounded-md text-sm font-medium transition-all ${
                                  index === 2
                                    ? "bg-white text-black border-black border-2"
                                    : "bg-white text-black border-black hover:border-gray-600"
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Measurement Units */}
                        <div>
                          <div className="flex gap-2 border border-gray-300 rounded-md overflow-hidden w-fit">
                            {["CM", "INCH"].map((unit, index) => (
                              <button
                                key={unit}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-r border-gray-300 last:border-r-0 ${
                                  index === 0
                                    ? "bg-black text-white"
                                    : "bg-white text-black hover:bg-gray-50"
                                }`}
                              >
                                {unit}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Size Chart or Custom Size Button(s) */}
                        {showBothButtons ? (
                          <div className={`flex ${getAlignmentClasses()} gap-3 flex-wrap`}>
                          <button
                            onClick={() => setSizeChartOpen(true)}
                            className={`${getButtonStyles(buttonType)} ${getSizeClasses()} ${getWidthClasses()} font-medium transition-colors flex items-center gap-2 cursor-pointer`}
                            style={{
                              marginTop: `${margin.top}px`,
                              marginBottom: `${margin.bottom}px`,
                              marginLeft: `${margin.left}px`,
                              marginRight: `${margin.right}px`,
                              ...getButtonInlineStyles(),
                            }}
                          >
                            {iconType !== "none" && iconPosition === "left" && getIcon(iconType)}
                            <span>{buttonText || "Size Chart"}</span>
                            {iconType !== "none" && iconPosition === "right" && getIcon(iconType)}
                          </button>
                            <button
                              onClick={() => setCustomSizeModalOpen(true)}
                              className={`${getButtonStyles(buttonType)} ${getSizeClasses()} ${getWidthClasses()} font-medium transition-colors flex items-center gap-2 cursor-pointer`}
                              style={{
                                marginTop: `${margin.top}px`,
                                marginBottom: `${margin.bottom}px`,
                                marginLeft: `${margin.left}px`,
                                marginRight: `${margin.right}px`,
                                ...getButtonInlineStyles(),
                              }}
                            >
                              <span>{customSizeButtonText || "Custom Size"}</span>
                            </button>
                        </div>
                        ) : (
                          <div className={`flex ${getAlignmentClasses()}`}>
                            <button
                              onClick={() => {
                                if (buttonTypeTab === 'sizeChart') {
                                  setSizeChartOpen(true);
                                } else {
                                  setCustomSizeModalOpen(true);
                                }
                              }}
                              className={`${getButtonStyles(buttonType)} ${getSizeClasses()} ${getWidthClasses()} font-medium transition-colors flex items-center gap-2 cursor-pointer`}
                              style={{
                                marginTop: `${margin.top}px`,
                                marginBottom: `${margin.bottom}px`,
                                marginLeft: `${margin.left}px`,
                                marginRight: `${margin.right}px`,
                                ...getButtonInlineStyles(),
                              }}
                            >
                              {iconType !== "none" && iconPosition === "left" && getIcon(iconType)}
                              <span>{buttonTypeTab === 'sizeChart' ? (buttonText || "Size Chart") : (customSizeButtonText || "Custom Size")}</span>
                              {iconType !== "none" && iconPosition === "right" && getIcon(iconType)}
                            </button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-2">
                          <button className="w-full py-3.5 px-4 bg-black text-white rounded-md font-semibold text-base transition-colors hover:bg-gray-800">
                            Add to cart
                          </button>
                          <button className="w-full py-3.5 px-4 bg-white border-2 border-black text-black rounded-md font-semibold text-base transition-colors hover:bg-gray-50">
                            Buy it now
                          </button>
                        </div>

                        {/* Product Info */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Free shipping on orders over $50</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>30-day return policy</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Mobile Layout */
                    <div className="p-4 space-y-5">
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                        <div className="text-center p-6">
                          <svg className="w-16 h-16 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-gray-400">Product Image</p>
                        </div>
                      </div>

                      {/* Product Title & Price */}
                      <div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Classic White T-Shirt</h1>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-semibold text-gray-900">$29.99</span>
                          <span className="text-base text-gray-400 line-through">$39.99</span>
                          <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">25% OFF</span>
                        </div>
                      </div>

                      {/* Product Description */}
                      <div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          A timeless classic t-shirt made from premium cotton blend. Perfect for everyday wear, 
                          this comfortable piece features a relaxed fit.
                        </p>
                      </div>

                      {/* Size Selection */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Size <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-1.5 flex-wrap">
                          {["XS", "S", "M", "L", "XL"].map((size, index) => (
                            <button
                              key={size}
                              className={`w-10 h-10 border-2 rounded-md text-xs font-medium transition-all ${
                                index === 2
                                  ? "bg-white text-black border-black border-2"
                                  : "bg-white text-black border-black hover:border-gray-600"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Measurement Units */}
                      <div>
                        <div className="flex gap-0 border border-gray-300 rounded-md overflow-hidden w-full">
                          {["CM", "INCH"].map((unit, index) => (
                            <button
                              key={unit}
                              className={`flex-1 py-2 text-xs font-medium transition-colors border-r border-gray-300 last:border-r-0 ${
                                index === 0
                                  ? "bg-black text-white"
                                  : "bg-white text-black hover:bg-gray-50"
                              }`}
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Size Chart or Custom Size Button(s) */}
                      {showBothButtons ? (
                        <div className={`flex ${getAlignmentClasses()} gap-3 flex-wrap`}>
                        <button
                          onClick={() => setSizeChartOpen(true)}
                          className={`${getButtonStyles(buttonType)} ${getSizeClasses()} ${
                            buttonWidth === "fill" ? "w-full" : getWidthClasses()
                          } font-medium transition-colors flex items-center gap-2 cursor-pointer`}
                          style={{
                            marginTop: `${margin.top}px`,
                            marginBottom: `${margin.bottom}px`,
                            marginLeft: `${margin.left}px`,
                            marginRight: `${margin.right}px`,
                            ...getButtonInlineStyles(),
                          }}
                        >
                          {iconType !== "none" && iconPosition === "left" && getIcon(iconType)}
                          <span>{buttonText || "Size Chart"}</span>
                          {iconType !== "none" && iconPosition === "right" && getIcon(iconType)}
                        </button>
                          <button
                            onClick={() => setCustomSizeModalOpen(true)}
                            className={`${getButtonStyles(buttonType)} ${getSizeClasses()} ${
                              buttonWidth === "fill" ? "w-full" : getWidthClasses()
                            } font-medium transition-colors flex items-center gap-2 cursor-pointer`}
                            style={{
                              marginTop: `${margin.top}px`,
                              marginBottom: `${margin.bottom}px`,
                              marginLeft: `${margin.left}px`,
                              marginRight: `${margin.right}px`,
                              ...getButtonInlineStyles(),
                            }}
                          >
                            <span>{customSizeButtonText || "Custom Size"}</span>
                          </button>
                      </div>
                      ) : (
                        <div className={`flex ${getAlignmentClasses()}`}>
                          <button
                            onClick={() => {
                              if (buttonTypeTab === 'sizeChart') {
                                setSizeChartOpen(true);
                              } else {
                                setCustomSizeModalOpen(true);
                              }
                            }}
                            className={`${getButtonStyles(buttonType)} ${getSizeClasses()} ${
                              buttonWidth === "fill" ? "w-full" : getWidthClasses()
                            } font-medium transition-colors flex items-center gap-2 cursor-pointer`}
                            style={{
                              marginTop: `${margin.top}px`,
                              marginBottom: `${margin.bottom}px`,
                              marginLeft: `${margin.left}px`,
                              marginRight: `${margin.right}px`,
                              ...getButtonInlineStyles(),
                            }}
                          >
                            {iconType !== "none" && iconPosition === "left" && getIcon(iconType)}
                            <span>{buttonTypeTab === 'sizeChart' ? (buttonText || "Size Chart") : (customSizeButtonText || "Custom Size")}</span>
                            {iconType !== "none" && iconPosition === "right" && getIcon(iconType)}
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button className="w-full py-3 px-4 bg-black text-white rounded-md font-semibold text-sm transition-colors hover:bg-gray-800">
                          Add to cart
                        </button>
                        <button className="w-full py-3 px-4 bg-white border-2 border-black text-black rounded-md font-semibold text-sm transition-colors hover:bg-gray-50">
                          Buy it now
                        </button>
                      </div>

                      {/* Product Info */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Free shipping over $50</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>30-day returns</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* View Mode Indicator */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">Preview Mode:</span>
                  <span className="capitalize">{previewView}</span>
                  {previewView === "mobile" && (
                    <span className="text-gray-400">(375px width)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default ThemeIntegration;
