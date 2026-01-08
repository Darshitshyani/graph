import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  console.error("AWS_S3_BUCKET_NAME environment variable is not set");
}

/**
 * Upload an image file to S3
 * @param {File|Blob|Buffer} file - The image file to upload
 * @param {string} originalFileName - Original filename
 * @returns {Promise<string>} - S3 object key
 */
export async function uploadImageToS3(file, originalFileName) {
  if (!BUCKET_NAME) {
    throw new Error("AWS S3 bucket name is not configured");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const fileType = file.type || "application/octet-stream";
  
  if (!allowedTypes.includes(fileType)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(", ")}`);
  }

  // Generate folder structure: images/YYYY/MM/
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  
  // Generate unique filename
  const fileExtension = originalFileName.split(".").pop() || "jpg";
  const uniqueId = uuidv4();
  const fileName = `${uniqueId}.${fileExtension}`;
  
  // S3 object key: images/YYYY/MM/filename
  const s3Key = `images/${year}/${month}/${fileName}`;

  try {
    // Convert file to Buffer
    let fileBuffer;
    let contentType = fileType;
    
    // Handle File objects from FormData (in Node.js environment)
    // In Node.js 18+, File objects from FormData have a stream() method
    if (file && typeof file === 'object') {
      if ('stream' in file && typeof file.stream === 'function') {
        // Node.js File object from FormData (Node 18+)
        const chunks = [];
        const stream = file.stream();
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        fileBuffer = Buffer.concat(chunks);
        contentType = file.type || fileType;
      } else if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
        // Browser File/Blob object or Node File with arrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        contentType = file.type || fileType;
      } else if (Buffer.isBuffer(file)) {
        // Already a Buffer
        fileBuffer = file;
      } else {
        throw new Error("Invalid file type. Expected File with stream/arrayBuffer method or Buffer");
      }
    } else {
      throw new Error("Invalid file type. Expected File object or Buffer");
    }

    // Upload to S3 - public access is handled by bucket policy only
    // The bucket policy allows public read access to the /images/ folder
    // No ACLs are used - bucket is configured with ACLs disabled
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Return the S3 key (you can construct the full URL if needed)
    // Format: s3://bucket-name/images/YYYY/MM/filename
    return s3Key;
  } catch (error) {
    console.error("Error uploading image to S3:", error);
    throw new Error(`Failed to upload image to S3: ${error.message}`);
  }
}

/**
 * Get public HTTPS S3 URL from object key
 * @param {string} s3Key - S3 object key (can be s3:// URL, HTTPS URL, or just the key)
 * @returns {string} - Public HTTPS S3 URL
 */
export function getS3Url(s3Key) {
  if (!s3Key || typeof s3Key !== 'string') return s3Key;
  
  // Already a full HTTPS URL - return as is
  if (s3Key.startsWith("http://") || s3Key.startsWith("https://")) {
    return s3Key;
  }
  
  // Convert s3:// URL to just the key
  if (s3Key.startsWith("s3://")) {
    // Extract the key part after bucket name
    const parts = s3Key.replace("s3://", "").split("/");
    if (parts[0] === BUCKET_NAME) {
      s3Key = parts.slice(1).join("/");
    } else {
      // If bucket name doesn't match, try to extract path after first slash
      s3Key = s3Key.split("/").slice(1).join("/");
    }
  }
  
  // Get region from environment or default
  const region = process.env.AWS_REGION || "us-east-1";
  
  // Construct public HTTPS URL
  // Format: https://bucket-name.s3.region.amazonaws.com/images/YYYY/MM/filename
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Recursively convert all s3:// URLs in chartData to HTTPS URLs
 * This ensures that any stored s3:// URLs are converted to browser-readable HTTPS URLs
 * @param {any} data - Chart data object (can be any structure)
 * @returns {any} - Chart data with all s3:// URLs converted to HTTPS URLs
 */
export function normalizeChartDataUrls(data) {
  if (!data) return data;
  
  // Handle strings - check if it's a URL that needs conversion
  if (typeof data === 'string') {
    if (data.startsWith('s3://')) {
      return getS3Url(data);
    }
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => normalizeChartDataUrls(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const normalized = {};
    for (const [key, value] of Object.entries(data)) {
      // Convert measurementFile and guideImage/guideImageUrl fields
      if (
        key === 'measurementFile' || 
        key === 'guideImage' || 
        key === 'guideImageUrl' ||
        (typeof value === 'string' && value.startsWith('s3://'))
      ) {
        normalized[key] = getS3Url(value);
      } else {
        normalized[key] = normalizeChartDataUrls(value);
      }
    }
    return normalized;
  }
  
  // Return other types as-is
  return data;
}

/**
 * Extract S3 key from an S3 HTTPS URL or key
 * @param {string} urlOrKey - S3 HTTPS URL or S3 key
 * @returns {string|null} - S3 key or null if invalid
 */
export function extractS3Key(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  
  // If it's already just a key (starts with images/), return it
  if (urlOrKey.startsWith('images/')) {
    return urlOrKey;
  }
  
  // If it's an HTTPS URL, extract the key
  if (urlOrKey.startsWith('https://')) {
    try {
      const url = new URL(urlOrKey);
      // Extract pathname and remove leading slash
      const path = url.pathname.substring(1);
      // Path should be: images/YYYY/MM/filename or images/guideimages/filename
      if (path.startsWith('images/')) {
        return path;
      }
    } catch (e) {
      console.error('Error parsing S3 URL:', e);
      return null;
    }
  }
  
  return null;
}

/**
 * Check if an S3 key is a default guide image (should not be deleted)
 * @param {string} s3Key - S3 object key
 * @returns {boolean} - True if it's a default guide image
 */
export function isDefaultGuideImage(s3Key) {
  if (!s3Key || typeof s3Key !== 'string') return false;
  // Default guide images are in images/guideimages/ folder
  return s3Key.startsWith('images/guideimages/');
}

/**
 * Delete an image from S3
 * @param {string} s3KeyOrUrl - S3 object key or HTTPS URL
 * @returns {Promise<void>}
 */
export async function deleteImageFromS3(s3KeyOrUrl) {
  if (!BUCKET_NAME) {
    throw new Error("AWS S3 bucket name is not configured");
  }

  if (!s3KeyOrUrl) {
    return; // Nothing to delete
  }

  // Extract S3 key from URL if needed
  const s3Key = extractS3Key(s3KeyOrUrl);
  if (!s3Key) {
    console.warn('Invalid S3 key or URL for deletion:', s3KeyOrUrl);
    return;
  }

  // Don't delete default guide images (they're shared across templates)
  if (isDefaultGuideImage(s3Key)) {
    console.log('Skipping deletion of default guide image:', s3Key);
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    console.log('Successfully deleted S3 object:', s3Key);
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    // Don't throw - deletion failures shouldn't break the flow
  }
}

