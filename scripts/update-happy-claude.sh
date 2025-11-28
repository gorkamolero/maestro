#!/bin/bash
set -e

# Define the path to happy-coder within the Volta directory
HAPPY_DIR="$HOME/.volta/tools/image/packages/happy-coder/lib/node_modules/happy-coder"

echo "🔍 Checking for Happy Coder installation..."

if [ ! -d "$HAPPY_DIR" ]; then
    echo "❌ Happy Coder not found at expected path: $HAPPY_DIR"
    echo "Please verify your installation."
    exit 1
fi

echo "📂 Found Happy Coder at: $HAPPY_DIR"
echo "🔄 Updating @anthropic-ai/claude-code to latest version..."

# Navigate and install
cd "$HAPPY_DIR"
npm install @anthropic-ai/claude-code@latest

echo "✅ Update complete!"
echo "📊 Current version:"
npm list @anthropic-ai/claude-code
