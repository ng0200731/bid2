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
    page.wait_for_timeout(2000)  # Extra wait for any dynamic content

    # Take initial full page screenshot
    print("Taking initial full page screenshot...")
    page.screenshot(path=str(screenshots_dir / '01_initial_full_page.png'), full_page=True)

    # Discover all buttons using multiple selectors
    print("\n=== Discovering all buttons ===")

    # Try multiple ways to find buttons
    button_selectors = [
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        '[role="button"]',
        'a.button',
        '.btn'
    ]

    all_buttons = []
    for selector in button_selectors:
        try:
            buttons = page.locator(selector).all()
            for btn in buttons:
                if btn not in all_buttons:
                    all_buttons.append(btn)
        except Exception as e:
            print(f"Error with selector {selector}: {e}")

    print(f"\nFound {len(all_buttons)} total buttons")

    # Print all button details
    button_info = []
    for i, button in enumerate(all_buttons):
        try:
            text = button.inner_text(timeout=1000).strip() if button.is_visible() else ""
            if not text:
                text = button.get_attribute('value') or button.get_attribute('aria-label') or button.get_attribute('title') or f"Button_{i+1}"

            is_visible = button.is_visible()
            is_enabled = button.is_enabled()

            button_info.append({
                'index': i + 1,
                'text': text,
                'visible': is_visible,
                'enabled': is_enabled,
                'element': button
            })

            status = "[OK]" if (is_visible and is_enabled) else "[--]"
            print(f"  {status} Button {i+1}: '{text}' (visible={is_visible}, enabled={is_enabled})")
        except Exception as e:
            print(f"  [--] Button {i+1}: Error getting info - {e}")
            button_info.append({
                'index': i + 1,
                'text': f"Button_{i+1}",
                'visible': False,
                'enabled': False,
                'element': button
            })

    # Click each visible and enabled button
    print("\n=== Clicking all buttons ===")
    clicked_count = 0

    for info in button_info:
        i = info['index']
        text = info['text']
        button = info['element']

        if not info['visible'] or not info['enabled']:
            print(f"\nSkipping button {i}: '{text}' (not visible or not enabled)")
            continue

        try:
            print(f"\n[{clicked_count + 1}] Clicking button {i}: '{text}'")

            # Scroll into view first
            button.scroll_into_view_if_needed()
            page.wait_for_timeout(500)

            # Click the button
            button.click(timeout=5000)
            clicked_count += 1

            # Wait for any changes
            page.wait_for_timeout(2000)

            # Take screenshot
            safe_text = text[:30].replace(' ', '_').replace('/', '_').replace('\\', '_').replace(':', '_')
            screenshot_name = f"02_after_button_{i:02d}_{safe_text}.png"
            page.screenshot(path=str(screenshots_dir / screenshot_name), full_page=True)
            print(f"  [OK] Screenshot saved: {screenshot_name}")

        except Exception as e:
            print(f"  [ERROR] Error clicking button {i} ('{text}'): {e}")

    # Discover and click all links
    print("\n=== Discovering all links ===")
    links = page.locator('a').all()
    print(f"Found {len(links)} links")

    link_info = []
    for i, link in enumerate(links):
        try:
            text = link.inner_text(timeout=1000).strip() if link.is_visible() else ""
            href = link.get_attribute('href') or ""
            is_visible = link.is_visible()

            if not text:
                text = href or f"Link_{i+1}"

            link_info.append({
                'index': i + 1,
                'text': text,
                'href': href,
                'visible': is_visible,
                'element': link
            })

            status = "[OK]" if is_visible else "[--]"
            print(f"  {status} Link {i+1}: '{text}' (href: {href})")
        except Exception as e:
            print(f"  [--] Link {i+1}: Error - {e}")

    # Click internal links only
    print("\n=== Clicking internal links ===")
    clicked_links = 0

    for info in link_info:
        i = info['index']
        text = info['text']
        href = info['href']
        link = info['element']

        # Skip external links, anchors, and javascript links
        if href and (href.startswith('http://') or href.startswith('https://') or
                     href.startswith('#') or href.startswith('javascript:')):
            print(f"\nSkipping link {i}: '{text}' (external/anchor/javascript)")
            continue

        if not info['visible']:
            print(f"\nSkipping link {i}: '{text}' (not visible)")
            continue

        try:
            print(f"\n[{clicked_links + 1}] Clicking link {i}: '{text}' (href: {href})")

            # Scroll into view
            link.scroll_into_view_if_needed()
            page.wait_for_timeout(500)

            # Click the link
            link.click(timeout=5000)
            clicked_links += 1

            # Wait for navigation/changes
            page.wait_for_timeout(2000)
            page.wait_for_load_state('networkidle')

            # Take screenshot
            safe_text = text[:30].replace(' ', '_').replace('/', '_').replace('\\', '_').replace(':', '_')
            screenshot_name = f"03_after_link_{i:02d}_{safe_text}.png"
            page.screenshot(path=str(screenshots_dir / screenshot_name), full_page=True)
            print(f"  [OK] Screenshot saved: {screenshot_name}")

            # Go back to original page
            page.go_back()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)

        except Exception as e:
            print(f"  [ERROR] Error clicking link {i} ('{text}'): {e}")

    # Take final screenshot
    print("\nTaking final full page screenshot...")
    page.screenshot(path=str(screenshots_dir / '04_final_full_page.png'), full_page=True)

    print("\n" + "="*60)
    print(f"=== Automation Complete ===")
    print(f"Total buttons found: {len(all_buttons)}")
    print(f"Buttons clicked: {clicked_count}")
    print(f"Total links found: {len(links)}")
    print(f"Links clicked: {clicked_links}")
    print(f"Screenshots saved to: {screenshots_dir.absolute()}")
    print("="*60)

    browser.close()
