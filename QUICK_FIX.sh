#!/bin/bash

# Quick Fix Script for Library Issues
# Run: bash QUICK_FIX.sh

echo "🧹 Clearing caches..."
rm -rf node_modules/.cache
rm -rf .vite
rm -rf build
rm -rf node_modules/.vite

echo "✅ Caches cleared!"
echo ""
echo "📦 If issues persist, try:"
echo "   npm install"
echo "   npm run dev"

