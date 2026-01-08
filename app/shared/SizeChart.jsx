import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Button,
  Tooltip,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import StraightenIcon from '@mui/icons-material/Straighten';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';

const SizeChart = ({ open, onClose, brandName = "ALPHA TRIBE", template = null, templates = null, productId = null, productName = null }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [unit, setUnit] = useState('in');
  const [fieldValues, setFieldValues] = useState({});
  const [fieldUnits, setFieldUnits] = useState({});
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [fitPreference, setFitPreference] = useState('');
  const [stitchingNotes, setStitchingNotes] = useState('');

  // Support both single template (backward compatibility) and array of templates
  // Ensure templatesArray is always an array
  const templatesArray = Array.isArray(templates) 
    ? templates 
    : (templates ? [templates] : (template ? [template] : []));
  
  // Separate templates by type - handle both string and already-parsed chartData
  const tableTemplate = templatesArray.find(t => {
    let chartData = {};
    try {
      if (typeof t.chartData === 'string') {
        chartData = JSON.parse(t.chartData || '{}');
      } else if (t.chartData && typeof t.chartData === 'object') {
        chartData = t.chartData;
      }
    } catch (e) {
      console.error('[SizeChart] Error parsing chartData for template:', t.name, e);
      chartData = {};
    }
    // Table template = NOT a measurement template
    return chartData.isMeasurementTemplate !== true;
  });
  
  const customTemplate = templatesArray.find(t => {
    let chartData = {};
    try {
      if (typeof t.chartData === 'string') {
        chartData = JSON.parse(t.chartData || '{}');
      } else if (t.chartData && typeof t.chartData === 'object') {
        chartData = t.chartData;
      }
    } catch (e) {
      console.error('[SizeChart] Error parsing chartData for template:', t.name, e);
      chartData = {};
    }
    // Custom template = IS a measurement template
    return chartData.isMeasurementTemplate === true;
  });
  
  // Determine which tabs to show
  const hasTableTemplate = !!tableTemplate;
  const hasCustomTemplate = !!customTemplate;
  
  // Debug: Log template detection
  React.useEffect(() => {
    if (open && templatesArray.length > 0) {
      console.log('[SizeChart] Template Analysis:', {
        totalTemplates: templatesArray.length,
        templateNames: templatesArray.map(t => t.name),
        hasTableTemplate,
        hasCustomTemplate,
        tableTemplate: tableTemplate?.name,
        customTemplate: customTemplate?.name,
        templatesArray: templatesArray.map(t => ({
          name: t.name,
          chartDataType: typeof t.chartData,
          chartDataKeys: typeof t.chartData === 'object' ? Object.keys(t.chartData || {}) : 'N/A',
          isMeasurementTemplate: typeof t.chartData === 'object' ? t.chartData?.isMeasurementTemplate : 'N/A'
        }))
      });
    }
  }, [open, templatesArray.length, hasTableTemplate, hasCustomTemplate, tableTemplate?.name, customTemplate?.name]);
  
  // Use active template based on current tab
  // Tab 0 = Table Template (if exists), Tab 1 = Custom Template (if exists)
  let currentTemplate = null;
  if (hasTableTemplate && hasCustomTemplate) {
    currentTemplate = activeTab === 0 ? tableTemplate : customTemplate;
  } else if (hasTableTemplate) {
    currentTemplate = tableTemplate;
  } else if (hasCustomTemplate) {
    currentTemplate = customTemplate;
  } else {
    currentTemplate = templatesArray.length > 0 ? templatesArray[0] : null;
  }

  // Use template data if available, otherwise use default
  const chartData = currentTemplate?.chartData || {};
  const sizeData = chartData.sizeData || [];
  const columns = chartData.columns || [];
  
  // Remove measurement instructions from description as they're already in "How to Measure" tab
  const removeMeasurementInstructions = (html) => {
    if (!html) return '';
    
    // First, try to match and remove measurement instructions in common HTML formats
    // This handles patterns like <p>Chest: Measure...</p> or <div>Shoulder: Measure...</div>
    const htmlPatterns = [
      // Match complete HTML blocks containing measurement instructions
      /<(?:p|div|li|span|strong|b)[^>]*>\s*(?:Chest|Shoulder|Length|Waist|Hip|Hips|Inseam|Sleeve|Bust|Neck|Arm):\s*[^<]*(?:(?:Measure|measure|wrap|Wrap)[^<]*?)?[^<]*?\.?\s*<\/\w+>/gis,
      // Match multi-line patterns (including newlines and multiple sentences)
      /(?:<[^>]*>)?\s*(?:Chest|Shoulder|Length|Waist|Hip|Hips|Inseam|Sleeve|Bust|Neck|Arm):\s*[^<]*(?:Measure|measure|wrap|Wrap|around|from|down)[^<]*?\.(?:[^<]*?\.)?\s*(?:<\/[^>]*>)?/gis,
    ];
    
    let cleaned = html;
    
    // Apply HTML patterns first (more specific)
    htmlPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Then apply text-based patterns for remaining cases
    const textPatterns = [
      // Catch any remaining measurement field patterns (case insensitive)
      /\b(?:Chest|Shoulder|Length|Waist|Hip|Hips|Inseam|Sleeve|Bust|Neck|Arm):\s*[^\n]*(?:Measure|measure|wrap|Wrap|around|from|down)[^\n]*?\.[^\n]*/gi,
      ];
      
    textPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
      });
      
    // Remove empty tags and clean up
      cleaned = cleaned.replace(/<[^>]+>\s*<\/[^>]+>/gi, '');
      cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
      cleaned = cleaned.replace(/<div[^>]*>\s*<\/div>/gi, '');
    cleaned = cleaned.replace(/<li[^>]*>\s*<\/li>/gi, '');
    cleaned = cleaned.replace(/<span[^>]*>\s*<\/span>/gi, '');
    cleaned = cleaned.replace(/<strong[^>]*>\s*<\/strong>/gi, '');
    cleaned = cleaned.replace(/<b[^>]*>\s*<\/b>/gi, '');
    
    // Remove multiple consecutive newlines/whitespace
    cleaned = cleaned.replace(/\n\s*\n/g, '\n');
      cleaned = cleaned.trim();
      
      return cleaned;
  };
  
  const rawDescription = currentTemplate?.description || chartData.description || '';
  const description = removeMeasurementInstructions(rawDescription);
  
  // Extract sizes from template data or use default
  const sizes = sizeData.length > 0 
    ? sizeData.map(row => row.size || row.Size || '').filter(Boolean)
    : ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL'];

  
  
  // Reset active tab when templates change
  React.useEffect(() => {
    if (hasTableTemplate && hasCustomTemplate) {
      setActiveTab(0); // Start with Table Details
    } else if (hasTableTemplate || hasCustomTemplate) {
      setActiveTab(0); // Start with Details tab
    }
  }, [hasTableTemplate, hasCustomTemplate]);

  const handleUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setUnit(newUnit);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: '8px',
          margin: { xs: '16px', sm: '32px' },
          width: { xs: 'calc(100% - 32px)', sm: '800px' },
          maxWidth: { xs: 'calc(100% - 32px)', sm: '700px' },
          maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
          height: { xs: 'auto', sm: 'auto' },
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <DialogContent sx={{ 
        p: 0, 
        overflow: 'hidden',
        maxHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 128px)' },
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {/* Modal Header */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          borderBottom: '1px solid #e1e3e5',
          bgcolor: '#ffffff',
          flexShrink: 0,
        }}>
          {/* Top Header Row */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            pb: hasTableTemplate && hasCustomTemplate ? 1 : 2,
        }}>
          <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>
            Size Chart
          </Typography>
            {hasTableTemplate && hasCustomTemplate && (
            <Box sx={{ px: 2, pb: 0 }}>
              <Tabs 
                value={activeTab < 2 ? 0 : 1}
                onChange={(e, newValue) => {
                  // Template type tab: 0 = table, 1 = custom
                  // After template type selection, reset to Details tab
                  setActiveTab(newValue === 0 ? 0 : 2);
                }}
                sx={{
                  minHeight: '48px',
                  '& .MuiTabs-flexContainer': {
                    gap: '8px',
                  },
                  '& .MuiTab-root': {
                    minHeight: '48px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#6d7175',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    border: '1px solid transparent',
                    '&:hover': {
                      backgroundColor: '#f6f6f7',
                      color: '#202223',
                    },
                    '&.Mui-selected': {
                      color: '#202223',
                      backgroundColor: '#f0f0f0',
                      borderColor: '#d1d5db',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none',
                  },
                }}
              >
                <Tab label="Table Chart" />
                <Tab label="Custom Size" />
              </Tabs>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Unit Toggle */}
            <ToggleButtonGroup
              value={unit}
              exclusive
              onChange={handleUnitChange}
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
              onClick={onClose}
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

        
        </Box>

        {/* Content Tabs - Details and How to Measure */}
        {(hasTableTemplate || hasCustomTemplate) && (
          <Box sx={{ 
            borderBottom: '1px solid #e1e3e5', 
            flexShrink: 0, 
            backgroundColor: '#ffffff',
            px: 2,
          }}>
          <Tabs 
              value={(() => {
                // Map activeTab to content tab index (0 = Details, 1 = How to Measure)
                if (hasTableTemplate && hasCustomTemplate) {
                  // Both templates: activeTab 0 = Table Details, 1 = Table How to Measure, 2 = Custom Details, 3 = Custom How to Measure
                  if (activeTab === 0 || activeTab === 2) return 0; // Details
                  if (activeTab === 1 || activeTab === 3) return 1; // How to Measure
                } else {
                  // Single template: 0 = Details, 1 = How to Measure
                  return activeTab === 0 ? 0 : 1;
                }
                return 0;
              })()}
              onChange={(e, newValue) => {
                // Determine which template we're viewing and set appropriate activeTab
                if (hasTableTemplate && hasCustomTemplate) {
                  // Both exist: determine current template from activeTab
                  const isViewingTable = activeTab < 2;
                  setActiveTab(isViewingTable ? (newValue === 0 ? 0 : 1) : (newValue === 0 ? 2 : 3));
                } else {
                  // Single template: 0 = Details, 1 = How to Measure
                  setActiveTab(newValue);
                }
              }}
            sx={{
              minHeight: '48px',
                '& .MuiTabs-flexContainer': {
                  gap: 0,
                },
              '& .MuiTab-root': {
                minHeight: '48px',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'none',
                color: '#6d7175',
                  padding: '0 24px',
                  marginRight: '32px',
                  transition: 'color 0.2s ease',
                  '&:hover': {
                    color: '#202223',
                    backgroundColor: '#f9fafb',
                  },
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
        )}

        {/* Tab Content */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          p: 2,
          minHeight: 0,
        }}>
          {(() => {
            // Determine which template and which content tab (Details or How to Measure)
            let displayTemplate = null;
            let isDetailsTab = true;
            
            if (hasTableTemplate && hasCustomTemplate) {
              // Both exist: 
              // activeTab 0 = Table Details, 1 = Table How to Measure
              // activeTab 2 = Custom Details, 3 = Custom How to Measure
              if (activeTab === 0 || activeTab === 1) {
                displayTemplate = tableTemplate;
                isDetailsTab = activeTab === 0;
              } else {
                displayTemplate = customTemplate;
                isDetailsTab = activeTab === 2;
              }
            } else if (hasTableTemplate) {
              // Only table exists: 0 = Details, 1 = How to Measure
              displayTemplate = tableTemplate;
              isDetailsTab = activeTab === 0;
            } else if (hasCustomTemplate) {
              // Only custom exists: 0 = Details, 1 = How to Measure
              displayTemplate = customTemplate;
              isDetailsTab = activeTab === 0;
            } else {
              // Fallback
              displayTemplate = currentTemplate;
            }
            
            const displayChartData = displayTemplate?.chartData || {};
            const displaySizeData = displayChartData.sizeData || [];
            const displayColumns = displayChartData.columns || [];
            const isCustomTemplate = displayChartData?.isMeasurementTemplate === true;
            
            if (!displayTemplate) {
              return (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography sx={{ fontSize: '16px', color: '#6d7175', mb: 2 }}>
                    No template assigned to this product
                  </Typography>
                </Box>
              );
            }
            
            // How to Measure Tab Content
            if (!isDetailsTab) {
              // Custom Template - How to Measure
              if (isCustomTemplate) {
                const measurementFields = displayChartData.measurementFields || [];
                const enabledFields = measurementFields.filter(field => field.enabled);
                
                const showFieldGuide = (field) => {
                  setSelectedField(field);
                  setGuideModalOpen(true);
                };
                
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {enabledFields
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((field) => (
                        <Box
                          key={field.id}
                          sx={{
                            p: 2.5,
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            bgcolor: "#f9fafb",
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
                              {field.name || field.id}
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
                                  onClick={() => showFieldGuide(field)}
                                  sx={{
                                    color: field.guideImageUrl || field.guideImage || field.customInstructions || field.description ? "#3b82f6" : "#6b7280",
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
                          
                          <Typography
                            variant="body2"
                      sx={{
                              color: "#374151",
                              fontSize: "14px",
                              lineHeight: 1.7,
                              whiteSpace: "pre-wrap",
                              mb: 1.5,
                            }}
                          >
                            {field.customInstructions || field.description || "No measurement instructions available."}
                      </Typography>
                          
                          {field.min !== undefined && field.max !== undefined && (
                            <Box sx={{ pt: 1.5, borderTop: "1px solid #e5e7eb" }}>
                              <Typography variant="caption" sx={{ color: "#6b7280", fontSize: "12px" }}>
                                Range: {field.min} - {field.max} {field.unit || 'in'}
                      </Typography>
                    </Box>
                  )}
                        </Box>
                      ))}
            </Box>
                );
              }
              
              // Table Template - How to Measure
              return (
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
                  {displayChartData.measurementFile && (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                   width: '250px',
                   overflow: 'hidden',
                    maxHeight: '400px',
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e1e3e5',
                    position: 'relative',
                  }}
                >
                  <Typography
                    sx={{
                      width: '100%',
                      fontSize: '14px',
                      color: '#6d7175',
                      fontStyle: 'italic',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      overflow: 'hidden',
                    }}
                  >
                        <img src={displayChartData.measurementFile} alt="Measurement guide" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                  </Typography>
                </Box>
                </Box>
              )}

              {/* Measurement Instructions */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
                    {displayTemplate.description && displayTemplate.description.trim() ? (
                  <Box
                    sx={{
                      fontSize: '14px',
                      color: '#6d7175',
                      lineHeight: 1.7,
                      '& p': {
                        marginBottom: '14px',
                        '&:last-child': {
                          marginBottom: 0,
                        },
                      },
                      '& strong, & b': {
                        color: '#202223',
                        fontWeight: 600,
                      },
                    }}
                        dangerouslySetInnerHTML={{ __html: displayTemplate.description }}
                  />
                ) : (
                  <>
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
                  </>
                )}
              </Box>
                </Box>
              );
            }
            
            // Details Tab Content - Table Template Display
            if (!isCustomTemplate) {
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                  <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: '#202223' }}>
                    {displayTemplate.name || 'Size Chart'}
                  </Typography>
                  {displaySizeData.length > 0 ? (
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
                            {displayColumns.map((column) => (
                              <TableCell key={column.id} sx={{ fontWeight: 600, fontSize: '12px', color: '#202223', borderRight: '1px solid #e1e3e5', minWidth: '100px' }}>
                                {column.label}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {displaySizeData.map((row, index) => (
                            <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
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
                                {row.size || row.Size || '-'}
                              </TableCell>
                              {displayColumns.map((column) => (
                                <TableCell key={column.id} sx={{ fontSize: '12px', color: '#6d7175', borderRight: '1px solid #e1e3e5' }}>
                                  {row[column.id] || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>
                        No size data available in this template.
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            } else {
              // Custom Size Template Display - Form-like UI
              const measurementFields = displayChartData.measurementFields || [];
              const enabledFields = measurementFields.filter(field => field.enabled);
              const fitPreferencesEnabled = displayChartData?.fitPreferencesEnabled || false;
              const stitchingNotesEnabled = displayChartData?.stitchingNotesEnabled || false;
              const fitPreferences = displayChartData?.fitPreferences || {
                slim: { label: "Slim Fit", ease: 0 },
                regular: { label: "Regular Fit", ease: 0.5 },
                loose: { label: "Loose Fit", ease: 1.0 },
              };
              
              const handleFieldChange = (fieldId, value) => {
                setFieldValues(prev => ({ ...prev, [fieldId]: value }));
              };
              
              const handleUnitToggle = (fieldId, newUnit) => {
                setFieldUnits(prev => ({ ...prev, [fieldId]: newUnit }));
              };
              
              const showFieldGuide = (field) => {
                setSelectedField(field);
                setGuideModalOpen(true);
              };
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                  {/* Header with icon and title */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <StraightenIcon sx={{ fontSize: '24px', color: '#202223' }} />
                    <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>
                      Enter Your Measurements
                    </Typography>
                  </Box>
                  
                  {enabledFields.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>
                        No measurement fields available for this template.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
                      {enabledFields
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((field) => {
                          const fieldId = field.id;
                          const fieldValue = fieldValues[fieldId] || '';
                          const fieldUnit = fieldUnits[fieldId] || (field.unit || 'in');
                          const placeholder = `Enter ${(field.name || field.id).toLowerCase()}`;
                          
                          return (
                            <Box key={fieldId} sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              {/* Label with info icon */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '150px', flexShrink: 0 }}>
                                <Tooltip 
                                  title={field.description || field.instructions || 'Click for measurement guide'}
                                  arrow
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => showFieldGuide(field)}
                                    sx={{
                                      padding: '4px',
                                      color: '#6d7175',
                                      '&:hover': {
                                        backgroundColor: '#f5f5f5',
                                        color: '#202223',
                                      },
                                    }}
                                  >
                                    <InfoIcon sx={{ fontSize: '18px' }} />
                                  </IconButton>
                                </Tooltip>
                                <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#202223' }}>
                                  {field.name || field.id}
                                  {field.required && (
                                    <span style={{ color: '#d72c0d', marginLeft: '4px' }}>*</span>
                                  )}
                                </Typography>
                              </Box>
                              
                              {/* Input field */}
                              <TextField
                                fullWidth
                                placeholder={placeholder}
                                value={fieldValue}
                                onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                                required={field.required}
                                type="number"
                                inputProps={{
                                  min: field.min,
                                  max: field.max,
                                  step: '0.1',
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '4px',
                                    backgroundColor: '#ffffff',
                                    '& fieldset': {
                                      borderColor: '#e1e3e5',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#c9cccf',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#202223',
                                      borderWidth: '1px',
                                    },
                                  },
                                  '& .MuiInputBase-input': {
                                    fontSize: '14px',
                                    padding: '12px 14px',
                                  },
                                }}
                              />
                            </Box>
                          );
                        })}

                      {/* Fit Preference */}
                      {fitPreferencesEnabled && (
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
                            value={fitPreference}
                            onChange={(e) => setFitPreference(e.target.value)}
                            displayEmpty
                            sx={{
                              bgcolor: "#ffffff",
                              fontSize: "14px",
                              height: "40px",
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#e1e3e5",
                                borderWidth: "1px",
                              },
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#c9cccf",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#202223",
                                borderWidth: "1px",
                              },
                              "& .MuiSelect-select": {
                                py: 1.25,
                                fontSize: "14px",
                                color: fitPreference ? "#202223" : "#9ca3af",
                              },
                            }}
                          >
                            <MenuItem value="" sx={{ fontSize: "14px", color: "#9ca3af" }}>
                              <em>Select fit preference</em>
                            </MenuItem>
                            {Object.entries(fitPreferences).map(([key, fit]) => (
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
                      {stitchingNotesEnabled && (
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
                            value={stitchingNotes}
                            onChange={(e) => setStitchingNotes(e.target.value)}
                            fullWidth
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                bgcolor: "#ffffff",
                                fontSize: "14px",
                                "& fieldset": {
                                  borderColor: "#e1e3e5",
                                  borderWidth: "1px",
                                },
                                "&:hover fieldset": {
                                  borderColor: "#c9cccf",
                                },
                                "&.Mui-focused fieldset": {
                                  borderColor: "#202223",
                                  borderWidth: "1px",
                                },
                                "& textarea": {
                                  fontSize: "14px",
                                  color: "#202223",
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
                </Box>
              );
            }
          })()}
        </Box>
      </DialogContent>
      
      {/* Measurement Guide Modal */}
      <Dialog
        open={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            margin: { xs: '16px', sm: '32px' },
            maxHeight: { xs: 'calc(100vh - 64px)', sm: 'calc(100vh - 28px)' },
          },
        }}
      >
        {selectedField && (
          <>
            <DialogTitle
              sx={{
                p: 2,
                borderBottom: '1px solid #e1e3e5',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, color: '#202223', mb: 0.5 }}>
                    How to Measure: {selectedField.name || selectedField.id}
                  </Typography>
                  <Typography sx={{ fontSize: '13px', color: '#6d7175', fontWeight: 400 }}>
                    Follow these instructions to get accurate measurements
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setGuideModalOpen(false)}
                  size="small"
                  sx={{
                    padding: '4px',
                    color: '#6d7175',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: '20px' }} />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{  overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3, paddingTop: 2}}>
                {/* Guide Image */}
                <Box
                  sx={{
                    width: '250px',
                    minHeight: '250px',
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    border: '2px dashed #e1e3e5',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                  }}
                >
                  {selectedField.guideImageUrl || selectedField.guideImage ? (
                    <img
                      src={selectedField.guideImageUrl || selectedField.guideImage}
                      alt={`Guide for ${selectedField.name || selectedField.id}`}
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '4px',
                        maxHeight: '400px',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <>
                      <ImageIcon sx={{ fontSize: '48px', color: '#c9cccf' }} />
                      <Typography sx={{ fontSize: '14px', color: '#8c9196',width: '100%', textAlign: 'center' }}>
                        No guide image available
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Measurement Instructions */}
                <Box
                  sx={{
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    p: 2.5,
                    border: '1px solid #e1e3e5',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <DescriptionIcon sx={{ fontSize: '18px', color: '#202223' }} />
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#202223' }}>
                      Measurement Instructions
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '14px', color: '#6d7175', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {selectedField.customInstructions || selectedField.description || selectedField.instructions || 'No specific instructions available for this measurement.'}
                  </Typography>
                </Box>

                {/* Measurement Details */}
                <Box
                  sx={{
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    p: 2,
                    border: '1px solid #e1e3e5',
                    width: '100%',
                  }}
                >
                  <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#202223', mb: 1.5 }}>
                    Measurement Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>Unit</Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#202223' }}>
                        {selectedField.unit === 'cm' ? 'Centimeters' : 'Inches'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>Required</Typography>
                      <Typography
                        sx={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: selectedField.required ? '#d72c0d' : '#6d7175',
                        }}
                      >
                        {selectedField.required ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                    {(selectedField.min !== undefined || selectedField.max !== undefined) && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>Range</Typography>
                        <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#202223' }}>
                          {selectedField.min || 0} - {selectedField.max || '∞'} {selectedField.unit || 'in'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </DialogContent>
         
          </>
        )}
      </Dialog>
    </Dialog>
  );
};

export default SizeChart;
