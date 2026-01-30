from playwright.sync_api import sync_playwright
import time
from pathlib import Path

# Create screenshots directory
screenshots_dir = Path("screenshots_full")
screenshots_dir.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to http://localhost:8766...")
    page.goto('http://localhost:8766')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Take initial screenshot
    print("Taking initial screenshot...")
    page.screenshot(path=str(screenshots_dir / '00_initial.png'), full_page=True)

    # Navigation buttons to click to reveal different sections
    nav_buttons = ['Download', 'Order Status', 'Message', 'Profile']

    all_clicked_buttons = []
    section_num = 1

    for nav_button_text in nav_buttons:
        print(f"\n{'='*60}")
        print(f"SECTION {section_num}: Navigating to '{nav_button_text}' section")
        print('='*60)

        try:
            # Click the navigation button
            nav_button = page.get_by_role('button', name=nav_button_text)
            if nav_button.is_visible():
                print(f"Clicking navigation button: {nav_button_text}")
                nav_button.click()
                page.wait_for_timeout(2000)
                page.wait_for_load_state('networkidle')

                # Take screenshot after navigation
                page.screenshot(path=str(screenshots_dir / f'{section_num:02d}_{nav_button_text.replace(" ", "_")}_section.png'), full_page=True)

                # Now find all buttons in this section
                print(f"\nDiscovering buttons in '{nav_button_text}' section...")
                buttons = page.locator('button').all()

                visible_buttons = []
                for i, btn in enumerate(buttons):
                    try:
                        if btn.is_visible() and btn.is_enabled():
                            text = btn.inner_text(timeout=1000).strip()
                            if not text:
                                text = btn.get_attribute('value') or btn.get_attribute('aria-label') or f"Button_{i}"

                            # Skip navigation buttons we already clicked
                            if text not in nav_buttons:
                                visible_buttons.append({'text': text, 'element': btn, 'index': i})
                                print(f"  [OK] Found button: '{text}'")
                    except:
                        pass

                print(f"\nFound {len(visible_buttons)} clickable buttons in this section")

                # Click each button in this section
                for btn_info in visible_buttons:
                    text = btn_info['text']
                    btn = btn_info['element']

                    if text in all_clicked_buttons:
                        print(f"\nSkipping '{text}' (already clicked)")
                        continue

                    try:
                        print(f"\nClicking button: '{text}'")
                        btn.scroll_into_view_if_needed(timeout=5000)
                        page.wait_for_timeout(500)
                        btn.click(timeout=5000)
                        all_clicked_buttons.append(text)

                        page.wait_for_timeout(2000)

                        # Take screenshot
                        safe_text = text[:30].replace(' ', '_').replace('/', '_').replace('\\', '_').replace(':', '_')
                        screenshot_name = f'{section_num:02d}_{nav_button_text.replace(" ", "_")}_after_{safe_text}.png'
                        page.screenshot(path=str(screenshots_dir / screenshot_name), full_page=True)
                        print(f"  [OK] Screenshot saved: {screenshot_name}")

                    except Exception as e:
                        print(f"  [ERROR] Failed to click '{text}': {e}")

                section_num += 1

        except Exception as e:
            print(f"[ERROR] Failed to navigate to '{nav_button_text}': {e}")

    # Final summary
    print("\n" + "="*60)
    print("=== Automation Complete ===")
    print(f"Total sections explored: {section_num - 1}")
    print(f"Total buttons clicked: {len(all_clicked_buttons)}")
    print(f"\nButtons clicked:")
    for btn_text in all_clicked_buttons:
        print(f"  - {btn_text}")
    print(f"\nScreenshots saved to: {screenshots_dir.absolute()}")
    print("="*60)

    browser.close()
