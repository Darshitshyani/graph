# S3 Image Storage Migration Guide

## Overview
This migration moves all image storage from local/base64 to AWS S3.

## Environment Variables Required
Add these to your `.env` file (see `AWS_S3_SETUP.md` for detailed setup instructions):
```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

**Important**: After adding these variables, you must restart your development server for them to take effect.

## Changes Made

### Backend Changes
1. ✅ Created `app/utils/s3.server.js` - S3 upload utility
2. ✅ Created `app/routes/api.upload-image.jsx` - Dedicated image upload endpoint
3. ✅ Updated `app/routes/app.templates.jsx` - Added image processing function and updated create/update actions

### Frontend Changes Needed

#### 1. Update CreateChart Component (`app/shared/CreateChart.jsx`)
The component currently sends `measurementFile` as just a filename in chartData. It needs to:
- Send the actual File object as a FormData field named "measurementFile"
- Update `handleChartSaved` to append the file to FormData before sending

#### 2. Update Templates Page (`app/routes/app.templates.jsx`)
For guide images in measurement fields:
- When saving, send image files as FormData fields named `guideImage_0`, `guideImage_1`, etc.
- Update the save handler to append image files to FormData

## Image Storage Format

Images are stored in S3 with the following structure:
- Path: `images/YYYY/MM/uuid-filename.ext`
- Example: `images/2024/12/550e8400-e29b-41d4-a716-446655440000.jpg`

S3 URLs are stored in the database as:
- Format: `s3://bucket-name/images/YYYY/MM/filename`
- Example: `s3://my-bucket/images/2024/12/550e8400-e29b-41d4-a716-446655440000.jpg`

## API Endpoints

### Upload Image (Standalone)
`POST /api/upload-image`
- Accepts: FormData with `image` field
- Returns: `{ success: true, s3Key: "...", s3Url: "s3://..." }`

### Templates (Create/Update)
The existing templates endpoints now process images from FormData:
- `measurementFile` - Main measurement image (File object)
- `guideImage_0`, `guideImage_1`, etc. - Guide images for measurement fields (File objects)

## Notes
- All images are uploaded directly to S3, no local storage
- Bucket remains private (no public URLs)
- Old base64 images will be skipped (logged as warnings)
- File validation ensures only image types are accepted

