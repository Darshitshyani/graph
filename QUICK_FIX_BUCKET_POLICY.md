# Quick Fix: S3 Images Not Showing (403 Error)

## Problem
Images are uploaded to S3 but return "Access Denied" (403) when accessed via HTTPS URLs.

## Solution: Configure Bucket Policy

### Step 1: Allow Public Policies

1. Go to AWS Console → S3 → Your bucket (`sizechartimages`)
2. Click **Permissions** tab
3. Find **"Block Public Access settings for this bucket"**
4. Click **Edit**
5. **Uncheck**: "Block public access to buckets and objects granted through new public bucket or access point policies"
6. Click **Save changes**
7. Type **"confirm"** to confirm

### Step 2: Add Bucket Policy

1. Still in **Permissions** tab
2. Scroll to **"Bucket policy"**
3. Click **Edit**
4. Paste this policy (replace `sizechartimages` if your bucket name is different):

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

5. Click **Save changes**

### Step 3: Verify

Test by accessing an image URL directly in your browser:
```
https://sizechartimages.s3.ap-south-1.amazonaws.com/images/2025/12/d9696ae0-a4bb-41de-a298-ff78fae4dd35.png
```

If the image loads, the policy is working correctly!

## Important Notes

- **Region**: Make sure the URL uses the correct region (`ap-south-1` for Mumbai)
- **Path**: Only files in the `/images/` folder will be public
- **No ACLs needed**: The application doesn't use ACLs - bucket policy handles everything

