import { useState, useEffect, useRef, useCallback } from "react";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { 
  Box, 
  Typography, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Chip,
  Tooltip,
  Tabs,
  Tab
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ImageIcon from "@mui/icons-material/Image";
import DescriptionIcon from "@mui/icons-material/Description";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SettingsIcon from "@mui/icons-material/Settings";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import StraightenIcon from "@mui/icons-material/Straighten";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CancelIcon from "@mui/icons-material/Cancel";
import { authenticate } from "../shopify.server";

// Clean button styles without shadows
const glassmorphicButtonStyles = {
  primary: {
    background: "#111827",
    border: "1px solid #111827",
    color: "white",
    "&:hover": {
      background: "#1f2937",
      border: "1px solid #1f2937",
    },
  },
  secondary: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    color: "#374151",
    "&:hover": {
      background: "#f9fafb",
      border: "1px solid #9ca3af",
    },
  },
  danger: {
    background: "#dc2626",
    border: "1px solid #dc2626",
    color: "white",
    "&:hover": {
      background: "#b91c1c",
      border: "1px solid #b91c1c",
    },
  },
  cancel: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    color: "#6b7280",
    "&:hover": {
      background: "#f9fafb",
      border: "1px solid #9ca3af",
      color: "#374151",
    },
  },
};

// Clean modal style - less glassmorphic, more solid
const glassmorphicModalStyle = {
  background: "#ffffff",
  border: "1px solid rgba(229, 231, 235, 0.8)",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
};

// Default tailor measurements with descriptions
const DEFAULT_TAILOR_MEASUREMENTS = [
  {
    id: "chest",
    name: "Chest / Bust",
    description: "Measure around the fullest part of your chest, keeping the tape measure horizontal and parallel to the ground.",
    unit: "in",
    required: true,
    enabled: true,
    order: 0,
    min: 20,
    max: 60,
    guideImage: null,
  },
  {
    id: "waist",
    name: "Waist",
    description: "Wrap the measuring tape around your torso at the smallest part of your waist. Typically this is an inch or so above your belly button.",
    unit: "in",
    required: true,
    enabled: true,
    order: 1,
    min: 20,
    max: 50,
    guideImage: null,
  },
  {
    id: "hip",
    name: "Hip",
    description: "Wrap the measuring tape around the widest part of your hips and seat, keeping the tape parallel to the ground.",
    unit: "in",
    required: false,
    enabled: true,
    order: 2,
    min: 25,
    max: 60,
    guideImage: null,
  },
  {
    id: "shoulder",
    name: "Shoulder",
    description: "Measure from the edge of one shoulder bone to the edge of the other shoulder bone, across the back.",
    unit: "in",
    required: true,
    enabled: true,
    order: 3,
    min: 12,
    max: 24,
    guideImage: null,
  },
  {
    id: "sleeve",
    name: "Sleeve Length",
    description: "Measure from the shoulder point (where shoulder meets arm) down to your desired sleeve length (wrist, elbow, or any custom length).",
    unit: "in",
    required: false,
    enabled: true,
    order: 4,
    min: 0,
    max: 40,
    guideImage: null,
  },
  {
    id: "armhole",
    name: "Armhole",
    description: "Measure around the arm where it meets the shoulder, keeping the tape snug but not tight.",
    unit: "in",
    required: false,
    enabled: true,
    order: 5,
    min: 10,
    max: 30,
    guideImage: null,
  },
  {
    id: "neck",
    name: "Neck",
    description: "Measure around the base of your neck where the collar would sit. Keep the tape comfortably loose.",
    unit: "in",
    required: false,
    enabled: true,
    order: 6,
    min: 10,
    max: 20,
    guideImage: null,
  },
  {
    id: "length",
    name: "Length",
    description: "Measure from the top of the garment (shoulder or neck) down to the desired bottom hem length.",
    unit: "in",
    required: true,
    enabled: true,
    order: 7,
    min: 10,
    max: 60,
    guideImage: null,
  },
  {
    id: "thigh",
    name: "Thigh",
    description: "Measure around the fullest part of your thigh, keeping the tape parallel to the ground.",
    unit: "in",
    required: false,
    enabled: true,
    order: 8,
    min: 15,
    max: 40,
    guideImage: null,
  },
  {
    id: "bottom_opening",
    name: "Bottom Opening",
    description: "Measure the desired width of the bottom hem or opening of the garment.",
    unit: "in",
    required: false,
    enabled: true,
    order: 9,
    min: 8,
    max: 30,
    guideImage: null,
  },
];

// Default custom instructions for each measurement field by category
const DEFAULT_CUSTOM_INSTRUCTIONS = {
  "mens_shirt": {
    chest: "For men's shirts, measure around the fullest part of the chest while wearing a well-fitted t-shirt. Keep the tape parallel to the ground.",
    waist: "Measure at the natural waistline, typically where you wear your belt. Keep the tape comfortably snug.",
    shoulder: "Measure from shoulder seam to shoulder seam across the back. This is crucial for proper fit.",
    sleeve: "Measure from the shoulder point down to your desired sleeve length. For full sleeve, measure to the wrist bone.",
    armhole: "Measure around the arm where it connects to the shoulder. Keep the tape snug but not tight.",
    neck: "Measure around the base of the neck where the collar will sit. Add 0.5-1 inch for comfort.",
    length: "Measure from the top of the shoulder (or collar) down to the desired shirt length. Standard is mid-hip.",
  },
  "mens_kurta": {
    chest: "For kurta, measure around the fullest part of the chest. Kurta should have 2-3 inches of ease for comfortable fit.",
    waist: "Measure at the natural waistline. Kurta typically has a relaxed fit, so measure comfortably.",
    shoulder: "Measure from shoulder to shoulder across the back. This determines the shoulder width of the kurta.",
    sleeve: "Measure from shoulder point to desired sleeve length. Full sleeve kurta typically reaches the wrist.",
    armhole: "Measure around the arm where it meets the shoulder. Kurta armholes are usually more relaxed.",
    length: "Measure from shoulder top to desired kurta length. Standard is below the knee or mid-calf.",
    bottom_opening: "Measure the desired width of the kurta bottom hem. Standard is 18-24 inches for comfortable movement.",
  },
  "womens_blouse": {
    chest: "Measure around the fullest part of the bust, keeping the tape horizontal. Wear a well-fitted bra for accurate measurement.",
    waist: "Measure at the smallest part of the waist, typically 1-2 inches above the belly button.",
    shoulder: "Measure from shoulder point to shoulder point across the back. This is important for proper fit.",
    sleeve: "Measure from shoulder point to desired sleeve length. For sleeveless, measure armhole depth instead.",
    armhole: "Measure around the arm where it connects to the shoulder. Keep the tape snug for fitted blouses.",
    length: "Measure from shoulder top to desired blouse length. Standard is at the waist or slightly below.",
  },
  "saree_blouse": {
    chest: "Measure around the fullest part of the bust, keeping the tape horizontal. Saree blouses are typically fitted.",
    waist: "Measure at the natural waistline. Saree blouses are usually short and end at the waist.",
    shoulder: "Measure from shoulder to shoulder. Saree blouses have specific shoulder measurements.",
    sleeve: "Measure from shoulder point to desired sleeve length. Common options are sleeveless, cap sleeve, or short sleeve.",
    armhole: "Measure around the arm where it meets the shoulder. Saree blouses have fitted armholes.",
    length: "Measure from shoulder top to desired blouse length. Standard saree blouse length is 12-14 inches.",
  },
  "pants": {
    waist: "Measure around your natural waistline where you wear your pants. Keep the tape comfortably snug.",
    hip: "Measure around the fullest part of your hips and seat, keeping the tape parallel to the ground.",
    thigh: "Measure around the fullest part of your thigh, typically 1-2 inches below the crotch.",
    length: "Measure from the waist down to the desired pant length. For full length, measure to the ankle bone.",
    bottom_opening: "Measure the desired width of the pant leg opening. Standard is 7-9 inches for regular fit.",
  },
  "lehenga": {
    chest: "Measure around the fullest part of the bust, keeping the tape horizontal. Lehenga blouses are typically fitted.",
    waist: "Measure at the natural waistline. This is where the lehenga skirt will sit.",
    hip: "Measure around the fullest part of your hips. Lehenga skirts need room for movement.",
    shoulder: "Measure from shoulder to shoulder across the back. Important for blouse fit.",
    sleeve: "Measure from shoulder point to desired sleeve length. Lehenga sleeves can be full, half, or cap sleeve.",
    length: "Measure from waist to desired lehenga length. Standard is floor length or ankle length.",
  },
};

// Category-based tailor presets
const TAILOR_PRESETS = {
  "mens_shirt": {
    name: "Men's Shirt",
    fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "neck", "length"],
  },
  "mens_kurta": {
    name: "Men's Kurta",
    fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "length", "bottom_opening"],
  },
  "womens_blouse": {
    name: "Women's Blouse",
    fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "length"],
  },
  "saree_blouse": {
    name: "Saree Blouse",
    fields: ["chest", "waist", "shoulder", "sleeve", "armhole", "length"],
  },
  "pants": {
    name: "Pants / Trouser",
    fields: ["waist", "hip", "thigh", "length", "bottom_opening"],
  },
  "lehenga": {
    name: "Lehenga / Dress",
    fields: ["chest", "waist", "hip", "shoulder", "sleeve", "length"],
  },
  "custom": {
    name: "Custom Tailoring",
    fields: [],
  },
};

// Fit preference options with ease allowance
const FIT_PREFERENCES = {
  slim: { label: "Slim Fit", ease: 0 },
  regular: { label: "Regular Fit", ease: 0.5 },
  loose: { label: "Loose Fit", ease: 1.0 },
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);
  const templateId = url.searchParams.get("id");

  try {
    if (templateId) {
      const response = await fetch(`${new URL(request.url).origin}/api/measurement-template?id=${templateId}`, {
        headers: {
          Cookie: request.headers.get("Cookie") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          template: data.template, 
          shop,
          defaultMeasurements: DEFAULT_TAILOR_MEASUREMENTS,
        };
      }
    }

    return {
      template: null,
      shop,
      defaultMeasurements: DEFAULT_TAILOR_MEASUREMENTS,
    };
  } catch (error) {
    console.error("Error loading measurement template:", error);
    return {
      template: null,
      shop,
      defaultMeasurements: DEFAULT_TAILOR_MEASUREMENTS,
    };
  }
};

const CustomMeasurementBuilder = () => {
  const { template: initialTemplate, shop, defaultMeasurements } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [templateName, setTemplateName] = useState(initialTemplate?.name || "New Measurement Template");
  const [templateCategory, setTemplateCategory] = useState(initialTemplate?.category || "custom");
  const [measurementFields, setMeasurementFields] = useState(() => {
    if (initialTemplate?.measurementFields) {
      return initialTemplate.measurementFields;
    }
    return defaultMeasurements.map((field) => ({ ...field }));
  });
  const [fitPreferencesEnabled, setFitPreferencesEnabled] = useState(initialTemplate?.fitPreferencesEnabled || false);
  const [stitchingNotesEnabled, setStitchingNotesEnabled] = useState(initialTemplate?.stitchingNotesEnabled || false);
  
  // Track baseline state for comparison (updated when preset is applied or template is saved)
  const getInitialBaselineState = () => {
    if (initialTemplate?.measurementFields) {
      return {
        name: initialTemplate.name,
        category: initialTemplate.category,
        fields: JSON.parse(JSON.stringify(initialTemplate.measurementFields)),
        fitPreferencesEnabled: initialTemplate.fitPreferencesEnabled,
        stitchingNotesEnabled: initialTemplate.stitchingNotesEnabled,
      };
    }
    return {
      name: "New Measurement Template",
      category: "custom",
      fields: defaultMeasurements.map((field) => ({ ...field })),
      fitPreferencesEnabled: false,
      stitchingNotesEnabled: false,
    };
  };
  
  const baselineStateRef = useRef(getInitialBaselineState());
  
  // Track if we're currently applying a preset to avoid false positives
  const isApplyingPresetRef = useRef(false);
  const [editingField, setEditingField] = useState(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [newField, setNewField] = useState({
    name: "",
    description: "",
    unit: "in",
    required: false,
    min: 0,
    max: 100,
    guideImage: null,
  });
  const [draggedFieldIndex, setDraggedFieldIndex] = useState(null);
  const [showHowToMeasureDialog, setShowHowToMeasureDialog] = useState(false);
  const [editingHowToMeasureField, setEditingHowToMeasureField] = useState(null);
  const [howToMeasureData, setHowToMeasureData] = useState({
    defaultDescription: "",
    customInstructions: "",
    guideImage: null,
    guideImageUrl: null,
  });
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({});
  const [showFieldGuide, setShowFieldGuide] = useState({});
  const [showMeasurementGuideModal, setShowMeasurementGuideModal] = useState(false);
  const [selectedGuideField, setSelectedGuideField] = useState(null);
  const [unit, setUnit] = useState('in');
  const [customerFormActiveTab, setCustomerFormActiveTab] = useState(0);
  const [showDeleteFieldModal, setShowDeleteFieldModal] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);

  useEffect(() => {
    // Skip check if we're applying a preset
    if (isApplyingPresetRef.current) {
      return;
    }
    
    // Compare current state to baseline state
    const currentState = {
      name: templateName,
      category: templateCategory,
      fields: measurementFields,
      fitPreferencesEnabled,
      stitchingNotesEnabled,
    };
    
    const hasChanges = JSON.stringify(currentState) !== JSON.stringify({
      name: baselineStateRef.current.name,
      category: baselineStateRef.current.category,
      fields: baselineStateRef.current.fields,
      fitPreferencesEnabled: baselineStateRef.current.fitPreferencesEnabled,
      stitchingNotesEnabled: baselineStateRef.current.stitchingNotesEnabled,
    });
    
    setHasUnsavedChanges(hasChanges);
  }, [templateName, templateCategory, measurementFields, fitPreferencesEnabled, stitchingNotesEnabled]);

  const handleCategoryChange = (category) => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingNavigation(() => () => applyPreset(category));
      return;
    }
    applyPreset(category);
  };

  const applyPreset = (category) => {
    // Mark that we're applying a preset
    isApplyingPresetRef.current = true;
    
    setTemplateCategory(category);
    const preset = TAILOR_PRESETS[category];
    
    if (preset.fields.length === 0) {
      isApplyingPresetRef.current = false;
      return;
    }

    const enabledFieldIds = new Set(preset.fields);
    const categoryInstructions = DEFAULT_CUSTOM_INSTRUCTIONS[category] || {};
    
    const newFields = defaultMeasurements
      .filter((field) => enabledFieldIds.has(field.id))
      .map((field, index) => ({
        ...field,
        enabled: true,
        order: index,
        // Apply default custom instructions for this category and field
        customInstructions: categoryInstructions[field.id] || "",
      }));

    const existingCustomFields = measurementFields.filter(
      (field) => !defaultMeasurements.find((df) => df.id === field.id)
    );
    newFields.push(...existingCustomFields.map((field, index) => ({
      ...field,
      order: newFields.length + index,
      // Apply default custom instructions if available
      customInstructions: categoryInstructions[field.id] || field.customInstructions || "",
    })));

    const sortedFields = newFields.sort((a, b) => a.order - b.order);
    setMeasurementFields(sortedFields);
    
    // Update baseline state to the new preset state (deep copy)
    baselineStateRef.current = {
      name: templateName,
      category: category,
      fields: JSON.parse(JSON.stringify(sortedFields)),
      fitPreferencesEnabled,
      stitchingNotesEnabled,
    };
    
    // Reset the flag after state updates
    setTimeout(() => {
      isApplyingPresetRef.current = false;
      setHasUnsavedChanges(false);
    }, 0);
    
    setShowUnsavedWarning(false);
  };

  const handleAddField = () => {
    setNewField({
      name: "",
      description: "",
      unit: "in",
      required: false,
      min: 0,
      max: 100,
      guideImage: null,
    });
    setEditingField(null);
    setShowFieldDialog(true);
  };

  const handleEditField = (field, index) => {
    setNewField({ ...field });
    setEditingField(index);
    setShowFieldDialog(true);
  };

  const handleSaveField = () => {
    if (!newField.name.trim()) {
      setSnackbar({
        open: true,
        message: "Field name is required",
        severity: "error",
      });
      return;
    }

    if (editingField !== null) {
      const updated = [...measurementFields];
      updated[editingField] = {
        ...updated[editingField],
        ...newField,
        id: updated[editingField].id || `custom-${Date.now()}`,
      };
      setMeasurementFields(updated);
    } else {
      const newFieldData = {
        ...newField,
        id: `custom-${Date.now()}`,
        enabled: true,
        order: measurementFields.length,
      };
      setMeasurementFields([...measurementFields, newFieldData]);
    }

    setShowFieldDialog(false);
    setEditingField(null);
  };

  const handleDeleteField = (index) => {
    setFieldToDelete(index);
    setShowDeleteFieldModal(true);
  };

  const handleConfirmDeleteField = () => {
    if (fieldToDelete !== null) {
      const updated = measurementFields.filter((_, i) => i !== fieldToDelete);
      updated.forEach((field, i) => {
        field.order = i;
      });
      setMeasurementFields(updated);
      setShowDeleteFieldModal(false);
      setFieldToDelete(null);
      setSnackbar({
        open: true,
        message: "Field deleted successfully",
        severity: "success",
      });
    }
  };

  const handleCancelDeleteField = () => {
    setShowDeleteFieldModal(false);
    setFieldToDelete(null);
  };

  const handleToggleField = (index) => {
    const updated = [...measurementFields];
    updated[index].enabled = !updated[index].enabled;
    setMeasurementFields(updated);
  };

  const handleToggleRequired = (index) => {
    const updated = [...measurementFields];
    updated[index].required = !updated[index].required;
    setMeasurementFields(updated);
  };

  const handleDragStart = (index) => {
    setDraggedFieldIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedFieldIndex === null || draggedFieldIndex === dropIndex) {
      setDraggedFieldIndex(null);
      return;
    }

    const updated = [...measurementFields];
    const draggedField = updated[draggedFieldIndex];
    updated.splice(draggedFieldIndex, 1);
    updated.splice(dropIndex, 0, draggedField);
    
    updated.forEach((field, index) => {
      field.order = index;
    });

    setMeasurementFields(updated);
    setDraggedFieldIndex(null);
  };

  // Handle "How to Measure" button click
  const handleOpenHowToMeasure = (field, index) => {
    setEditingHowToMeasureField(index);
    // Get default description from defaultMeasurements if it's a default field
    const defaultField = defaultMeasurements.find(df => df.id === field.id);
    // Get default custom instructions for this category and field
    const categoryInstructions = DEFAULT_CUSTOM_INSTRUCTIONS[templateCategory] || {};
    const defaultCustomInstructions = categoryInstructions[field.id] || "";
    // Get default description
    const defaultDescription = defaultField?.description || field.description || "";
    
    // Set custom instructions: use existing, or default for category, or default description
    const customInstructions = field.customInstructions || defaultCustomInstructions || defaultDescription;
    
    setHowToMeasureData({
      defaultDescription: defaultDescription,
      customInstructions: customInstructions,
      guideImage: null,
      guideImageUrl: field.guideImageUrl || field.guideImage || null,
    });
    setShowHowToMeasureDialog(true);
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({
          open: true,
          message: "Please upload an image file",
          severity: "error",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: "Image size should be less than 5MB",
          severity: "error",
        });
        return;
      }

      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setHowToMeasureData({
          ...howToMeasureData,
          guideImage: file,
          guideImageUrl: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle remove image
  const handleRemoveImage = () => {
    setHowToMeasureData({
      ...howToMeasureData,
      guideImage: null,
      guideImageUrl: null,
    });
  };

  // Save "How to Measure" data
  const handleSaveHowToMeasure = () => {
    if (editingHowToMeasureField === null) return;

    const updated = [...measurementFields];
    updated[editingHowToMeasureField] = {
      ...updated[editingHowToMeasureField],
      customInstructions: howToMeasureData.customInstructions,
      guideImageUrl: howToMeasureData.guideImageUrl,
      // Store base64 image data if available
      guideImage: howToMeasureData.guideImageUrl,
    };

    setMeasurementFields(updated);
    setShowHowToMeasureDialog(false);
    setEditingHowToMeasureField(null);
    setSnackbar({
      open: true,
      message: "How to measure guide updated successfully",
      severity: "success",
    });
  };

  const handleSave = useCallback(() => {
    const enabledFields = measurementFields.filter((f) => f.enabled);
    
    if (enabledFields.length === 0) {
      setSnackbar({
        open: true,
        message: "At least one measurement field must be enabled",
        severity: "error",
      });
      return;
    }

    const templateData = {
      name: templateName,
      category: templateCategory,
      measurementFields: measurementFields,
      fitPreferencesEnabled,
      stitchingNotesEnabled,
      fitPreferences: FIT_PREFERENCES,
      shop,
    };

    fetcher.submit(
      { template: JSON.stringify(templateData), id: initialTemplate?.id || "" },
      {
        method: "POST",
        action: "/api/measurement-template",
      }
    );
  }, [templateName, templateCategory, measurementFields, fitPreferencesEnabled, stitchingNotesEnabled, shop, initialTemplate, fetcher]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        setSnackbar({
          open: true,
          message: "Measurement template saved successfully",
          severity: "success",
        });
        // Update baseline state to current state after successful save (deep copy)
        baselineStateRef.current = {
          name: templateName,
          category: templateCategory,
          fields: JSON.parse(JSON.stringify(measurementFields)),
          fitPreferencesEnabled,
          stitchingNotesEnabled,
        };
        setHasUnsavedChanges(false);
        if (fetcher.data.template?.id && !initialTemplate?.id) {
          navigate(`/app/custom-size?id=${fetcher.data.template.id}`);
        }
      } else {
        setSnackbar({
          open: true,
          message: fetcher.data.error || "Failed to save template",
          severity: "error",
        });
      }
    }
  }, [fetcher.data, navigate, initialTemplate, templateName, templateCategory, measurementFields, fitPreferencesEnabled, stitchingNotesEnabled]);

  const enabledFields = measurementFields.filter((f) => f.enabled);

  return (
    <>
      <s-page heading="Custom Measurement (Tailor Maap)" />
      
      <div className="w-full max-w-full px-4 md:px-6 py-6 bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto">
          {/* Simple Header */}
          <Box sx={{ mb: 4, pb: 3, borderBottom: "2px solid #e5e7eb" }}>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <Typography variant="h5" sx={{ fontWeight: 600, color: "#111827", mb: 1 }}>
                  {initialTemplate ? "Edit Measurement Template" : "Measurement Template Builder"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  {initialTemplate 
                    ? `Editing: ${initialTemplate.name}` 
                    : "Create custom measurement templates for made-to-order clothing"}
                </Typography>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      setShowUnsavedWarning(true);
                      setPendingNavigation(() => () => navigate("/app/templates"));
                    } else {
                      navigate("/app/templates");
                    }
                  }}
                  sx={{
                    borderColor: "#d1d5db",
                    color: "#374151",
                    "&:hover": {
                      borderColor: "#9ca3af",
                      bgcolor: "#f9fafb",
                    },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={fetcher.state === "submitting"}
                  sx={{
                    bgcolor: "#111827",
                    color: "white",
                    "&:hover": {
                      bgcolor: "#1f2937",
                    },
                    "&:disabled": {
                      bgcolor: "#9ca3af",
                    },
                  }}
                >
                  {fetcher.state === "submitting" ? "Saving..." : initialTemplate ? "Update Template" : "Save Template"}
                </Button>
              </div>
            </div>
            <TextField
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              variant="outlined"
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#f9fafb",
                },
              }}
            />
          </Box>

          {/* Category Presets - Simple */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#111827", mb: 2 }}>
              Tailor Presets
            </Typography>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TAILOR_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={templateCategory === key ? "contained" : "outlined"}
                  onClick={() => handleCategoryChange(key)}
                  sx={{
                    textTransform: "none",
                    borderColor: "#d1d5db",
                    color: templateCategory === key ? "white" : "#374151",
                    bgcolor: templateCategory === key ? "#111827" : "white",
                    "&:hover": {
                      bgcolor: templateCategory === key ? "#1f2937" : "#f9fafb",
                      borderColor: "#9ca3af",
                    },
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </Box>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Measurement Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Measurement Fields Builder */}
              <Card sx={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
                <CardContent sx={{ p: 3 }}>
                  <div className="flex items-center justify-between mb-4">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#111827" }}>
                      Measurement Fields
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      variant="outlined"
                      size="small"
                      onClick={handleAddField}
                      sx={{
                        borderColor: "#d1d5db",
                        color: "#374151",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "#9ca3af",
                          bgcolor: "#f9fafb",
                        },
                      }}
                    >
                      Add Field
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {measurementFields.map((field, index) => (
                      <Box
                        key={field.id || index}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        sx={{
                          p: 2.5,
                          border: "1px solid #e5e7eb",
                          borderRadius: 1,
                          bgcolor: field.enabled ? "white" : "#f9fafb",
                          opacity: draggedFieldIndex === index ? 0.5 : field.enabled ? 1 : 0.6,
                          cursor: "move",
                          "&:hover": {
                            borderColor: "#d1d5db",
                            bgcolor: "#fafafa",
                          },
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <DragIndicatorIcon sx={{ color: "#9ca3af", mt: 0.5, fontSize: 20 }} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Typography variant="body2" sx={{ fontWeight: 500, color: "#111827" }}>
                                {field.name}
                              </Typography>
                              <Chip
                                label={field.unit}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.7rem",
                                  bgcolor: "#f3f4f6",
                                  color: "#6b7280",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                              {field.required && (
                                <Chip
                                  label="Required"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: "#fee2e2",
                                    color: "#991b1b",
                                    border: "1px solid #fecaca",
                                  }}
                                />
                              )}
                            </div>
                            {field.description && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: "#6b7280",
                                  display: "block",
                                  mb: 1,
                                  lineHeight: 1.5,
                                }}
                              >
                                {field.description}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                              Range: {field.min} - {field.max} {field.unit}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Tooltip title={field.required ? "Required" : "Optional"}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleRequired(index)}
                                disabled={!field.enabled}
                                sx={{
                                  color: field.required ? "#dc2626" : "#9ca3af",
                                  "&:hover": {
                                    bgcolor: "#f3f4f6",
                                  },
                                }}
                              >
                                {field.required ? (
                                  <RadioButtonCheckedIcon fontSize="small" />
                                ) : (
                                  <RadioButtonUncheckedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={field.enabled ? "Hide" : "Show"}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleField(index)}
                                sx={{
                                  color: field.enabled ? "#10b981" : "#9ca3af",
                                  "&:hover": {
                                    bgcolor: field.enabled ? "#d1fae5" : "#f3f4f6",
                                  },
                                }}
                              >
                                {field.enabled ? (
                                  <VisibilityIcon fontSize="small" />
                                ) : (
                                  <VisibilityOffIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="How to Measure">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenHowToMeasure(field, index)}
                                sx={{
                                  color: field.guideImageUrl || field.customInstructions ? "#3b82f6" : "#6b7280",
                                  "&:hover": {
                                    bgcolor: "#dbeafe",
                                    color: "#3b82f6",
                                  },
                                }}
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleEditField(field, index)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": {
                                    bgcolor: "#fef3c7",
                                    color: "#f59e0b",
                                  },
                                }}
                              >
                                <SettingsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteField(index)}
                                sx={{
                                  color: "#6b7280",
                                  "&:hover": {
                                    bgcolor: "#fee2e2",
                                    color: "#dc2626",
                                  },
                                }}
                              >
                                <RemoveCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </div>
                      </Box>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Features */}
              <Card sx={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#111827", mb: 3 }}>
                    Advanced Features
                  </Typography>
                  
                  <div className="space-y-4">
                    {/* Fit Preference */}
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={fitPreferencesEnabled}
                            onChange={(e) => setFitPreferencesEnabled(e.target.checked)}
                          />
                        }
                        label={
                          <Typography sx={{ fontWeight: 500, color: "#111827" }}>
                            Enable Fit Preference
                          </Typography>
                        }
                      />
                      {fitPreferencesEnabled && (
                        <Box sx={{ ml: 5, mt: 2, p: 2, bgcolor: "#f9fafb", borderRadius: 1, border: "1px solid #e5e7eb" }}>
                          <Typography variant="caption" sx={{ color: "#6b7280", display: "block", mb: 1 }}>
                            Fit options with ease allowance:
                          </Typography>
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(FIT_PREFERENCES).map(([key, fit]) => (
                              <Chip
                                key={key}
                                label={`${fit.label}: +${fit.ease}"`}
                                size="small"
                                sx={{
                                  bgcolor: "#f3f4f6",
                                  color: "#374151",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                            ))}
                          </div>
                        </Box>
                      )}
                    </Box>

                    <Divider />

                    {/* Stitching Notes */}
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={stitchingNotesEnabled}
                            onChange={(e) => setStitchingNotesEnabled(e.target.checked)}
                          />
                        }
                        label={
                          <Typography sx={{ fontWeight: 500, color: "#111827" }}>
                            Enable Stitching Notes
                          </Typography>
                        }
                      />
                      {stitchingNotesEnabled && (
                        <Box sx={{ ml: 5, mt: 2, p: 2, bgcolor: "#f9fafb", borderRadius: 1, border: "1px solid #e5e7eb" }}>
                          <Typography variant="caption" sx={{ color: "#6b7280", lineHeight: 1.6 }}>
                            Customers can add custom instructions like "I want slightly loose sleeves"
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className="lg:col-span-1">
              <Card 
                sx={{ 
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)", 
                  border: "1px solid #e5e7eb",
                  position: "sticky",
                  top: 20,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#111827", mb: 3 }}>
                    Customer Form Preview
                  </Typography>
                  
                  <Box sx={{ p: 3, bgcolor: "#f9fafb", borderRadius: 1, border: "1px solid #e5e7eb" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827", mb: 3 }}>
                      Product Page Preview
                    </Typography>
                    
                    {enabledFields.length === 0 ? (
                      <Box sx={{ textAlign: "center", py: 4, color: "#9ca3af" }}>
                        <Typography variant="body2">
                          No fields enabled
                        </Typography>
                      </Box>
                    ) : (
                      <Button
                        fullWidth
                        onClick={() => setShowCustomerFormModal(true)}
                        sx={{
                          ...glassmorphicButtonStyles.primary,
                          py: 1.5,
                          textTransform: "none",
                          fontWeight: 600,
                          borderRadius: 2,
                          transition: "all 0.3s ease",
                        }}
                      >
                        Custom Size
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Field Dialog */}
      <Dialog 
        open={showFieldDialog} 
        onClose={() => setShowFieldDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassmorphicModalStyle,
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2, 
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
            {editingField !== null ? "Edit Measurement Field" : "Add New Measurement Field"}
          </Typography>
        </DialogTitle>
        <DialogContent className="pt-5">
          <div className="space-y-4">
            <TextField
              fullWidth
              label="Field Name"
              value={newField.name}
              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
              required
              placeholder="e.g., Chest, Waist, Shoulder"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Helper Text (How to Measure)"
              value={newField.description}
              onChange={(e) =>
                setNewField({ ...newField, description: e.target.value })
              }
              placeholder="Instructions for customers on how to measure this field..."
            />
            <div className="grid grid-cols-2 gap-4">
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={newField.unit}
                  onChange={(e) => setNewField({ ...newField, unit: e.target.value })}
                  label="Unit"
                >
                  <MenuItem value="in">Inches (in)</MenuItem>
                  <MenuItem value="cm">Centimeters (cm)</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  />
                }
                label="Required Field"
                sx={{ mt: 2 }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Min Value"
                type="number"
                value={newField.min}
                onChange={(e) =>
                  setNewField({ ...newField, min: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="Max Value"
                type="number"
                value={newField.max}
                onChange={(e) =>
                  setNewField({ ...newField, max: parseFloat(e.target.value) || 100 })
                }
              />
            </div>
            <Typography variant="caption" sx={{ color: "#6b7280" }}>
              Note: Guide images can be uploaded later through product assignment.
            </Typography>
          </div>
        </DialogContent>
        <DialogActions 
          sx={{ 
            p: 3, 
            pt: 2, 
            borderTop: "1px solid rgba(229, 231, 235, 0.5)",
            background: "linear-gradient(135deg, rgba(249, 250, 251, 0.5) 0%, rgba(243, 244, 246, 0.5) 100%)",
            backdropFilter: "blur(10px)",
            gap: 2,
          }}
        >
          <Button 
            onClick={() => setShowFieldDialog(false)}
            sx={{ 
              ...glassmorphicButtonStyles.cancel,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              py: 1,
              transition: "all 0.3s ease",
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveField} 
            sx={{
              ...glassmorphicButtonStyles.primary,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              py: 1,
              transition: "all 0.3s ease",
            }}
          >
            {editingField !== null ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Warning */}
      <Dialog 
        open={showUnsavedWarning} 
        onClose={() => setShowUnsavedWarning(false)}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            maxWidth: "500px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2.5,
            pt: 3,
            px: 3,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WarningAmberIcon sx={{ color: "#f59e0b", fontSize: "24px" }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", fontSize: "18px" }}>
            Unsaved Changes
          </Typography>
        </DialogTitle>
        <DialogContent className="p-5 pt-5">
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: "#374151", fontSize: "14px", lineHeight: 1.6 }}>
                You have unsaved changes. Are you sure you want to continue?
              </Typography>
              <Typography sx={{ color: "#6b7280", fontSize: "13px", mt: 1, lineHeight: 1.5 }}>
                If you continue, all unsaved changes will be lost and cannot be recovered.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{ 
            p: 3, 
            pt: 2.5, 
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button 
            onClick={() => setShowUnsavedWarning(false)}
            startIcon={<CancelIcon sx={{ fontSize: "18px" }} />}
            sx={{ 
              ...glassmorphicButtonStyles.cancel,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              py: 1.25,
              fontSize: "14px",
              transition: "all 0.2s ease",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (pendingNavigation) {
                pendingNavigation();
                setPendingNavigation(null);
              }
              setShowUnsavedWarning(false);
            }}
            startIcon={<DeleteIcon sx={{ fontSize: "18px" }} />}
            sx={{
              textTransform: "none",
              color: "#dc2626",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              background: "rgba(220, 38, 38, 0.2)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              boxShadow: "none",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(220, 38, 38, 0.3)",
                borderColor: "rgba(220, 38, 38, 0.4)",
                boxShadow: "none",
              },
            }}
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Field Modal */}
      <Dialog 
        open={showDeleteFieldModal} 
        onClose={handleCancelDeleteField}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            maxWidth: "500px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2.5,
            pt: 3,
            px: 3,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <DeleteIcon sx={{ color: "#dc2626", fontSize: "24px" }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", fontSize: "18px" }}>
            Delete Field
          </Typography>
        </DialogTitle>
        <DialogContent className="p-5 pt-5">
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: "#374151", fontSize: "14px", lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>"{fieldToDelete !== null ? measurementFields[fieldToDelete]?.name : ''}"</strong>?
              </Typography>
              <Typography sx={{ color: "#6b7280", fontSize: "13px", mt: 1, lineHeight: 1.5 }}>
                This action cannot be undone. The field will be permanently removed from your measurement template.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{ 
            p: 3, 
            pt: 2.5, 
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button 
            onClick={handleCancelDeleteField}
            startIcon={<CancelIcon sx={{ fontSize: "18px" }} />}
            sx={{ 
              ...glassmorphicButtonStyles.cancel,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              py: 1.25,
              fontSize: "14px",
              transition: "all 0.2s ease",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteField}
            startIcon={<DeleteIcon sx={{ fontSize: "18px" }} />}
            sx={{
              textTransform: "none",
              color: "#dc2626",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              background: "rgba(220, 38, 38, 0.2)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              boxShadow: "none",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(220, 38, 38, 0.3)",
                borderColor: "rgba(220, 38, 38, 0.4)",
                boxShadow: "none",
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Form Modal */}
      <Dialog 
        open={showCustomerFormModal} 
        onClose={() => setShowCustomerFormModal(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "12px",
            maxHeight: "90vh",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 3,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <StraightenIcon sx={{ color: "#111827", fontSize: "20px" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", fontSize: "18px" }}>
              Enter Your Measurements
            </Typography>
          </Box>
          <IconButton
            onClick={() => setShowCustomerFormModal(false)}
            size="small"
            sx={{ 
              color: "#6b7280",
              "&:hover": {
                background: "#f3f4f6",
                color: "#111827",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
          <Tabs 
            value={customerFormActiveTab} 
            onChange={(e, newValue) => setCustomerFormActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 600,
                minHeight: "48px",
                color: "#6b7280",
                "&.Mui-selected": {
                  color: "#111827",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#111827",
                height: "2px",
              },
            }}
          >
            <Tab label="Details" />
            <Tab label="How to Measure" />
          </Tabs>
        </Box>

        {/* Content */}
        <DialogContent sx={{ p: 3, maxHeight: "calc(90vh - 180px)", overflowY: "auto", background: "#ffffff" }}>
          {customerFormActiveTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {enabledFields.map((field) => (
                <Box 
                  key={field.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  {/* Info Icon */}
                  <Tooltip 
                    title={field.customInstructions || field.description || "Measurement guide"}
                    arrow
                  >
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedGuideField(field);
                        setShowMeasurementGuideModal(true);
                      }}
                      sx={{
                        color: "#6b7280",
                        p: 0.5,
                        minWidth: "24px",
                        minHeight: "24px",
                        "&:hover": {
                          bgcolor: "#f3f4f6",
                          color: "#111827",
                        },
                      }}
                    >
                      <InfoIcon sx={{ fontSize: "16px" }} />
                    </IconButton>
                  </Tooltip>
                  
                  {/* Label */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      color: "#111827",
                      fontSize: "14px",
                      minWidth: "140px",
                    }}
                  >
                    {field.name}
                    {field.required && (
                      <Typography component="span" sx={{ color: "#dc2626", ml: 0.5 }}>
                        *
                      </Typography>
                    )}
                  </Typography>
                  
                  {/* Input Field */}
                  <TextField
                    type="number"
                    size="small"
                    placeholder={`Enter ${field.name.toLowerCase()}`}
                    value={customerFormData[field.id] || ""}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        [field.id]: e.target.value,
                      })
                    }
                    required={field.required}
                    fullWidth
                    inputProps={{
                      min: field.min,
                      max: field.max,
                      step: field.unit === "in" ? 0.25 : 0.5,
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#ffffff",
                        fontSize: "14px",
                        "& fieldset": {
                          borderColor: "#e5e7eb",
                          borderWidth: "1px",
                        },
                        "&:hover fieldset": {
                          borderColor: "#d1d5db",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#3b82f6",
                          borderWidth: "2px",
                        },
                      },
                    }}
                  />
                </Box>
              ))}

              {/* Fit Preference */}
              {fitPreferencesEnabled && enabledFields.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      color: "#111827", 
                      mb: 1.5, 
                      fontSize: "14px",
                      display: "block",
                    }}
                  >
                    Fit Preference
                  </Typography>
                  <Select
                    size="small"
                    fullWidth
                    value={customerFormData.fitPreference || ""}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        fitPreference: e.target.value,
                      })
                    }
                    displayEmpty
                    sx={{
                      bgcolor: "#ffffff",
                      fontSize: "14px",
                      height: "40px",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#e5e7eb",
                        borderWidth: "1px",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#d1d5db",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#3b82f6",
                        borderWidth: "2px",
                      },
                      "& .MuiSelect-select": {
                        py: 1.25,
                        fontSize: "14px",
                        color: customerFormData.fitPreference ? "#111827" : "#9ca3af",
                      },
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: "14px", color: "#9ca3af" }}>
                      <em>Select fit preference</em>
                    </MenuItem>
                    {Object.entries(FIT_PREFERENCES).map(([key, fit]) => (
                      <MenuItem 
                        key={key} 
                        value={key}
                        sx={{ fontSize: "14px" }}
                      >
                        {fit.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              )}

              {/* Stitching Notes */}
              {stitchingNotesEnabled && enabledFields.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500, 
                      color: "#111827", 
                      mb: 1.5, 
                      fontSize: "14px",
                      display: "block",
                    }}
                  >
                    Stitching Notes{" "}
                    <Typography 
                      component="span" 
                      sx={{ 
                        color: "#9ca3af", 
                        fontWeight: 400, 
                        fontSize: "13px" 
                      }}
                    >
                      (Optional)
                    </Typography>
                  </Typography>
                  <TextField
                    multiline
                    rows={4}
                    size="small"
                    placeholder="E.g., I want slightly loose sleeves"
                    value={customerFormData.stitchingNotes || ""}
                    onChange={(e) =>
                      setCustomerFormData({
                        ...customerFormData,
                        stitchingNotes: e.target.value,
                      })
                    }
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "#ffffff",
                        fontSize: "14px",
                        "& fieldset": {
                          borderColor: "#e5e7eb",
                          borderWidth: "1px",
                        },
                        "&:hover fieldset": {
                          borderColor: "#d1d5db",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#3b82f6",
                          borderWidth: "2px",
                        },
                        "& textarea": {
                          fontSize: "14px",
                          color: "#111827",
                          "&::placeholder": {
                            color: "#9ca3af",
                            opacity: 1,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {customerFormActiveTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {enabledFields.map((field) => (
                <Box
                  key={field.id}
                  sx={{
                    p: 2.5,
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    bgcolor: "#ffffff",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 600,
                        color: "#111827",
                        fontSize: "15px",
                      }}
                    >
                      {field.name}
                      {field.required && (
                        <Typography component="span" sx={{ color: "#dc2626", ml: 0.5 }}>
                          *
                        </Typography>
                      )}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#6b7280",
                          fontSize: "12px",
                        }}
                      >
                        Click the info button for more details
                      </Typography>
                      <Tooltip title="View measurement guide" arrow>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedGuideField(field);
                            setShowMeasurementGuideModal(true);
                          }}
                          sx={{
                            color: field.guideImageUrl || field.customInstructions ? "#3b82f6" : "#6b7280",
                            p: 0.75,
                            "&:hover": {
                              bgcolor: "#eff6ff",
                              color: "#3b82f6",
                            },
                          }}
                        >
                          <InfoIcon sx={{ fontSize: "20px" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  {field.guideImageUrl && (
                    <Box
                      sx={{
                        mb: 2,
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <Box
                        component="img"
                        src={field.guideImageUrl}
                        alt={`How to measure ${field.name}`}
                        sx={{
                          width: "100%",
                          maxHeight: "300px",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </Box>
                  )}
                  
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#374151",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {field.customInstructions || field.description || "No measurement instructions available."}
                  </Typography>
                  
                  {field.min !== undefined && field.max !== undefined && (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #e5e7eb" }}>
                      <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "12px" }}>
                        Range: {field.min} - {field.max} {field.unit}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions 
          sx={{ 
            p: 3, 
            pt: 2.5, 
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          <Button 
            onClick={() => {
              setShowCustomerFormModal(false);
              setCustomerFormData({});
            }}
            sx={{ 
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              py: 1.25,
              fontSize: "14px",
              borderColor: "#d1d5db",
              color: "#374151",
              bgcolor: "#ffffff",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "#f9fafb",
                borderColor: "#9ca3af",
              },
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              // Validate required fields
              const missingFields = enabledFields
                .filter(f => f.required && !customerFormData[f.id])
                .map(f => f.name);
              
              if (missingFields.length > 0) {
                setSnackbar({
                  open: true,
                  message: `Please fill required fields: ${missingFields.join(", ")}`,
                  severity: "error",
                });
                return;
              }
              
              // In real implementation, this would submit to cart/order
              setSnackbar({
                open: true,
                message: "Measurements saved successfully!",
                severity: "success",
              });
              setShowCustomerFormModal(false);
            }}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              px: 3,
              py: 1.25,
              fontSize: "14px",
              bgcolor: "#111827",
              color: "#ffffff",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "#1f2937",
                boxShadow: "0 4px 12px rgba(17, 24, 39, 0.2)",
              },
            }}
            variant="contained"
          >
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Measurement Guide Modal */}
      <Dialog 
        open={showMeasurementGuideModal} 
        onClose={() => {
          setShowMeasurementGuideModal(false);
          setSelectedGuideField(null);
        }} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassmorphicModalStyle,
            borderRadius: 3,
            maxHeight: "90vh",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2, 
            pt: 2,
            px: 2,
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff",
            position: "relative",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827", fontSize: "15px", mb: 0.5 }}>
                How to Measure: {selectedGuideField?.name || ""}
              </Typography>
              <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "13px" }}>
                Follow these instructions to get accurate measurements
              </Typography>
            </Box>
            <IconButton
              onClick={() => {
                setShowMeasurementGuideModal(false);
                setSelectedGuideField(null);
              }}
              size="small"
              sx={{ 
                color: "#6b7280",
                "&:hover": {
                  background: "#f3f4f6",
                  color: "#111827",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent className="p-3 pt-5">
          {selectedGuideField && (
            <Box className="flex flex-col items-center justify-center">
              {/* Guide Image */}
              {selectedGuideField.guideImageUrl ? (
                <Box
                  sx={{
                    mb: 3,
                   
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  
                    p: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={selectedGuideField.guideImageUrl}
                    alt={`How to measure ${selectedGuideField.name}`}
                    sx={{
                      maxWidth: "100%",
                      maxHeight: "250px",
                      borderRadius: 1,
                      objectFit: "contain",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    mb: 3,
                    p: 6,
                    width: "250px",
                    height: "250px",
                    background: "#ffffff",
                    borderRadius: 2,
                    border: "2px dashed #d1d5db",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 200,
                  }}
                >
                  <ImageIcon sx={{ fontSize: 64, color: "#d1d5db", mb: 1.5 }} />
                  <Typography variant="body2" sx={{ color: "#9ca3af", fontSize: "14px" }}>
                    No guide image available
                  </Typography>
                </Box>
              )}

              {/* Instructions */}
              <Box
                sx={{
                  mb: 3,
                  p: 3,
                  background: "#f9fafb",
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <DescriptionIcon sx={{ color: "#111827", fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", fontSize: "15px" }}>
                    Measurement Instructions
                  </Typography>
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: "#374151", 
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    fontSize: "14px",
                  }}
                >
                  {selectedGuideField.customInstructions || selectedGuideField.description || "No custom instructions available. Please refer to the guide image above."}
                </Typography>
              </Box>

              {/* Measurement Details */}
              <Box
                sx={{
                  width: "100%",
                  p: 2,
                  background: "#f9fafb",
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", mb: 1, fontSize: "15px" }}>
                  Measurement Details
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#111827", fontSize: "14px" }}>
                      Unit
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500, fontSize: "14px" }}>
                      {selectedGuideField.unit === "in" ? "Inches" : "Centimeters"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#111827", fontSize: "14px" }}>
                      Required
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500, fontSize: "14px" }}>
                      {selectedGuideField.required ? "Yes" : "No"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ color: "#111827", fontSize: "14px" }}>
                      Range
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500, fontSize: "14px" }}>
                      {selectedGuideField.min} - {selectedGuideField.max} {selectedGuideField.unit}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
     
      </Dialog>

      {/* How to Measure Dialog */}
      <Dialog 
        open={showHowToMeasureDialog} 
        onClose={() => setShowHowToMeasureDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            ...glassmorphicModalStyle,
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2, 
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div className="flex items-center justify-between">
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
              How to Measure: {editingHowToMeasureField !== null ? measurementFields[editingHowToMeasureField]?.name : ""}
            </Typography>
            <IconButton
              onClick={() => setShowHowToMeasureDialog(false)}
              size="small"
              sx={{ 
                color: "#6b7280",
                background: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                "&:hover": {
                  background: "rgba(255, 255, 255, 0.7)",
                  transform: "rotate(90deg)",
                  transition: "all 0.3s ease",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent className="p-3">
          <div className="space-y-4">
            {/* Image Upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", mb: 1 }}>
                Guide Image
              </Typography>
              {howToMeasureData.guideImageUrl ? (
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <Box
                    component="img"
                    src={howToMeasureData.guideImageUrl}
                    alt="Guide image"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 300,
                      borderRadius: 1,
                      border: "1px solid #e5e7eb",
                      display: "block",
                    }}
                  />
                  <IconButton
                    onClick={handleRemoveImage}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "rgba(255,255,255,0.9)",
                      "&:hover": {
                        bgcolor: "#fee2e2",
                        color: "#dc2626",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: "2px dashed #d1d5db",
                    borderRadius: 1,
                    p: 4,
                    textAlign: "center",
                    bgcolor: "#f9fafb",
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: "#9ca3af",
                      bgcolor: "#f3f4f6",
                    },
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="image-upload"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="image-upload">
                    <Box sx={{ cursor: "pointer" }}>
                      <ImageIcon sx={{ fontSize: 48, color: "#9ca3af", mb: 1 }} />
                      <Typography variant="body2" sx={{ color: "#6b7280", mb: 1 }}>
                        Click to upload guide image
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                        PNG, JPG up to 5MB
                      </Typography>
                    </Box>
                  </label>
                </Box>
              )}
            </Box>

           

            {/* Custom Instructions Text Editor */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#111827", mb: 1 }}>
                Custom Instructions
              </Typography>
              {howToMeasureData.customInstructions && howToMeasureData.customInstructions === howToMeasureData.defaultDescription && (
                <Box
                  sx={{
                    p: 1.5,
                    mb: 1,
                    bgcolor: "#eff6ff",
                    borderRadius: 1,
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#1e40af", fontSize: "0.7rem" }}>
                    ℹ️ Default instructions are pre-filled. You can edit or customize them as needed.
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                multiline
                rows={4}
                value={howToMeasureData.customInstructions}
                onChange={(e) =>
                  setHowToMeasureData({
                    ...howToMeasureData,
                    customInstructions: e.target.value,
                  })
                }
                placeholder="Add instructions, tips, or notes for customers on how to measure this field. Default instructions are pre-filled based on the selected clothing type."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#f9fafb",
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: "#9ca3af", mt: 0.5, display: "block" }}>
                These instructions will be shown to customers. Default instructions are automatically set based on the clothing type, but you can customize them as needed.
              </Typography>
            </Box>
          </div>
        </DialogContent>
        <DialogActions 
          sx={{ 
            p: 3, 
            pt: 2, 
            borderTop: "1px solid rgba(229, 231, 235, 0.5)",
            background: "linear-gradient(135deg, rgba(249, 250, 251, 0.5) 0%, rgba(243, 244, 246, 0.5) 100%)",
            backdropFilter: "blur(10px)",
            gap: 2,
          }}
        >
          <Button 
            onClick={() => {
              setShowHowToMeasureDialog(false);
              setEditingHowToMeasureField(null);
            }}
            sx={{ 
              ...glassmorphicButtonStyles.cancel,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              py: 1,
              transition: "all 0.3s ease",
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveHowToMeasure} 
            sx={{
              ...glassmorphicButtonStyles.primary,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              py: 1,
              transition: "all 0.3s ease",
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ 
            width: "100%",
            borderRadius: 1,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CustomMeasurementBuilder;
