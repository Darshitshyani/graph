import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
  Tooltip,
  Tabs,
  Tab,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import StraightenIcon from '@mui/icons-material/Straighten';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';

const TemplateViewModal = ({ open, onClose, template }) => {
  const [activeTab, setActiveTab] = useState(0); // 0 = Details, 1 = How to Measure
  const [unit, setUnit] = useState('in');
  const [fieldValues, setFieldValues] = useState({});
  const [fitPreference, setFitPreference] = useState('');
  const [stitchingNotes, setStitchingNotes] = useState('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setFieldValues({});
      setFitPreference('');
      setStitchingNotes('');
      setGuideModalOpen(false);
      setSelectedField(null);
    }
  }, [open]);

  // Handle null template case - but after hooks
  if (!template) {
    return null;
  }

  const chartData = typeof template.chartData === 'string' 
    ? JSON.parse(template.chartData || '{}') 
    : (template.chartData || {});
  
  const isMeasurementTemplate = chartData?.isMeasurementTemplate === true;
  const sizeData = chartData.sizeData || [];
  const columns = chartData.columns || [];
  const measurementFields = chartData.measurementFields || [];
  const fitPreferencesEnabled = chartData?.fitPreferencesEnabled || false;
  const stitchingNotesEnabled = chartData?.stitchingNotesEnabled || false;
  const fitPreferences = chartData?.fitPreferences || {
    slim: { label: "Slim Fit", ease: 0 },
    regular: { label: "Regular Fit", ease: 0.5 },
    loose: { label: "Loose Fit", ease: 1.0 },
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setUnit(newUnit);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const showFieldGuide = (field) => {
    setSelectedField(field);
    setGuideModalOpen(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            margin: { xs: '16px', sm: '32px' },
            width: { xs: 'calc(100% - 32px)', sm: '600px' },
            maxWidth: { xs: 'calc(100% - 32px)', sm: '800px' },
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
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid #e1e3e5',
            bgcolor: '#ffffff',
            flexShrink: 0,
          }}>
            <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>
              {template.name || 'Size Chart'}
            </Typography>
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

          {/* Content Tabs - Details and How to Measure */}
          <Box sx={{ borderBottom: '1px solid #e1e3e5', flexShrink: 0, backgroundColor: '#ffffff' }}>
            <Tabs 
              value={activeTab}
              onChange={handleTabChange}
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
            {activeTab === 0 ? (
              // Details Tab
              isMeasurementTemplate ? (
                // Custom Measurement Template
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <StraightenIcon sx={{ fontSize: '24px', color: '#202223' }} />
                    <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>
                      Enter Your Measurements
                    </Typography>
                  </Box>
                  
                  {measurementFields.filter(f => f.enabled).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>
                        No measurement fields available for this template.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%' }}>
                      {measurementFields
                        .filter(field => field.enabled)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((field) => {
                          const fieldId = field.id;
                          const fieldValue = fieldValues[fieldId] || '';
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
              ) : (
                // Table Template
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                  <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, mb: 2, color: '#202223' }}>
                    {template.name || 'Size Chart'}
                  </Typography>
                  {sizeData.length > 0 ? (
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
                            {columns.map((column) => (
                              <TableCell key={column.id} sx={{ fontWeight: 600, fontSize: '12px', color: '#202223', borderRight: '1px solid #e1e3e5', minWidth: '100px' }}>
                                {column.label}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sizeData.map((row, index) => (
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
                              {columns.map((column) => (
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
              )
            ) : (
              // How to Measure Tab
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                {isMeasurementTemplate ? (
                  // Custom Measurement Template - How to Measure
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {measurementFields
                      .filter(field => field.enabled)
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
                ) : (
                  // Table Template - How to Measure
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

                    {/* Measurement Guide Image */}
                    {chartData.measurementFile && (
                      <Box
                        sx={{
                          width: '100%',
                          maxHeight: '400px',
                          overflow: 'hidden',
                        
                          mb: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                         
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '250px',
                            height: '100%',
                            overflow: 'hidden',
                            position: 'relative',
                            borderRadius: '8px',
                            border: '1px solid #e1e3e5',
                         
                            
                          }}
                        >
                        <Typography
                          sx={{
                            fontSize: '14px',
                            color: '#6d7175',
                            fontStyle: 'italic',
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        >
                          <img src={chartData.measurementFile} alt="Measurement guide" />
                        </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Measurement Instructions */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
                      {template.description && template.description.trim() ? (
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
                          dangerouslySetInnerHTML={{ __html: template.description }}
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
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

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
            <DialogContent sx={{ overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
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
                        maxHeight: '150px',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <>
                      <ImageIcon sx={{ fontSize: '48px', color: '#c9cccf' }} />
                      <Typography sx={{ fontSize: '14px', width: '100%', textAlign: 'center', color: '#8c9196' }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DescriptionIcon sx={{ fontSize: '18px', color: '#202223' }} />
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#202223' }}>
                      Measurement Instructions
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '14px', color: '#6d7175', lineHeight: 1.7 }}>
                    {selectedField.description || selectedField.instructions || 'No specific instructions available for this measurement.'}
                  </Typography>
                </Box>

                {/* Measurement Details */}
                <Box
                  sx={{
                    width: '100%',
                    backgroundColor: '#f6f6f7',
                    borderRadius: '8px',
                    p: 2,
                    border: '1px solid #e1e3e5',
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
    </>
  );
};

export default TemplateViewModal;

