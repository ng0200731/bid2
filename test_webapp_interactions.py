from playwright.sync_api import sync_playwright
import time
from pathlib import Path

# Create screenshots directory
screenshots_dir = Path("screenshots")
screenshots_dir.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to http://localhost:8766...")
    page.goto('http://localhost:8766')
    page.wait_for_load_state('networkidle')

    # Take initial full page screenshot
    print("Taking initial full page screenshot...")
    page.screenshot(path=str(screenshots_dir / '01_initial_full_page.png'), full_page=True)

    # Discover all buttons
    print("\nDiscovering buttons...")
    buttons = page.locator('button').all()
    print(f"Found {len(buttons)} buttons")

    for i, button in enumerate(buttons):
        try:
            text = button.inner_text() or button.get_attribute('aria-label') or f"Button {i+1}"
            print(f"  - Button {i+1}: {text}")
        except:
            print(f"  - Button {i+1}: (unable to get text)")

    # Discover all links
    print("\nDiscovering links...")
    links = page.locator('a').all()
    print(f"Found {len(links)} links")

    for i, link in enumerate(links):
        try:
            text = link.inner_text() or link.get_attribute('href') or f"Link {i+1}"
            href = link.get_attribute('href')
            print(f"  - Link {i+1}: {text} (href: {href})")
        except:
            print(f"  - Link {i+1}: (unable to get text)")

    # Click each button and take screenshot
    print("\n--- Clicking buttons ---")
    for i, button in enumerate(buttons):
        try:
            text = button.inner_text() or button.get_attribute('aria-label') or f"Button {i+1}"
            print(f"\nClicking button {i+1}: {text}")

            button.click()
            page.wait_for_timeout(1000)  # Wait 1 second for any animations/changes

            screenshot_name = f"02_after_button_{i+1}_{text[:30].replace(' ', '_').replace('/', '_')}.png"
            page.screenshot(path=str(screenshots_dir / screenshot_name), full_page=True)
            print(f"  Screenshot saved: {screenshot_name}")

        except Exception as e:
            print(f"  Error clicking button {i+1}: {e}")

    # Click each link and take screenshot
    print("\n--- Clicking links ---")
    for i, link in enumerate(links):
        try:
            text = link.inner_text() or f"Link {i+1}"
            href = link.get_attribute('href')
            print(f"\nClicking link {i+1}: {text} (href: {href})")

            # Check if it's an external link or anchor
            if href and (href.startswith('http') or href.startswith('#')):
                print(f"  Skipping external/anchor link: {href}")
                continue

            link.click()
            page.wait_for_timeout(1000)  # Wait 1 second for navigation/changes
            page.wait_for_load_state('networkidle')

            screenshot_name = f"03_after_link_{i+1}_{text[:30].replace(' ', '_').replace('/', '_')}.png"
            page.screenshot(path=str(screenshots_dir / screenshot_name), full_page=True)
            print(f"  Screenshot saved: {screenshot_name}")

            # Go back to original page
            page.go_back()
            page.wait_for_load_state('networkidle')

        except Exception as e:
            print(f"  Error clicking link {i+1}: {e}")

    # Take final full page screenshot
    print("\nTaking final full page screenshot...")
    page.screenshot(path=str(screenshots_dir / '04_final_full_page.png'), full_page=True)

    print("\n=== Automation complete ===")
    print(f"All screenshots saved to: {screenshots_dir.absolute()}")

    browser.close()
