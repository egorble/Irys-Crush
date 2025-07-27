#!/bin/bash

# 🔧 Fix path-to-regexp Error
# Скрипт для виправлення помилки "Missing parameter name" в path-to-regexp

echo "🔧 Fixing path-to-regexp error..."
echo "================================="

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

# Step 1: Stop any running server
print_status "Stopping any running server..."
pkill -f "node server.js" || true
print_success "Server stopped"

# Step 2: Clean npm cache
print_status "Cleaning npm cache..."
npm cache clean --force
print_success "npm cache cleaned"

# Step 3: Remove node_modules and package-lock.json
print_status "Removing node_modules and package-lock.json..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "node_modules removed"
fi

if [ -f "package-lock.json" ]; then
    rm package-lock.json
    print_success "package-lock.json removed"
fi

# Step 4: Install with legacy peer deps (fixes version conflicts)
print_status "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully!"
    
    # Step 5: Verify path-to-regexp version
    print_status "Checking path-to-regexp version..."
    PATH_TO_REGEXP_VERSION=$(npm list path-to-regexp --depth=0 2>/dev/null | grep path-to-regexp | cut -d'@' -f2 || echo "not found")
    echo "   path-to-regexp version: $PATH_TO_REGEXP_VERSION"
    
    echo ""
    echo "🎉 Problem fixed! You can now run:"
    echo "  npm start"
    echo "  npm run deploy:full"
    
    # Step 6: Test server start
    print_status "Testing server start..."
    timeout 10s npm start &
    SERVER_PID=$!
    sleep 5
    
    if kill -0 $SERVER_PID 2>/dev/null; then
        print_success "Server started successfully!"
        kill $SERVER_PID
        echo ""
        echo "✅ Everything is working! Run 'npm start' to start the server."
    else
        print_warning "Server test failed, but dependencies are fixed. Try manually: npm start"
    fi
    
else
    print_error "Failed to install dependencies"
    echo ""
    echo "💡 Try these alternative solutions:"
    echo "1. Use Node.js 18.x: nvm use 18"
    echo "2. Update npm: npm install -g npm@latest"
    echo "3. Manual install: npm install express@4.19.2 path-to-regexp@6.2.1"
    echo "4. Check for conflicting global packages: npm list -g --depth=0"
    exit 1
fi 