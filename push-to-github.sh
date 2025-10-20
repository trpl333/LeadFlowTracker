#!/bin/bash

echo "🚀 Pushing LeadFlowTracker to GitHub..."

# Check if origin already exists
if git remote get-url origin > /dev/null 2>&1; then
    echo "✓ Remote 'origin' already exists"
    git remote set-url origin https://github.com/trpl333/LeadFlowTracker.git
else
    echo "Adding remote 'origin'..."
    git remote add origin https://github.com/trpl333/LeadFlowTracker.git
fi

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

echo "📦 Staging files..."
git add .

echo "💾 Creating commit..."
git commit -m "Initial commit: Sales Lead Tracker with Google Sheets integration" || echo "Nothing to commit or already committed"

echo "⬆️ Pushing to GitHub..."
git push -u origin $BRANCH

echo "✅ Done! Your code is now on GitHub:"
echo "https://github.com/trpl333/LeadFlowTracker"
