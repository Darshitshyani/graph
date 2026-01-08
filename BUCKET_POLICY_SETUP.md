# AWS S3 Bucket Policy Setup for Public Image Access

## Quick Setup

To make images in the `/images/` folder publicly accessible via HTTPS URLs, you need to configure your S3 bucket.

## Step-by-Step Instructions

### 1. Configure Block Public Access Settings

**Note**: Modern S3 buckets use bucket policies instead of ACLs. The application does not use ACLs on objects, so you can use the default "Bucket owner enforced" setting for Object Ownership.

1. Go to your S3 bucket in AWS Console
2. Click on the "Permissions" tab
3. Scroll to "Block Public Access settings for this bucket"
4. Click "Edit"
5. **Uncheck**: "Block public access to buckets and objects granted through new public bucket or access point policies"
6. Keep other settings checked (or uncheck all if you prefer, but the bucket policy will still restrict access)
7. Click "Save changes"
8. Type "confirm" to confirm

### 3. Add Bucket Policy

1. Still in the "Permissions" tab
2. Scroll to "Bucket policy"
3. Click "Edit"
4. Add the following policy (replace `sizechartimages` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sizechartimages/images/*"
    }
  ]
}
```

5. Click "Save changes"

## Verify Setup

After configuration, test by:
1. Upload an image through your app
2. Check the S3 bucket - the image should be in `images/YYYY/MM/` folder
3. Try accessing the URL directly in a browser:
   ```
   https://sizechartimages.s3.ap-south-1.amazonaws.com/images/2024/12/your-image-uuid.jpg
   ```
4. The image should load without authentication

## Security Notes

- Only the `/images/` folder is publicly readable
- Other folders/files in the bucket remain private
- No ACLs are used - access is controlled entirely by bucket policy
- URLs are permanent and don't expire

## Troubleshooting

If you see "Access Denied" (403) errors when accessing images:

1. **Verify Block Public Access settings**: Make sure "Block public access to buckets and objects granted through new public bucket or access point policies" is **unchecked**

2. **Verify Bucket Policy**: Check that the bucket policy is saved and includes:
   - `"Principal": "*"` (allows public access)
   - `"Action": "s3:GetObject"` (allows reading objects)
   - `"Resource": "arn:aws:s3:::sizechartimages/images/*"` (only the `/images/` folder)

3. **Check Object Path**: Verify the image is actually uploaded to the `/images/` folder in S3

4. **Test the URL**: Try accessing the URL directly in your browser - if it shows XML with "Access Denied", the bucket policy needs to be configured

