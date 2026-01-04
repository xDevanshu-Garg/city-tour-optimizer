#!/bin/bash

echo "======================================"
echo "City Tour Optimizer - Web Application"
echo "======================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.7 or higher."
    exit 1
fi

echo "✓ Python found: $(python3 --version)"
echo ""

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi

echo "✓ pip found"
echo ""

# Check if requirements are installed
echo "📦 Checking dependencies..."
pip3 show Flask > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Installing required packages..."
    pip3 install -r requirements.txt
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo "======================================"
echo "🚀 Starting City Tour Optimizer..."
echo "======================================"
echo ""
echo "The application will be available at:"
echo "👉 http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the Flask application
python3 app.py
