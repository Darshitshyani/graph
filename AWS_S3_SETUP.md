# AWS S3 Setup Guide

## Required Environment Variables

You need to add the following environment variables to your `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```

## Steps to Set Up

### 1. Create an S3 Bucket (if you don't have one)

1. Log in to AWS Console
2. Go to S3 service
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `size-chart-images`)
5. Select your region (e.g., `us-east-1`)
6. **Object Ownership**: Use default "Bucket owner enforced" (ACLs disabled)
7. **Block Public Access settings**: 
   - **Uncheck** "Block all public access" (you'll control access via bucket policy)
   - OR uncheck only "Block public access to buckets and objects granted through new public bucket or access point policies"
8. Create the bucket

**Important**: Modern S3 buckets use bucket policies instead of ACLs. The application does not use ACLs on objects.

### 1b. Configure Bucket Policy for Public Read Access to Images Folder

After creating the bucket, add a bucket policy to allow public read access only to the `/images/` folder:

1. Go to your S3 bucket in AWS Console
2. Click on the "Permissions" tab
3. Scroll down to "Bucket policy"
4. Click "Edit" and add the following policy (replace `YOUR-BUCKET-NAME` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/images/*"
    }
  ]
}
```

**Important**: 
- This policy allows anyone to read objects in the `/images/` folder via HTTPS URLs
- The rest of the bucket remains private
- Replace `YOUR-BUCKET-NAME` with your actual bucket name (e.g., `sizechartimages`)

### 2. Create IAM User with S3 Permissions

1. Go to IAM service in AWS Console
2. Click "Users" → "Create user"
3. Enter a username (e.g., `size-chart-s3-user`)
4. Click "Next"
5. Click "Attach policies directly"
6. Search for and select `AmazonS3FullAccess` (or create a custom policy with only PutObject and DeleteObject permissions)
7. Create the user
8. Go to the "Security credentials" tab
9. Click "Create access key"
10. Choose "Application running outside AWS"
11. Copy the **Access key ID** and **Secret access key**

### 3. Add Environment Variables

Create or edit your `.env` file in the project root:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=size-chart-images
```

**Important**: 
- Replace the example values with your actual AWS credentials
- Never commit `.env` file to version control (it's already in `.gitignore`)
- The bucket name should match exactly (case-sensitive)

### 4. Restart Your Development Server

After adding the environment variables, restart your development server:

```bash
npm run dev
```

### 5. Verify Setup

Try uploading an image in the templates page. If the error persists, check:
- All environment variables are set correctly
- AWS credentials are valid
- S3 bucket name is correct
- S3 bucket exists and is accessible with the provided credentials
- You have the correct IAM permissions for the bucket

## Troubleshooting

### Error: "AWS S3 bucket name is not configured"
- Make sure `AWS_S3_BUCKET_NAME` is set in your `.env` file
- Restart your development server after adding the variable

### Error: "Access Denied" or "Invalid credentials"
- Verify your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct
- Check that the IAM user has S3 permissions
- Verify the bucket exists and is in the correct region

### Error: "Bucket does not exist"
- Verify the bucket name is spelled correctly
- Check that the bucket is in the region specified by `AWS_REGION`

## Security Best Practices

1. **Use IAM user with minimal permissions**: Only grant PutObject and DeleteObject permissions for the specific bucket
2. **Never commit credentials**: Always use environment variables
3. **Rotate credentials regularly**: Update access keys periodically
4. **Use separate buckets**: Use different buckets for development and production

