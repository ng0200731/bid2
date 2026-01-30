from playwright.sync_api import sync_playwright
from pathlib import Path

# Create screenshots directory
screenshots_dir = Path("screenshots_complete")
screenshots_dir.mkdir(exist_ok=True)

def close_modal_if_present(page):
    """Close any modal overlays that might be blocking interactions"""
    try:
        # Try to find and close modal overlay
        modal_overlay = page.locator('#modal-overlay')
        if modal_overlay.is_visible():
            print("  [INFO] Modal overlay detected, attempting to close...")
            # Try clicking outside the modal or finding a close button
            close_button = page.locator('#modal-overlay .close-btn, #modal-overlay button:has-text("Close"), #modal-overlay button:has-text("OK"), #modal-overlay button:has-text("Cancel")')
            if close_button.count() > 0:
                close_button.first.click()
                page.wait_for_timeout(500)
                print("  [OK] Modal closed via button")
            else:
                # Click on the overlay itself to close it
                modal_overlay.click(position={'x': 10, 'y': 10})
                page.wait_for_timeout(500)
                print("  [OK] Modal closed via overlay click")
    except Exception as e:
        pass  # No modal present or couldn't close it

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

    # Navigation buttons to explore different sections
    nav_buttons = ['Download', 'Order Status', 'Message', 'Profile']

    all_clicked_buttons = []
    screenshot_count = 1

    for nav_button_text in nav_buttons:
        print(f"\n{'='*60}")
        print(f"SECTION: '{nav_button_text}'")
        print('='*60)

        try:
            # Close any modal before navigating
            close_modal_if_present(page)

            # Click the navigation button
            nav_button = page.get_by_role('button', name=nav_button_text)
            if nav_button.is_visible():
                print(f"Clicking navigation button: {nav_button_text}")
                nav_button.click()
                page.wait_for_timeout(2000)
                page.wait_for_load_state('networkidle')

                # Take screenshot after navigation
                page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_{nav_button_text.replace(" ", "_")}_section.png'), full_page=True)
                screenshot_count += 1

                # Find all buttons in this section
                print(f"\nDiscovering buttons in '{nav_button_text}' section...")
                buttons = page.locator('button').all()

                visible_buttons = []
                for i, btn in enumerate(buttons):
                    try:
                        if btn.is_visible() and btn.is_enabled():
                            text = btn.inner_text(timeout=1000).strip()
                            if not text:
                                text = btn.get_attribute('value') or btn.get_attribute('aria-label') or f"Button_{i}"

                            # Skip navigation buttons
                            if text not in nav_buttons and text not in all_clicked_buttons:
                                visible_buttons.append({'text': text, 'element': btn})
                                print(f"  [OK] Found button: '{text}'")
                    except:
                        pass

                print(f"\nFound {len(visible_buttons)} clickable buttons in this section")

                # Click each button
                for btn_info in visible_buttons:
                    text = btn_info['text']
                    btn = btn_info['element']

                    # Close any modal before clicking
                    close_modal_if_present(page)

                    try:
                        print(f"\nClicking button: '{text}'")
                        btn.scroll_into_view_if_needed(timeout=5000)
                        page.wait_for_timeout(500)
                        btn.click(timeout=5000, force=True)  # Use force=True to bypass some blocking
                        all_clicked_buttons.append(text)

                        page.wait_for_timeout(2000)

                        # Take screenshot
                        safe_text = text[:30].replace(' ', '_').replace('/', '_').replace('\\', '_').replace(':', '_')
                        screenshot_name = f'{screenshot_count:03d}_after_{safe_text}.png'
                        page.screenshot(path=str(screenshots_dir / screenshot_name), full_page=True)
                        screenshot_count += 1
                        print(f"  [OK] Screenshot saved: {screenshot_name}")

                    except Exception as e:
                        print(f"  [ERROR] Failed to click '{text}': {str(e)[:100]}")

        except Exception as e:
            print(f"[ERROR] Failed to navigate to '{nav_button_text}': {str(e)[:100]}")

    # Final summary
    print("\n" + "="*60)
    print("=== Automation Complete ===")
    print(f"Total buttons clicked: {len(all_clicked_buttons)}")
    print(f"\nButtons clicked:")
    for btn_text in all_clicked_buttons:
        print(f"  - {btn_text}")
    print(f"\nScreenshots saved to: {screenshots_dir.absolute()}")
    print("="*60)

    browser.close()
