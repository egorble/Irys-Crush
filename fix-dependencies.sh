#!/bin/bash

# 🔧 Fix npm ETARGET Dependencies Error
# Скрипт для виправлення помилки з залежностями

echo "🔧 Fixing npm ETARGET dependencies error..."
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Clean npm cache
print_status "Cleaning npm cache..."
npm cache clean --force
print_success "npm cache cleaned"

# Step 2: Remove node_modules and package-lock.json
print_status "Removing node_modules and package-lock.json..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "node_modules removed"
fi

if [ -f "package-lock.json" ]; then
    rm package-lock.json
    print_success "package-lock.json removed"
fi

# Step 3: Reinstall dependencies
print_status "Reinstalling dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully!"
    echo ""
    echo "🎉 Problem fixed! You can now run:"
    echo "  npm start"
    echo "  npm run deploy:full"
    echo "  ./quick-deploy.sh"
else
    print_error "Failed to install dependencies"
    echo ""
    echo "💡 Try manual steps:"
    echo "1. Check your Node.js version: node --version (recommend 18.x)"
    echo "2. Update npm: npm install -g npm@latest"
    echo "3. Try again: npm install"
    echo "4. If still fails, try: npm install --legacy-peer-deps"
    exit 1
fi 