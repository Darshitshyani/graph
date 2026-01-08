import { createRequestHandler } from "@react-router/serve";
import * as build from "../build/server/index.js";

/**
 * Vercel serverless function handler for React Router v7
 * @param {import("@vercel/node").VercelRequest} request
 * @param {import("@vercel/node").VercelResponse} response
 */
export default async function handler(request, response) {
  try {
    // Create request handler
    const handleRequest = createRequestHandler(build, process.env.NODE_ENV || "production");
    
    // Get the full URL
    const protocol = request.headers["x-forwarded-proto"] || "https";
    const host = request.headers.host || request.headers["x-forwarded-host"];
    const url = new URL(request.url || "/", `${protocol}://${host}`);
    
    // Build headers
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value && key !== "host") {
        headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }
    });
    
    // Handle request body
    let body = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (request.body) {
        if (typeof request.body === "string") {
          body = request.body;
        } else {
          body = JSON.stringify(request.body);
        }
      } else if (request.rawBody) {
        body = request.rawBody;
      }
    }
    
    // Create standard Request object
    const standardRequest = new Request(url.toString(), {
      method: request.method || "GET",
      headers: headers,
      body: body,
    });
    
    // Handle the request
    const standardResponse = await handleRequest(standardRequest);
    
    // Convert Response to Vercel response
    response.status(standardResponse.status);
    
    // Copy headers
    standardResponse.headers.forEach((value, key) => {
      // Skip certain headers that Vercel handles
      if (key.toLowerCase() !== "content-encoding") {
        response.setHeader(key, value);
      }
    });
    
    // Get response body
    const responseBody = await standardResponse.text();
    response.send(responseBody);
    
  } catch (error) {
    console.error("Error handling request:", error);
    response.status(500).json({ 
      error: "Internal Server Error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}
