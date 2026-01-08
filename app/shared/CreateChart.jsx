import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Backdrop,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
// Icons and guide images stored in AWS S3 - using HTTPS URLs as strings (not imported as modules)
const ICONS_BASE_URL = "https://sizechartimages.s3.ap-south-1.amazonaws.com/images/icons";
const GUIDE_IMAGES_BASE_URL = "https://sizechartimages.s3.ap-south-1.amazonaws.com/images/guideimages";
const FEMALE_GUIDE_IMAGES_BASE_URL = "https://sizechartimages.s3.ap-south-1.amazonaws.com/images/guideimages/female";

// Icon URLs as constants
const Malepents = `${ICONS_BASE_URL}/male+pents.png`;
const Maleshirts = `${ICONS_BASE_URL}/male+shirts.png`;
const Maleshoes = `${ICONS_BASE_URL}/male+shoes.png`;
const MaleUnderWare = `${ICONS_BASE_URL}/male+underwear.png`;
const femalenderWare = `${ICONS_BASE_URL}/female+underwear.png`;
const femalejeans = `${ICONS_BASE_URL}/female+jeans.png`;
const femalekurti = `${ICONS_BASE_URL}/female+kurti.png`;
const femaleshoes = `${ICONS_BASE_URL}/female+shoes.png`;
const femaleskit = `${ICONS_BASE_URL}/female+skits.png`;
const femaletshirt = `${ICONS_BASE_URL}/female+t+shirt.png`;
const femalesuit = `${ICONS_BASE_URL}/female+suit.png`;
const saree = `${ICONS_BASE_URL}/sareee.png`;
const customIcon = `${ICONS_BASE_URL}/male+custom.png`;
const femaledress = `${ICONS_BASE_URL}/+female+dress.png`;
const bra = `${ICONS_BASE_URL}/bra.png`;
const male = `${ICONS_BASE_URL}/male.png`;
const female = `${ICONS_BASE_URL}/female.png`;
const tshirt = `${ICONS_BASE_URL}/t+shirt.png`;
const kurta = `${ICONS_BASE_URL}/kurta-man.png`;
const jeans = `${ICONS_BASE_URL}/jeans.png`;
const suit = `${ICONS_BASE_URL}/suit.png`;


//female guide images
const brafemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/brafemale.png`;
const dressfemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/dress.png`;
const jeansfemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/pentsfemlae.png`;
const kurtafemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/kurtifemale.png`;
const underwarefemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/underwarefemale.png`;
const shoesfemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/heelfemale.png`;
const skitfemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/skit.png`;
const suitfemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/suit.png`;
const tshirtfemale = `${FEMALE_GUIDE_IMAGES_BASE_URL}/tshirtfemale.png`;



const CreateChart = ({ open, onClose, onSave, initialData = null }) => {
  const [step, setStep] = useState(1);
  const [selectedGender, setSelectedGender] = useState('male');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [chartName, setChartName] = useState('');
  const [sizeData, setSizeData] = useState([
    { size: 'xs', brandSize: '', waist: '', inseam: '' },
    { size: 'S', brandSize: '', waist: '', inseam: '' },
    { size: 'M', brandSize: '', waist: '', inseam: '' },
    { size: 'L', brandSize: '', waist: '', inseam: '' },
    { size: 'XL', brandSize: '', waist: '', inseam: '' },
    { size: 'XXL', brandSize: '', waist: '', inseam: '' },
    { size: '2XL', brandSize: '', waist: '', inseam: '' },
  ]);
  const [columns, setColumns] = useState([
    { id: 'brandSize', label: 'Brand Size', isFixed: false },
    { id: 'waist', label: 'Waist', isFixed: false },
    { id: 'inseam', label: 'Inseam', isFixed: false },
  ]);
  const [measurementFile, setMeasurementFile] = useState(null); // File object when user uploads new file
  const [measurementFilePreview, setMeasurementFilePreview] = useState(null); // Preview URL (FileReader data URL or S3 URL)
  const [originalMeasurementFileUrl, setOriginalMeasurementFileUrl] = useState(null); // Store original URL when editing
  const [description, setDescription] = useState('');
  const descriptionEditorRef = useRef(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [unit, setUnit] = useState('in');
  
  // Load initial data when editing
  useEffect(() => {
    // Always reset saving state when modal opens
    if (open) {
      setIsSaving(false);
    }
    
    if (open && initialData) {
      // Parse chartData if it's a string
      let chartData = {};
      try {
        chartData = typeof initialData.chartData === 'string' 
          ? JSON.parse(initialData.chartData || '{}') 
          : initialData.chartData || {};
      } catch (e) {
        console.error('Error parsing chartData:', e);
        chartData = {};
      }
      
      // Set form values from template
      setChartName(initialData.name || '');
      setSelectedGender(initialData.gender || 'male');
      setSelectedCategory(initialData.category || null);
      setDescription(initialData.description || '');
      
      // Set size data if available
      if (chartData.sizeData && Array.isArray(chartData.sizeData)) {
        setSizeData(chartData.sizeData);
      }
      
      // Set columns if available
      if (chartData.columns && Array.isArray(chartData.columns)) {
        setColumns(chartData.columns);
      }
      
      // Set measurement file preview from chartData (S3 URL)
      if (chartData.measurementFile) {
        // measurementFile contains the S3 HTTPS URL
        const existingUrl = chartData.measurementFile;
        setMeasurementFilePreview(existingUrl);
        setOriginalMeasurementFileUrl(existingUrl); // Store original URL for later use
        setMeasurementFile(null); // Clear any File object
      }
      
      // Reset step to 1 when opening
      setStep(1);
    } else if (open && !initialData) {
      // Reset form when creating new (not editing)
      setChartName('');
      setSelectedGender('male');
      setSelectedCategory(null);
      setDescription('');
      setStep(1);
      setSizeData([
        { size: 'xs', brandSize: '', waist: '', inseam: '' },
        { size: 'S', brandSize: '', waist: '', inseam: '' },
        { size: 'M', brandSize: '', waist: '', inseam: '' },
        { size: 'L', brandSize: '', waist: '', inseam: '' },
        { size: 'XL', brandSize: '', waist: '', inseam: '' },
        { size: 'XXL', brandSize: '', waist: '', inseam: '' },
        { size: '2XL', brandSize: '', waist: '', inseam: '' },
      ]);
      setColumns([
        { id: 'brandSize', label: 'Brand Size', isFixed: false },
        { id: 'waist', label: 'Waist', isFixed: false },
        { id: 'inseam', label: 'Inseam', isFixed: false },
      ]);
      setMeasurementFile(null);
      setMeasurementFilePreview(null);
      setOriginalMeasurementFileUrl(null); // Clear original URL when creating new
    }
  }, [open, initialData]);
  
  // Sync editor content with description state
  useEffect(() => {
    if (descriptionEditorRef.current && descriptionEditorRef.current.innerHTML !== description) {
      descriptionEditorRef.current.innerHTML = description;
    }
  }, [description, step]); // Also sync when step changes

  // Reset tab and unit when entering step 3
  useEffect(() => {
    if (step === 3) {
      setActiveTab(0);
      setUnit('in');
    }
  }, [step]);


  const categories = { 
    male: [ 
      { id: "pants", label: "Pants", gender: "male", icon: Malepents, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, { label: "Inseam (in)", key: "inseam" }, ], rows: [ { size: 28, waist: 28, hip: 35, inseam: 33 }, { size: 30, waist: 30, hip: 37, inseam: 33 }, { size: 32, waist: 32, hip: 39, inseam: 33 }, { size: 34, waist: 34, hip: 41, inseam: 33 }, { size: 36, waist: 36, hip: 43, inseam: 33 }, { size: 38, waist: 38, hip: 45, inseam: 33 }, ], }, howToMeasure: [ { title: "Waist", description: "Wrap the tape around the narrowest part of your waist. Keep it parallel to the floor and snug but not tight." }, { title: "Hip", description: "Measure around the widest part of your hips and seat, keeping the tape horizontal." }, { title: "Inseam", description: "Measure from the crotch seam down to the bottom of the leg. Stand straight while taking this measurement." } ] }, 
      { id: "shirts", label: "Shirts", gender: "male", icon: Maleshirts, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Chest (in)", key: "chest" }, { label: "Shoulder (in)", key: "shoulder" }, { label: "Length (in)", key: "length" }, ], rows: [ { size: "S", chest: 38, shoulder: 17, length: 27 }, { size: "M", chest: 40, shoulder: 17.5, length: 28 }, { size: "L", chest: 42, shoulder: 18, length: 29 }, { size: "XL", chest: 44, shoulder: 18.5, length: 30 }, { size: "XXL", chest: 46, shoulder: 19, length: 31 }, ], }, howToMeasure: [ { title: "Chest", description: "Measure around the fullest part of your chest, keeping the tape horizontal and relaxed." }, { title: "Shoulder", description: "Measure from the tip of one shoulder bone to the other across the back." }, { title: "Length", description: "Measure from the highest shoulder point down to where you want the shirt to end." } ] }, 
      { id: "tshirt", label: "T-Shirt", gender: "male", icon: tshirt, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Chest (in)", key: "chest" }, { label: "Length (in)", key: "length" }, ], rows: [ { size: "S", chest: 38, length: 27 }, { size: "M", chest: 40, length: 28 }, { size: "L", chest: 42, length: 29 }, { size: "XL", chest: 44, length: 30 }, { size: "XXL", chest: 46, length: 31 }, ], }, howToMeasure: [ { title: "Chest", description: "Measure around the fullest part of your chest, keeping the tape horizontal and relaxed." }, { title: "Length", description: "Measure from the highest shoulder point down to where you want the t-shirt to end." } ] }, 
      { id: "jeans", label: "Jeans", gender: "male", icon: jeans, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, { label: "Inseam (in)", key: "inseam" }, ], rows: [ { size: 28, waist: 28, hip: 35, inseam: 33 }, { size: 30, waist: 30, hip: 37, inseam: 33 }, { size: 32, waist: 32, hip: 39, inseam: 33 }, { size: 34, waist: 34, hip: 41, inseam: 33 }, { size: 36, waist: 36, hip: 43, inseam: 33 }, { size: 38, waist: 38, hip: 45, inseam: 33 }, ], }, howToMeasure: [ { title: "Waist", description: "Wrap the tape around the narrowest part of your waist. Keep it parallel to the floor and snug but not tight." }, { title: "Hip", description: "Measure around the widest part of your hips and seat, keeping the tape horizontal." }, { title: "Inseam", description: "Measure from the crotch seam down to the bottom of the leg. Stand straight while taking this measurement." } ] }, 
      { id: "kurta", label: "Kurta", gender: "male", icon: kurta, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Chest (in)", key: "chest" }, { label: "Shoulder (in)", key: "shoulder" }, { label: "Length (in)", key: "length" }, ], rows: [ { size: "S", chest: 38, shoulder: 17, length: 40 }, { size: "M", chest: 40, shoulder: 17.5, length: 41 }, { size: "L", chest: 42, shoulder: 18, length: 42 }, { size: "XL", chest: 44, shoulder: 18.5, length: 43 }, { size: "XXL", chest: 46, shoulder: 19, length: 44 }, ], }, howToMeasure: [ { title: "Chest", description: "Measure around the fullest part of your chest, keeping the tape horizontal and relaxed." }, { title: "Shoulder", description: "Measure from the tip of one shoulder bone to the other across the back." }, { title: "Length", description: "Measure from the highest shoulder point down to where you want the kurta to end." } ] }, 
      { id: "suit", label: "Suit", gender: "male", icon: suit, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Chest (in)", key: "chest" }, { label: "Waist (in)", key: "waist" }, { label: "Shoulder (in)", key: "shoulder" }, { label: "Length (in)", key: "length" }, ], rows: [ { size: "S", chest: 38, waist: 30, shoulder: 17, length: 40 }, { size: "M", chest: 40, waist: 32, shoulder: 17.5, length: 41 }, { size: "L", chest: 42, waist: 34, shoulder: 18, length: 42 }, { size: "XL", chest: 44, waist: 36, shoulder: 18.5, length: 43 }, { size: "XXL", chest: 46, waist: 38, shoulder: 19, length: 44 }, ], }, howToMeasure: [ { title: "Chest", description: "Measure around the fullest part of your chest, keeping the tape horizontal and relaxed." }, { title: "Waist", description: "Wrap the tape around the narrowest part of your waist. Keep it parallel to the floor and snug but not tight." }, { title: "Shoulder", description: "Measure from the tip of one shoulder bone to the other across the back." }, { title: "Length", description: "Measure from the highest shoulder point down to where you want the suit to end." } ] }, 
      { id: "underwear", label: "Underwear", gender: "male", icon: MaleUnderWare, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Waist (in)", key: "waist" }, ], rows: [ { size: "S", waist: 28 }, { size: "M", waist: 30 }, { size: "L", waist: 32 }, { size: "XL", waist: 34 }, { size: "XXL", waist: 36 }, ], }, howToMeasure: [ { title: "Waist", description: "Wrap the tape around the narrowest part of your waist. Keep it parallel to the floor and snug but not tight." } ] }, 
      { id: "shoes", label: "Shoes", gender: "male", icon: Maleshoes, sizeChart: { columns: [ { label: "Size (India)", key: "size" }, { label: "Foot Length (cm)", key: "length" }, ], rows: [ { size: 6, length: 24 }, { size: 7, length: 25 }, { size: 8, length: 26 }, { size: 9, length: 27 }, { size: 10, length: 28 }, { size: 11, length: 29 }, ], }, howToMeasure: [ { title: "Foot Length", description: "Measure from the tip of the longest toe to the back of the heel. Stand straight while taking this measurement." } ] }, 
      { id: "custom", label: "Custom", gender: "male", icon: customIcon, sizeChart: null, }, 
    ], female: [ { id: "top", label: "Top / T-Shirt", gender: "female", icon: femaletshirt, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Chest (in)", key: "chest" }, ], rows: [ { size: "S", chest: 38 }, { size: "M", chest: 40 }, { size: "L", chest: 42 }, { size: "XL", chest: 44 }, { size: "XXL", chest: 46 }, ], }, howToMeasure: [ { title: "Chest", description: "Measure around the fullest part of your chest, keeping the tape horizontal and relaxed." } ] }, { id: "dress", label: "Dress", gender: "female", icon: femaledress, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Bust (in)", key: "bust" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, ], rows: [ { size: "S", bust: 34, waist: 27, hip: 36 }, { size: "M", bust: 36, waist: 29, hip: 38 }, { size: "L", bust: 38, waist: 31, hip: 40 }, { size: "XL", bust: 40, waist: 33, hip: 42 }, { size: "XXL", bust: 42, waist: 35, hip: 44 }, ], howToMeasure: [ { title: "Bust", description: "Measure around the fullest part of your bust, keeping the tape horizontal and relaxed." }, { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." }, { title: "Hip", description: "Measure around the widest part of your hips and seat, keeping the tape horizontal." } ] }, }, { id: "jeans", label: "Jeans", gender: "female", icon: femalejeans, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, { label: "Inseam (in)", key: "inseam" }, ], rows: [ { size: 28, waist: 28, hip: 35, inseam: 32 }, { size: 30, waist: 30, hip: 37, inseam: 32 }, { size: 32, waist: 32, hip: 39, inseam: 32 }, { size: 34, waist: 34, hip: 41, inseam: 32 }, { size: 36, waist: 36, hip: 43, inseam: 32 }, { size: 38, waist: 38, hip: 45, inseam: 32 }, ], }, howToMeasure: [ { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." }, { title: "Hip", description: "Measure around the widest part of your hips and seat, keeping the tape horizontal." }, { title: "Inseam", description: "Measure from the crotch seam down to the bottom of the leg. Stand straight while taking this measurement." } ] }, { id: "skirt", label: "Skirt", gender: "female", icon: femaleskit, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, ], rows: [ { size: "S", waist: 28, hip: 36 }, { size: "M", waist: 30, hip: 38 }, { size: "L", waist: 32, hip: 40 }, { size: "XL", waist: 34, hip: 42 }, { size: "XXL", waist: 36, hip: 44 }, ], }, howToMeasure: [ { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." }, { title: "Hip", description: "Measure around the widest part of your hips and seat, keeping the tape horizontal." } ] }, { id: "saree", label: "Saree", gender: "female", icon: saree, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Bust (in)", key: "bust" }, { label: "Waist (in)", key: "waist" }, ], rows: [ { size: "S", bust: 34, waist: 28 }, { size: "M", bust: 36, waist: 30 }, { size: "L", bust: 38, waist: 32 }, { size: "XL", bust: 40, waist: 34 }, { size: "XXL", bust: 42, waist: 36 }, ], }, howToMeasure: [ { title: "Bust", description: "Measure around the fullest part of your bust, keeping the tape horizontal and relaxed." }, { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." } ] }, { id: "kurti", label: "Kurti", gender: "female", icon: femalekurti, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Bust (in)", key: "bust" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, ], rows: [ { size: "S", bust: 34, waist: 28, hip: 36 }, { size: "M", bust: 36, waist: 30, hip: 38 }, { size: "L", bust: 38, waist: 32, hip: 40 }, { size: "XL", bust: 40, waist: 34, hip: 42 }, { size: "XXL", bust: 42, waist: 36, hip: 44 }, ], }, howToMeasure: [ { title: "Bust", description: "Measure around the fullest part of your bust, keeping the tape horizontal and relaxed." }, { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." } ] }, { id: "salwarSuit", label: "Salwar Suit", gender: "female", icon: femalesuit, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Bust (in)", key: "bust" }, { label: "Waist (in)", key: "waist" }, { label: "Hip (in)", key: "hip" }, { label: "Top Length (in)", key: "topLength" }, ], rows: [ { size: "S", bust: 34, waist: 28, hip: 36, topLength: 41 }, { size: "M", bust: 36, waist: 30, hip: 38, topLength: 42 }, { size: "L", bust: 38, waist: 32, hip: 40, topLength: 43 }, { size: "XL", bust: 40, waist: 34, hip: 42, topLength: 44 }, { size: "XXL", bust: 42, waist: 36, hip: 44, topLength: 45 }, ], }, howToMeasure: [ { title: "Bust", description: "Measure around the fullest part of your bust, keeping the tape horizontal and relaxed." }, { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." } ] }, { id: "bra", label: "Bra", gender: "female", icon: bra, sizeChart: { columns: [ { label: "Band Size", key: "band" }, { label: "Cup Size", key: "cup" }, { label: "Bust (in)", key: "bust" }, ], rows: [ { band: 32, cup: "B", bust: 34 }, { band: 34, cup: "B", bust: 36 }, { band: 36, cup: "C", bust: 38 }, { band: 38, cup: "C", bust: 40 }, ], }, howToMeasure: [ { title: "Band Size", description: "Measure around the fullest part of your bust, keeping the tape horizontal and relaxed." }, { title: "Cup Size", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." } ] }, { id: "underwear", label: "Underwear", gender: "female", icon: femalenderWare, sizeChart: { columns: [ { label: "Size", key: "size" }, { label: "Waist (in)", key: "waist" }, ], rows: [ { size: "S", waist: 28 }, { size: "M", waist: 30 }, { size: "L", waist: 32 }, { size: "XL", waist: 34 }, { size: "XXL", waist: 36 }, ], }, howToMeasure: [ { title: "Waist", description: "Measure around the narrowest part of your waist, keeping the tape horizontal and relaxed." } ] }, { id: "shoes", label: "Shoes", gender: "female", icon: femaleshoes, sizeChart: { columns: [ { label: "Size (India)", key: "size" }, { label: "Foot Length (cm)", key: "length" }, ], rows: [ { size: 4, length: 22 }, { size: 5, length: 23 }, { size: 6, length: 24 }, { size: 7, length: 25 }, { size: 8, length: 26 }, ], }, howToMeasure: [ { title: "Foot Length", description: "Measure from the tip of the longest toe to the back of the heel. Stand straight while taking this measurement." } ] }, { id: "custom", label: "Custom", gender: "female", icon: customIcon, sizeChart: null, },     ], };

  // Default guide images mapping for male categories - using S3 HTTPS URLs
  const maleGuideImages = {
    pants: `${GUIDE_IMAGES_BASE_URL}/pentsSiz.jpeg`,
    shirts: `${GUIDE_IMAGES_BASE_URL}/shirtSiz.jpeg`,
    tshirt: `${GUIDE_IMAGES_BASE_URL}/tshirtSIz.jpeg`,
    jeans: `${GUIDE_IMAGES_BASE_URL}/jensSiz.jpeg`,
    kurta: `${GUIDE_IMAGES_BASE_URL}/surtaSiz.jpeg`,
    suit: `${GUIDE_IMAGES_BASE_URL}/suitSiz.jpeg`,
    underwear: `${GUIDE_IMAGES_BASE_URL}/underwareSiz.jpeg`,
    shoes: `${GUIDE_IMAGES_BASE_URL}/shoesSiz.jpeg`,
  };

  // Default guide images mapping for female categories - using S3 HTTPS URLs
  const femaleGuideImages = {
    top: tshirtfemale,
    dress: dressfemale,
    jeans: jeansfemale,
    skirt: skitfemale,
    saree: null, // No guide image for saree
    kurti: kurtafemale,
    salwarSuit: suitfemale,
    bra: brafemale,
    underwear: underwarefemale,
    shoes: shoesfemale,
  };

  // Function to convert numeric sizes to letter sizes
  const convertSizeToLetter = (size) => {
    // If already a string/letter size, return as is
    if (typeof size === 'string') {
      return size;
    }
    
    // Convert numeric sizes to letter sizes
    const sizeMap = {
      24: 'XS',
      26: 'XS',
      28: 'S',
      30: 'M',
      32: 'L',
      34: 'XL',
      36: 'XXL',
      38: '2XL',
      40: '3XL',
      42: '4XL',
    };
    
    // For shoe sizes, keep as numbers
    if (size >= 4 && size <= 15) {
      return size.toString();
    }
    
    return sizeMap[size] || size.toString();
  };

  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    setSelectedCategory(null); // Reset category when gender changes
    // Reset table data when gender changes
    setColumns([]);
    setSizeData([{ size: '' }]);
    // Clear measurement file preview when gender changes
    setMeasurementFilePreview(null);
    setMeasurementFile(null);
    setOriginalMeasurementFileUrl(null);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    
    // Find the selected category
    const category = categories[selectedGender]?.find(cat => cat.id === categoryId);
    
    if (category && category.sizeChart) {
      // Populate table with category's sizeChart data
      const chartColumns = category.sizeChart.columns.filter(col => col.key !== 'size'); // Exclude size column
      const mappedColumns = chartColumns.map(col => ({
        id: col.key,
        label: col.label,
        isFixed: false,
      }));
      
      const mappedRows = category.sizeChart.rows.map(row => {
        // Convert numeric size to letter size
        const convertedSize = convertSizeToLetter(row.size);
        const rowData = { size: convertedSize };
        chartColumns.forEach(col => {
          rowData[col.key] = row[col.key] || '';
        });
        return rowData;
      });
      
      setColumns(mappedColumns);
      setSizeData(mappedRows);
      
      // Populate description with howToMeasure data formatted with bold headings
      if (category.howToMeasure && category.howToMeasure.length > 0) {
        const formattedDescription = category.howToMeasure
          .map(item => `<strong>${item.title}:</strong> ${item.description}`)
          .join('<br><br>');
        setDescription(formattedDescription);
      } else {
        setDescription('');
      }

      // Set default guide image for categories when creating new template (not editing)
      if (selectedGender === 'male' && maleGuideImages[categoryId] && !measurementFile && !initialData) {
        setMeasurementFilePreview(maleGuideImages[categoryId]);
      } else if (selectedGender === 'female' && femaleGuideImages[categoryId] && !measurementFile && !initialData) {
        setMeasurementFilePreview(femaleGuideImages[categoryId]);
      }
    } else {
      // Custom category or no sizeChart - empty table
      setColumns([]);
      setSizeData([{ size: '' }]);
      setDescription('');
        
      // Set default guide image for categories when creating new template (not editing)
      if (selectedGender === 'male' && maleGuideImages[categoryId] && !measurementFile && !initialData) {
        setMeasurementFilePreview(maleGuideImages[categoryId]);
      } else if (selectedGender === 'female' && femaleGuideImages[categoryId] && !measurementFile && !initialData) {
        setMeasurementFilePreview(femaleGuideImages[categoryId]);
      }
    }
    
    // Automatically move to step 2 when category is selected
    setStep(2);
  };

  const handleSizeDataChange = (index, field, value) => {
    const newData = [...sizeData];
    newData[index][field] = value;
    setSizeData(newData);
  };

  const handleAddRow = () => {
    const newRow = { size: '' };
    // Add all column fields to the new row
    columns.forEach(col => {
      newRow[col.id] = '';
    });
    setSizeData([...sizeData, newRow]);
  };

  const handleDeleteRow = (index) => {
    setSizeData(sizeData.filter((_, i) => i !== index));
  };

  const handleAddColumn = () => {
    const newColumnId = `column_${Date.now()}`;
    const newColumn = {
      id: newColumnId,
      label: `Column ${columns.length + 1}`,
      isFixed: false,
    };
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    
    // Add the new column field to all existing rows
    setSizeData(sizeData.map(row => ({
      ...row,
      [newColumnId]: '',
    })));
  };

  const handleColumnLabelChange = (columnId, newLabel) => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, label: newLabel } : col
    ));
  };

  const handleRemoveColumn = (columnId) => {
    const updatedColumns = columns.filter(col => col.id !== columnId);
    setColumns(updatedColumns);
    setSizeData(sizeData.map(row => {
      const newRow = { ...row };
      delete newRow[columnId];
      return newRow;
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setMeasurementFile(file);
      // Create preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setMeasurementFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedGender && selectedCategory) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSave = async () => {
    // Prepare chart data
    const chartData = {
      gender: selectedGender,
      category: selectedCategory,
      chartName,
      sizeData,
      description,
      columns,
    };
    
    // Determine measurementFile to pass:
    // - If user uploaded a new file (measurementFile is a File object), use it (will be uploaded)
    // - If editing and no new file uploaded, pass the original URL (backend will preserve it)
    // - If creating and measurementFilePreview is a default guide image URL, include it in chartData
    // - Otherwise, don't include measurementFile (user didn't upload anything and no default)
    let fileToSave = null;
    if (measurementFile) {
      // User uploaded a new file - upload it
      fileToSave = measurementFile;
    } else if (originalMeasurementFileUrl && initialData) {
      // Editing mode and no new file - preserve existing URL
      // Pass the URL as a string in chartData (backend will handle it)
      chartData.measurementFile = originalMeasurementFileUrl;
    } else if (!initialData && measurementFilePreview && typeof measurementFilePreview === 'string' && measurementFilePreview.startsWith('https://')) {
      // Creating new template with default guide image URL - include it in chartData
      chartData.measurementFile = measurementFilePreview;
    }
    // If none of the above conditions are true, fileToSave remains null and measurementFile won't be included
    
    // Log for debugging
    console.log('Saving chart:', chartData);
    
    // Show loading state
    setIsSaving(true);
    
    try {
      // Call onSave callback if provided and wait for it to complete
      // Pass chartData and the fileToSave (File object or null)
      if (onSave) {
        await Promise.race([
          onSave(chartData, fileToSave),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Save timeout')), 15000)
          )
        ]);
      }
      
      // Close modal after save completes - force close since we're saving the data
      handleClose(true);
    } catch (error) {
      console.error('Error saving chart:', error);
      // Close modal anyway after error (user can see error in toast/notification)
      handleClose(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleView = () => {
    setStep(3);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setUnit(newUnit);
    }
  };

  // Check if there's unsaved data
  const hasUnsavedData = () => {
    // Check if chart name has been entered
    if (chartName.trim() !== '') return true;
    
    // Check if any size data has been entered
    const hasSizeData = sizeData.some(row => {
      if (row.size && row.size.trim() !== '') return true;
      return columns.some(col => row[col.id] && String(row[col.id]).trim() !== '');
    });
    if (hasSizeData) return true;
    
    // Check if description has been entered
    if (description && description.trim() !== '' && description !== '<br>') return true;
    
    // Check if measurement file has been selected
    if (measurementFile) return true;
    
    // Check if category has been selected (beyond initial state)
    if (selectedCategory) return true;
    
    return false;
  };

  const handleClose = (forceClose = false) => {
    // If force close or no unsaved data, close immediately
    if (forceClose || !hasUnsavedData()) {
      setStep(1);
      setSelectedGender('male');
      setSelectedCategory(null);
      setChartName('');
      setSizeData([
        { size: 'xs', brandSize: '', waist: '', inseam: '' },
        { size: 'S', brandSize: '', waist: '', inseam: '' },
        { size: 'M', brandSize: '', waist: '', inseam: '' },
        { size: 'L', brandSize: '', waist: '', inseam: '' },
        { size: 'XL', brandSize: '', waist: '', inseam: '' },
        { size: 'XXL', brandSize: '', waist: '', inseam: '' },
        { size: '2XL', brandSize: '', waist: '', inseam: '' },
      ]);
      setColumns([
        { id: 'brandSize', label: 'Brand Size', isFixed: false },
        { id: 'waist', label: 'Waist', isFixed: false },
        { id: 'inseam', label: 'Inseam', isFixed: false },
      ]);
      setMeasurementFile(null);
      setMeasurementFilePreview(null);
      setOriginalMeasurementFileUrl(null);
      setDescription('');
      setShowWarningDialog(false);
      setPendingClose(false);
      setIsSaving(false); // Reset saving state when closing
      onClose();
    } else {
      // Show warning dialog
      setShowWarningDialog(true);
      setPendingClose(true);
    }
  };

  const handleConfirmClose = () => {
    handleClose(true);
  };

  const handleCancelClose = () => {
    setShowWarningDialog(false);
    setPendingClose(false);
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={(event, reason) => {
        // Prevent closing during save
        if (isSaving) return;
        // Always check for unsaved data before closing
        handleClose(false);
      }}
      maxWidth="md"
      fullWidth
      disablePortal
      disableEscapeKeyDown={hasUnsavedData() || isSaving}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        onClick: (e) => {
          // Prevent closing during save
          if (isSaving) {
            e.stopPropagation();
            return;
          }
          // Prevent default backdrop click behavior if there's unsaved data
          if (hasUnsavedData()) {
            e.stopPropagation();
            handleClose(false);
          }
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '8px',
          maxHeight: '90vh',
          height: 'auto',
          margin: '20px',
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <DialogContent sx={{ p: 0,overflow: 'hidden', position: 'relative' }}>
        {/* Loading Overlay */}
        {isSaving && (
          <Backdrop
            open={true}
            sx={{
              position: 'absolute',
              zIndex: (theme) => theme.zIndex.modal + 1,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={48} />
              <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#202223' }}>
                Saving chart...
              </Typography>
            </Box>
          </Backdrop>
        )}
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: { xs: 2, sm: 3 },
            borderBottom: '1px solid #e1e3e5',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '18px', sm: '20px' },
              color: '#202223',
            }}
          >
            {step === 1
              ? 'Create Size Chart'
              : step === 2
              ? 'Create Size Chart Details'
              : 'Size Chart Details'}
          </Typography>
          <IconButton
            onClick={() => handleClose(false)}
            sx={{
              padding: '4px',
              '&:hover': {
                backgroundColor: '#f6f6f7',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: 'calc(90vh - 80px)',
          overflow: 'hidden',
        }}>
          {step === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Scrollable Middle Section - Gender + Categories */}
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: { xs: 2, sm: 3 },
                paddingBottom: 0,
              }}>
                {/* Select Gender */}
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: '16px',
                      fontWeight: 600,
                      mb: 2,
                      color: '#202223',
                    }}
                  >
                    Select Gender
                  </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box
                    onClick={() => handleGenderSelect('male')}
                    sx={{
                      width: { xs: 'calc(50% - 8px)', sm: '120px' },
                      height: '110px',
                      border: selectedGender === 'male' 
                        ? '2px solid #3b82f6' 
                        : '2px solid #e1e3e5',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: selectedGender === 'male' ? '#eff6ff' : '#ffffff',
                      transition: 'all 0.2s',
                      padding: '12px',
                      position: 'relative',
                      boxShadow: selectedGender === 'male' ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none',
                      '&:hover': {
                        borderColor: '#3b82f6',
                        backgroundColor: '#eff6ff',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: selectedGender === 'male' ? '#3b82f6' : '#6d7175',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 0.5,
                      }}
                    >
                      <img src={male} alt='Male' style={{ width: '40px', height: '40px' }} />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '13px',
                        fontWeight: selectedGender === 'male' ? 600 : 500,
                        color: selectedGender === 'male' ? '#3b82f6' : '#6d7175',
                        mt: 0.5,
                      }}
                    >
                      Male
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => handleGenderSelect('female')}
                    sx={{
                      width: { xs: 'calc(50% - 8px)', sm: '120px' },
                      height: '110px',
                      border: selectedGender === 'female' 
                        ? '2px solid #3b82f6' 
                        : '2px solid #e1e3e5',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: selectedGender === 'female' ? '#eff6ff' : '#ffffff',
                      transition: 'all 0.2s',
                      padding: '12px',
                      position: 'relative',
                      boxShadow: selectedGender === 'female' ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none',
                      '&:hover': {
                        borderColor: '#3b82f6',
                        backgroundColor: '#eff6ff',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        color: selectedGender === 'female' ? '#3b82f6' : '#6d7175',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 0.5,
                      }}
                    >
                      <img src={female} alt='Female' style={{ width: '40px', height: '40px' }} />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '13px',
                        fontWeight: selectedGender === 'female' ? 600 : 500,
                        color: selectedGender === 'female' ? '#3b82f6' : '#6d7175',
                        mt: 0.5,
                      }}
                    >
                      Female
                    </Typography>
                  </Box>
                </Box>
              </Box>

                {/* Select Category - Only show after gender is selected */}
                {selectedGender && (
                  <Box sx={{ mt: 4 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: '16px',
                        fontWeight: 600,
                        mb: 2,
                        color: '#202223',
                      }}
                    >
                      Select Category
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.2,
                        paddingBottom: 2,
                      }}
                    >
                    {categories[selectedGender]?.map((category) => (
                      <Box
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        sx={{
                          width: '100px',
                          aspectRatio: '1',
                          border:
                            selectedCategory === category.id
                              ? '2px solid #3b82f6'
                              : '2px solid #e1e3e5',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          backgroundColor:
                            selectedCategory === category.id ? '#eff6ff' : '#ffffff',
                          transition: 'all 0.2s',
                          position: 'relative',
                          padding: '6px',
                          boxShadow: selectedCategory === category.id ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            backgroundColor: '#eff6ff',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                          },
                        }}
                      >
                        {category.icon && (
                          <img src={category.icon} alt={category.label} style={{ width: '40px', height: '40px', marginBottom: '2px' }} />
                        )}
                        <Typography
                          sx={{
                            fontSize: '11px',
                            fontWeight: selectedCategory === category.id ? 600 : 500,
                            color:
                              selectedCategory === category.id ? '#3b82f6' : '#374151',
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}
                        >
                          {category.label}
                        </Typography>
                        {selectedCategory === category.id && (
                          <CheckCircleIcon
                            sx={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              color: '#3b82f6',
                              fontSize: '16px',
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                )}
              </Box>

              {/* Step 1 Buttons - Fixed Bottom */}
              {selectedGender && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    padding: { xs: 2, sm: 3 },
                    paddingTop: 2,
                    borderTop: '1px solid #e1e3e5',
                    flexShrink: 0,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<ArrowForwardIcon sx={{ fontSize: '18px' }} />}
                    onClick={handleNext}
                    disabled={!selectedCategory}
                    sx={{
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: '12px 28px',
                      borderRadius: '8px',
                      backgroundColor: selectedCategory ? '#3b82f6' : '#9ca3af',
                      color: '#ffffff',
                      boxShadow: selectedCategory ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: selectedCategory ? '#2563eb' : '#9ca3af',
                        boxShadow: selectedCategory ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
                        transform: selectedCategory ? 'translateY(-1px)' : 'none',
                      },
                      '&:disabled': {
                        backgroundColor: '#9ca3af',
                        color: '#ffffff',
                        cursor: 'not-allowed',
                      },
                    }}
                  >
                    Next
                  </Button>
                </Box>
              )}

            </Box>
          )}

          {step === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Scrollable Middle Section */}
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: { xs: 2, sm: 3 },
                paddingBottom: 0,
              }}>
                {/* Chart Name */}
                <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    mb: 1,
                    color: '#202223',
                  }}
                >
                  Chart Name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Name"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '14px',
                      '& fieldset': {
                        borderColor: '#e1e3e5',
                      },
                      '&:hover fieldset': {
                        borderColor: '#e1e3e5',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                      },
                    },
                  }}
                />
              </Box>

              {/* Size Chart Table */}
              <Box sx={{ mb: 3 }}>
                <TableContainer
                  component={Paper}
                  sx={{
                    boxShadow: 'none',
                    border: '1px solid #e1e3e5',
                    borderRadius: '4px',
                    position: 'relative',
                    overflowX: 'auto',
                  }}
                >
                  <Table sx={{ minWidth: 650, tableLayout: 'auto' }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f6f6f7' }}>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: '#202223',
                            borderRight: '1px solid #e1e3e5',
                            minWidth: '100px',
                            width: '100px',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: '#f6f6f7',
                            zIndex: 1,
                          }}
                        >
                          Size
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell
                            key={column.id}
                            sx={{
                              fontWeight: 600,
                              fontSize: '14px',
                              color: '#202223',
                              borderRight: '1px solid #e1e3e5',
                              position: 'relative',
                              minWidth: '150px',
                              width: '150px',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                              <TextField
                                value={column.label}
                                onChange={(e) => handleColumnLabelChange(column.id, e.target.value)}
                                size="small"
                                sx={{
                                  flex: 1,
                                  minWidth: '100px',
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                    padding: '4px 2px',
                                    '& fieldset': {
                                      borderColor: 'transparent',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#e1e3e5',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#3b82f6',
                                    },
                                  },
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveColumn(column.id)}
                                sx={{
                                  padding: '4px',
                                  color: '#dc2626',
                                  '&:hover': {
                                    backgroundColor: '#fee2e2',
                                    fontSize: '16px', color: '#dc2626'
                                  },
                                }}
                              >
                                
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-trash-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7h16" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /><path d="M10 12l4 4m0 -4l-4 4" /></svg>
                                
                              </IconButton>
                            </Box>
                          </TableCell>
                        ))}
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: '#202223',
                            position: 'relative',
                            minWidth: '60px',
                            width: '60px',
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={handleAddColumn}
                            sx={{
                              padding: '4px',
                              '&:hover': {
                                backgroundColor: '#f6f6f7',
                              },
                            }}
                          >
                            <AddIcon sx={{ fontSize: '18px', color: '#6d7175' }} />
                          </IconButton>
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            fontSize: '14px',
                            color: '#202223',
                            minWidth: '80px',
                            width: '80px',
                          }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sizeData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell 
                            sx={{ 
                              borderRight: '1px solid #e1e3e5', 
                              p: 1,
                              minWidth: '100px',
                              width: '100px',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: '#ffffff',
                              zIndex: 1,
                            }}
                          >
                            <TextField
                              fullWidth
                              size="small"
                              value={row.size}
                              onChange={(e) =>
                                handleSizeDataChange(index, 'size', e.target.value)
                              }
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  fontSize: '14px',
                                  '& fieldset': {
                                    borderColor: '#e1e3e5',
                                  },
                                },
                              }}
                            />
                          </TableCell>
                          {columns.map((column) => (
                            <TableCell 
                              key={column.id} 
                              sx={{ 
                                borderRight: '1px solid #e1e3e5', 
                                p: 1,
                                minWidth: '150px',
                                width: '150px',
                              }}
                            >
                              <TextField
                                fullWidth
                                size="small"
                                value={row[column.id] || ''}
                                onChange={(e) =>
                                  handleSizeDataChange(index, column.id, e.target.value)
                                }
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                    '& fieldset': {
                                      borderColor: '#e1e3e5',
                                    },
                                  },
                                }}
                              />
                            </TableCell>
                          ))}
                          <TableCell sx={{ p: 1, minWidth: '60px', width: '60px' }}></TableCell>
                          <TableCell sx={{ p: 1, minWidth: '80px', width: '80px' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRow(index)}
                              sx={{
                                padding: '4px',
                                fontSize: '16px', 
                                color: '#dc2626',
                                '&:hover': {
                                  backgroundColor: '#fee2e2',
                                },
                              }}
                            >
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-trash-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7h16" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /><path d="M10 12l4 4m0 -4l-4 4" /></svg>
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1,
                      borderTop: '1px solid #e1e3e5',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: '#f6f6f7',
                      },
                    }}
                    onClick={handleAddRow}
                  >
                    <AddIcon sx={{ fontSize: '20px', color: '#6d7175' }} />
                  </Box>
                </TableContainer>
              </Box>

              {/* Add Measurement Instructions */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    mb: 2,
                    color: '#202223',
                  }}
                >
                  Add Measurement instructions <span style={{ fontSize: '14px', fontWeight: 400, color: '#6d7175' }}>(Optional)</span>
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 3,
                    alignItems: { xs: 'flex-start', sm: 'center' },
                  }}
                >
                  {/* Illustration */}
                  <Box
                    sx={{
                      width: { xs: '100%', sm: '200px' },
                      height: '200px',
                      backgroundColor: '#f6f6f7',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e1e3e5',
                      position: 'relative',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {measurementFilePreview ? (
                      <img
                        src={measurementFilePreview}
                        alt="Measurement instructions"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: '120px',
                            height: '150px',
                            border: '2px dashed #d1d5db',
                            borderRadius: '60px',
                            position: 'relative',
                            opacity: 0.5,
                          }}
                        >
                          {/* Chest line */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '30%',
                              left: '-20px',
                              right: '-20px',
                              height: '2px',
                              borderTop: '2px dashed #d1d5db',
                            }}
                          />
                          {/* Waist line */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '-20px',
                              right: '-20px',
                              height: '2px',
                              borderTop: '2px dashed #d1d5db',
                            }}
                          />
                          {/* Hips line */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: '70%',
                              left: '-20px',
                              right: '-20px',
                              height: '2px',
                              borderTop: '2px dashed #d1d5db',
                            }}
                          />
                        </Box>
                       
                      </Box>
                    )}
                  </Box>

                  {/* File Upload */}
                  <Box sx={{ flex: 1 }}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="measurement-file-upload"
                      type="file"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="measurement-file-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        sx={{
                          textTransform: 'none',
                          fontSize: '14px',
                          borderColor: '#e1e3e5',
                          color: '#202223',
                          '&:hover': {
                            borderColor: '#e1e3e5',
                            backgroundColor: '#f6f6f7',
                          },
                        }}
                      >
                        Choose File
                      </Button>
                    </label>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        color: '#6d7175',
                        mt: 1,
                      }}
                    >
                      {measurementFile ? measurementFile.name : 'No file chosen (Optional)'}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        mt: 0.5,
                        fontStyle: 'italic',
                      }}
                    >
                      Upload an image to show measurement instructions to customers
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Description */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    mb: 1,
                    color: '#202223',
                  }}
                >
                  Description
                </Typography>
                {/* Rich Text Editor Toolbar */}
                <Box
                  sx={{
                    border: '1px solid #e1e3e5',
                    borderBottom: 'none',
                    borderRadius: '4px 4px 0 0',
                    p: 1,
                    display: 'flex',
                    gap: 0.5,
                    backgroundColor: '#f6f6f7',
                  }}
                >
                  <Button
                    size="small"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('bold', false, null);
                    }}
                    sx={{
                      minWidth: 'auto',
                      padding: '4px 8px',
                      fontSize: '12px',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#e1e3e5',
                      },
                    }}
                  >
                    <strong>B</strong>
                  </Button>
                  <Button
                    size="small"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('italic', false, null);
                    }}
                    sx={{
                      minWidth: 'auto',
                      padding: '4px 8px',
                      fontSize: '12px',
                      textTransform: 'none',
                      fontStyle: 'italic',
                      '&:hover': {
                        backgroundColor: '#e1e3e5',
                      },
                    }}
                  >
                    <em>I</em>
                  </Button>
                  <Button
                    size="small"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('underline', false, null);
                    }}
                    sx={{
                      minWidth: 'auto',
                      padding: '4px 8px',
                      fontSize: '12px',
                      textTransform: 'none',
                      textDecoration: 'underline',
                      '&:hover': {
                        backgroundColor: '#e1e3e5',
                      },
                    }}
                  >
                    <u>U</u>
                  </Button>
                </Box>
                {/* Rich Text Editor Content */}
                <Box
                  component="div"
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    descriptionEditorRef.current = el;
                    if (el && step === 2 && el.innerHTML !== description) {
                      el.innerHTML = description;
                    }
                  }}
                  onInput={(e) => {
                    if (descriptionEditorRef.current) {
                      setDescription(descriptionEditorRef.current.innerHTML);
                    }
                  }}
                  onBlur={() => {
                    if (descriptionEditorRef.current) {
                      setDescription(descriptionEditorRef.current.innerHTML);
                    }
                  }}
                  sx={{
                    minHeight: '120px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #e1e3e5',
                    borderRadius: '0 0 4px 4px',
                    p: 2,
                    fontSize: '14px',
                    color: '#202223',
                    outline: 'none',
                    '&:focus': {
                      borderColor: '#3b82f6',
                      borderWidth: '2px',
                    },
                    '&:empty:before': {
                      content: '"Enter description..."',
                      color: '#9ca3af',
                    },
                    '& strong': {
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
              </Box>

              {/* Action Buttons - Fixed Bottom */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                gap: 2, 
                padding: { xs: 2, sm: 3 },
                paddingTop: 2,
                borderTop: '1px solid #e1e3e5',
                flexShrink: 0,
                backgroundColor: '#ffffff',
              }}>
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon sx={{ fontSize: '18px' }} />}
                  onClick={handleView}
                  sx={{
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    borderColor: '#e1e3e5',
                    color: '#374151',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      backgroundColor: '#eff6ff',
                      color: '#3b82f6',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                    },
                  }}
                >
                  View Chart
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon sx={{ fontSize: '18px' }} />}
                    onClick={handleBack}
                    sx={{
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: '12px 24px',
                      borderRadius: '8px',
                      borderColor: '#e1e3e5',
                      color: '#374151',
                      backgroundColor: '#ffffff',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#6b7280',
                        backgroundColor: '#f9fafb',
                        color: '#111827',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : <SaveIcon sx={{ fontSize: '18px' }} />}
                    onClick={handleSave}
                    disabled={isSaving}
                    sx={{
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      padding: '12px 28px',
                      borderRadius: '8px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#059669',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Save Chart
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {step === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header with Unit Toggle */}
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
                </Box>
              </Box>

              {/* Tabs */}
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
                  // Size Guide Tab
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
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
                                  {row.size}
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
                      <Typography sx={{ fontSize: '14px', color: '#6d7175', textAlign: 'center', mt: 4 }}>
                        No size data available
                      </Typography>
                    )}
                  </Box>
                ) : (
                  // How to Measure Tab
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px',width: '100%' }}>
                    {/* Measurement Guide Image - Only show if image exists */}
                    {measurementFilePreview && (
                      <Box
                        sx={{
                          width: "100%",
                          height: '250px',
                         
                          marginBottom:"10px",
                         justifyItems: 'center',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         overflow: 'hidden',
                         position: 'relative',
                        }}
                      >
                         <Box
                        sx={{
                          width: "fit-content",
                          height: '250px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '8px', 
                          display: 'flex',
            
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={measurementFilePreview}
                          alt="Measurement instructions"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            
                          }}
                        />
                        </Box>
                      </Box>
                    )}

                    {/* Measurement Instructions */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
                      {description && description.trim() ? (
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
                          dangerouslySetInnerHTML={{ __html: description }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '14px', color: '#6d7175' }}>
                          No measurement instructions available.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Action Buttons - Fixed Bottom */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 2, 
                padding: { xs: 2, sm: 3 },
                paddingTop: 2,
                borderTop: '1px solid #e1e3e5',
                flexShrink: 0,
                backgroundColor: '#ffffff',
              }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon sx={{ fontSize: '18px' }} />}
                  onClick={handleBack}
                  sx={{
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    borderColor: '#e1e3e5',
                    color: '#374151',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#6b7280',
                      backgroundColor: '#f9fafb',
                      color: '#111827',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  startIcon={isSaving ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : <SaveIcon sx={{ fontSize: '18px' }} />}
                  onClick={handleSave}
                  disabled={isSaving}
                  sx={{
                    textTransform: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '12px 28px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#059669',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Save Chart
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>

    {/* Warning Dialog */}
    <Dialog
      open={showWarningDialog}
      onClose={handleCancelClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e1e3e5',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: 600, color: '#202223' }}>
          Unsaved Changes
        </span>
        <IconButton
          onClick={handleCancelClose}
          sx={{
            color: '#6d7175',
            padding: '4px',
            '&:hover': {
              backgroundColor: '#f6f6f7',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: '24px' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, paddingTop: '20px' }}>
          <Box
            sx={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              fontSize: '24px',
              flexShrink: 0,
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#202223',
                marginBottom: '8px',
              }}
            >
              If you close this, your unsaved data will be lost.
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: '#6d7175',
                marginBottom: '12px',
              }}
            >
              Are you sure you want to close without saving? All your changes will be lost.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          padding: '16px 24px',
          borderTop: '1px solid #e1e3e5',
          justifyContent: 'flex-end',
          gap: 2,
        }}
      >
        <Button
          startIcon={<CancelIcon sx={{ fontSize: '18px' }} />}
          onClick={handleCancelClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            color: '#6b7280',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px',
            borderColor: '#e5e7eb',
            backgroundColor: '#ffffff',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#f9fafb',
              borderColor: '#d1d5db',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmClose}
          variant="contained"
          sx={{
            textTransform: 'none',
            color: '#dc2626',
            padding: '8px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px',
            background: 'rgba(220, 38, 38, 0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            boxShadow: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(220, 38, 38, 0.3)',
              borderColor: 'rgba(220, 38, 38, 0.4)',
              boxShadow: 'none',
            },
          }}
        >
          Close Without Saving
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default CreateChart;
