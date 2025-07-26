#!/bin/bash

echo "🚀 Setting up E2E Test Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Installing Puppeteer (this may take a moment)..."
npm install puppeteer

echo "📁 Creating test directories..."
mkdir -p test-screenshots
mkdir -p test-reports

echo "🧪 Running comprehensive E2E test suite..."
echo "   - Testing UI interactions"
echo "   - Testing email processing"
echo "   - Testing document upload"
echo "   - Testing data persistence"
echo ""

# Run the test
if [ "$1" = "headless" ]; then
    echo "🤖 Running in headless mode..."
    HEADLESS=true npm run test:e2e
else
    echo "🖥️  Running with visible browser (you can see what's happening)..."
    npm run test:e2e
fi

# Check if test completed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ E2E Test completed!"
    echo "📊 Check e2e-test-report.json for detailed results"
    echo "📸 Check test-screenshots/ for visual evidence"
    
    # Show quick summary if report exists
    if [ -f "e2e-test-report.json" ]; then
        echo ""
        echo "📋 Quick Summary:"
        node -e "
            const report = JSON.parse(require('fs').readFileSync('e2e-test-report.json', 'utf8'));
            console.log('✅ Passed:', report.summary.passed);
            console.log('❌ Failed:', report.summary.failed);
            console.log('📈 Success Rate:', report.summary.successRate);
            if (report.issues.length > 0) {
                console.log('\\n🐛 Issues:');
                report.issues.forEach((issue, i) => console.log(\`  \${i+1}. \${issue}\`));
            }
        "
    fi
else
    echo ""
    echo "❌ E2E Test failed or was interrupted"
    echo "📋 Check the console output above for details"
fi

echo ""
echo "🏁 E2E Test process complete!"