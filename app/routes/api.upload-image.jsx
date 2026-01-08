import { authenticate } from "../shopify.server";
import { uploadImageToS3, getS3Url } from "../utils/s3.server";

export const action = async ({ request }) => {
  try {
    // Authenticate the request
    const { session } = await authenticate.admin(request);
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return Response.json(
        { success: false, error: "No image file provided" },
        { status: 400 }
      );
    }

    // Get original filename
    const originalFileName = imageFile.name || "image.jpg";

    // Upload to S3
    const s3Key = await uploadImageToS3(imageFile, originalFileName);
    const s3Url = getS3Url(s3Key);

    return Response.json({
      success: true,
      s3Key,
      s3Url,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to upload image",
      },
      { status: 500 }
    );
  }
};

