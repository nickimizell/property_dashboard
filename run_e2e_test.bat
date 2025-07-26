@echo off
echo 🚀 Setting up E2E Test Environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install

echo 🔧 Installing Puppeteer (this may take a moment)...
call npm install puppeteer

echo 📁 Creating test directories...
if not exist "test-screenshots" mkdir test-screenshots
if not exist "test-reports" mkdir test-reports

echo 🧪 Running comprehensive E2E test suite...
echo    - Testing UI interactions
echo    - Testing email processing
echo    - Testing document upload
echo    - Testing data persistence
echo.

REM Run the test
if "%1"=="headless" (
    echo 🤖 Running in headless mode...
    set HEADLESS=true
    call npm run test:e2e
) else (
    echo 🖥️  Running with visible browser (you can see what's happening)...
    call npm run test:e2e
)

REM Check if test completed
if %errorlevel% equ 0 (
    echo.
    echo ✅ E2E Test completed!
    echo 📊 Check e2e-test-report.json for detailed results
    echo 📸 Check test-screenshots\ for visual evidence
) else (
    echo.
    echo ❌ E2E Test failed or was interrupted
    echo 📋 Check the console output above for details
)

echo.
echo 🏁 E2E Test process complete!
pause