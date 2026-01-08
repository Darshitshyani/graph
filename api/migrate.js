/**
 * Vercel serverless function to run database migrations
 * This should be called once after deployment or manually triggered
 * @param {import("@vercel/node").VercelRequest} request
 * @param {import("@vercel/node").VercelResponse} response
 */
export default async function handler(request, response) {
  // Only allow POST requests for security
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  // Optional: Add authentication token check here
  const authToken = request.headers["x-migration-token"];
  const expectedToken = process.env.MIGRATION_TOKEN;
  
  if (expectedToken && authToken !== expectedToken) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { execSync } = await import("child_process");
    
    // Run migrations
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: process.env,
    });

    response.status(200).json({ 
      success: true, 
      message: "Migrations completed successfully" 
    });
  } catch (error) {
    console.error("Migration error:", error);
    response.status(500).json({ 
      error: "Migration failed",
      message: error.message 
    });
  }
}
