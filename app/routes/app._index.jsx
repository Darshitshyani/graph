import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  // Handle actions if needed
  return { success: true };
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#202223', marginBottom: '16px' }}>
        Welcome to Size Chart
      </h1>
      <p style={{ fontSize: '16px', color: '#6d7175', marginBottom: '32px' }}>
        Manage your size charts from the navigation menu.
      </p>
    </div>
  );
}
