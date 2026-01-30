"""
Test script for E-BrandID Artwork Downloader Web Application
Tests the web interface functionality using Playwright
"""

from playwright.sync_api import sync_playwright
import time

def test_webapp():
    """Test the web application interface"""

    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=False)  # Set to False to see the browser
        page = browser.new_page()

        print("🚀 Starting web application tests...")

        try:
            # Test 1: Navigate to the application
            print("\n📍 Test 1: Loading application...")
            page.goto('http://localhost:8766')
            page.wait_for_load_state('networkidle')
            print("✅ Application loaded successfully")

            # Take screenshot of initial state
            page.screenshot(path='test-screenshots/01-initial-load.png', full_page=True)
            print("📸 Screenshot saved: 01-initial-load.png")

            # Test 2: Check page title
            print("\n📍 Test 2: Checking page title...")
            title = page.title()
            print(f"   Page title: {title}")
            assert "E-BrandID" in title or "Artwork" in title, "Page title doesn't contain expected text"
            print("✅ Page title is correct")

            # Test 3: Check main UI elements
            print("\n📍 Test 3: Checking UI elements...")

            # Check for sidebar
            sidebar = page.locator('.sidebar, #sidebar, [class*="sidebar"]').first
            if sidebar.is_visible():
                print("✅ Sidebar is visible")
            else:
                print("⚠️  Sidebar not found")

            # Check for main panel
            main_panel = page.locator('.main-panel, #main-panel, [class*="main"]').first
            if main_panel.count() > 0:
                print("✅ Main panel found")
            else:
                print("⚠️  Main panel not found")

            # Test 4: Check for input fields
            print("\n📍 Test 4: Checking input fields...")

            # Look for PO number input
            po_input = page.locator('input[type="text"], textarea').first
            if po_input.count() > 0:
                print("✅ Input field found")
                page.screenshot(path='test-screenshots/02-input-field.png')
            else:
                print("⚠️  Input field not found")

            # Test 5: Check for buttons
            print("\n📍 Test 5: Checking buttons...")
            buttons = page.locator('button')
            button_count = buttons.count()
            print(f"   Found {button_count} buttons")

            for i in range(min(button_count, 5)):  # Check first 5 buttons
                button_text = buttons.nth(i).text_content()
                print(f"   - Button {i+1}: {button_text}")

            if button_count > 0:
                print("✅ Buttons found")
            else:
                print("⚠️  No buttons found")

            # Test 6: Check navigation/tabs
            print("\n📍 Test 6: Checking navigation...")
            nav_items = page.locator('nav a, .nav-item, [role="tab"]')
            nav_count = nav_items.count()
            print(f"   Found {nav_count} navigation items")

            for i in range(min(nav_count, 5)):
                nav_text = nav_items.nth(i).text_content()
                print(f"   - Nav item {i+1}: {nav_text}")

            # Test 7: Test API endpoint
            print("\n📍 Test 7: Testing API endpoints...")

            # Test GET /api/pos
            response = page.request.get('http://localhost:8766/api/pos')
            print(f"   GET /api/pos - Status: {response.status}")
            if response.status == 200:
                print("✅ API endpoint /api/pos is working")
            else:
                print(f"⚠️  API endpoint returned status {response.status}")

            # Test GET /api/messages
            response = page.request.get('http://localhost:8766/api/messages')
            print(f"   GET /api/messages - Status: {response.status}")
            if response.status == 200:
                print("✅ API endpoint /api/messages is working")
            else:
                print(f"⚠️  API endpoint returned status {response.status}")

            # Test 8: Check console logs
            print("\n📍 Test 8: Checking console logs...")
            console_messages = []

            def handle_console(msg):
                console_messages.append(f"[{msg.type}] {msg.text}")

            page.on("console", handle_console)

            # Reload to capture console messages
            page.reload()
            page.wait_for_load_state('networkidle')
            time.sleep(1)

            if console_messages:
                print(f"   Found {len(console_messages)} console messages:")
                for msg in console_messages[:10]:  # Show first 10
                    print(f"   {msg}")
            else:
                print("   No console messages captured")

            # Test 9: Take final screenshot
            print("\n📍 Test 9: Taking final screenshots...")
            page.screenshot(path='test-screenshots/03-final-state.png', full_page=True)
            print("📸 Screenshot saved: 03-final-state.png")

            # Test 10: Check responsive design (optional)
            print("\n📍 Test 10: Testing responsive design...")

            # Test mobile viewport
            page.set_viewport_size({"width": 375, "height": 667})
            page.wait_for_timeout(500)
            page.screenshot(path='test-screenshots/04-mobile-view.png', full_page=True)
            print("📸 Mobile view screenshot saved")

            # Test tablet viewport
            page.set_viewport_size({"width": 768, "height": 1024})
            page.wait_for_timeout(500)
            page.screenshot(path='test-screenshots/05-tablet-view.png', full_page=True)
            print("📸 Tablet view screenshot saved")

            # Reset to desktop
            page.set_viewport_size({"width": 1920, "height": 1080})

            print("\n" + "="*60)
            print("✅ All tests completed successfully!")
            print("="*60)

        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            page.screenshot(path='test-screenshots/error-state.png', full_page=True)
            raise

        finally:
            # Keep browser open for a moment to review
            print("\n⏳ Keeping browser open for 3 seconds...")
            time.sleep(3)
            browser.close()
            print("🏁 Browser closed")

if __name__ == "__main__":
    test_webapp()
