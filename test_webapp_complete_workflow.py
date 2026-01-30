from playwright.sync_api import sync_playwright
from pathlib import Path

# Create screenshots directory
screenshots_dir = Path("capture 20260130")
screenshots_dir.mkdir(exist_ok=True)

def close_modal_if_present(page):
    """Close any modal overlays that might be blocking interactions"""
    try:
        modal_overlay = page.locator('#modal-overlay')
        if modal_overlay.is_visible():
            print("  [INFO] Modal overlay detected, attempting to close...")
            close_button = page.locator('#modal-overlay .close-btn, #modal-overlay button:has-text("Close"), #modal-overlay button:has-text("OK"), #modal-overlay button:has-text("Cancel")')
            if close_button.count() > 0:
                close_button.first.click()
                page.wait_for_timeout(500)
                print("  [OK] Modal closed")
    except:
        pass

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    print("="*60)
    print("Complete Workflow Automation")
    print("="*60)
    print("Navigating to http://localhost:8767...")
    page.goto('http://localhost:8767')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Take initial screenshot
    print("\nTaking initial screenshot...")
    page.screenshot(path=str(screenshots_dir / '001_initial.png'), full_page=True)
    screenshot_count = 2

    # Task 1: Fetch PO Information with input "1307938"
    print("\n" + "="*60)
    print("TASK 1: Fetch PO Information")
    print("="*60)

    try:
        # Navigate to Download section
        download_btn = page.get_by_role('button', name='Download')
        if download_btn.is_visible():
            print("Clicking 'Download' navigation button...")
            download_btn.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_download_section.png'), full_page=True)
            screenshot_count += 1

        # Find PO input field and enter "1307938"
        print("Looking for PO input field...")
        po_input = page.locator('input[type="text"], input[type="number"]').first
        if po_input.is_visible():
            print("Entering PO number: 1307938")
            po_input.fill('1307938')
            page.wait_for_timeout(500)
            page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_po_input_filled.png'), full_page=True)
            screenshot_count += 1

        # Click Fetch PO Information button
        print("Clicking 'Fetch PO Information' button...")
        fetch_po_btn = page.get_by_role('button', name='Fetch PO Information')
        fetch_po_btn.click()
        page.wait_for_timeout(3000)
        page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_after_fetch_po.png'), full_page=True)
        screenshot_count += 1
        print("[OK] Fetch PO Information completed")

        # Close modal if present
        close_modal_if_present(page)

    except Exception as e:
        print(f"[ERROR] Failed to fetch PO information: {e}")

    # Task 2: Fetch Artwork with input "1307938"
    print("\n" + "="*60)
    print("TASK 2: Fetch Artwork")
    print("="*60)

    try:
        # Make sure we're in Download section
        download_btn = page.get_by_role('button', name='Download')
        if download_btn.is_visible():
            download_btn.click()
            page.wait_for_timeout(2000)

        # Find all visible input fields in the Download section
        print("Looking for Artwork input field...")
        all_inputs = page.locator('input[type="text"], input[type="number"]').all()

        # Try to find the artwork input - it should be the second input in the Download section
        artwork_input = None
        visible_count = 0
        for inp in all_inputs:
            try:
                if inp.is_visible():
                    visible_count += 1
                    if visible_count == 2:  # Second visible input
                        artwork_input = inp
                        break
            except:
                continue

        if artwork_input:
            print("Entering artwork number: 1307938")
            artwork_input.fill('1307938')
            page.wait_for_timeout(500)
            page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_artwork_input_filled.png'), full_page=True)
            screenshot_count += 1

            # Click Fetch Artwork button
            print("Clicking 'Fetch Artwork' button...")
            fetch_artwork_btn = page.get_by_role('button', name='Fetch Artwork')
            fetch_artwork_btn.click()
            page.wait_for_timeout(3000)
            page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_after_fetch_artwork.png'), full_page=True)
            screenshot_count += 1
            print("[OK] Fetch Artwork completed")
        else:
            print("[ERROR] Could not find artwork input field")

        # Close modal if present
        close_modal_if_present(page)

    except Exception as e:
        print(f"[ERROR] Failed to fetch artwork: {e}")

    # Task 3: Fetch Messages with date filter >2026/01/29
    print("\n" + "="*60)
    print("TASK 3: Fetch Messages with Date Filter")
    print("="*60)

    try:
        # Navigate to Message section
        print("Clicking 'Message' navigation button...")
        message_btn = page.get_by_role('button', name='Message')
        message_btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_message_section.png'), full_page=True)
        screenshot_count += 1

        # Find date input field and enter "2026-01-29"
        print("Looking for date input field...")
        date_input = page.locator('input[type="date"], input[type="text"][placeholder*="date"], input[placeholder*="Date"]').first
        if date_input.is_visible():
            print("Entering date: 2026-01-29")
            date_input.fill('2026-01-29')
            page.wait_for_timeout(500)
            page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_date_input_filled.png'), full_page=True)
            screenshot_count += 1

        # Click Fetch Messages button
        print("Clicking 'Fetch Messages' button...")
        fetch_messages_btn = page.get_by_role('button', name='Fetch Messages')
        fetch_messages_btn.click()
        page.wait_for_timeout(3000)
        page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_after_fetch_messages.png'), full_page=True)
        screenshot_count += 1
        print("[OK] Fetch Messages completed")

        # Close modal if present
        close_modal_if_present(page)

    except Exception as e:
        print(f"[ERROR] Failed to fetch messages: {e}")

    # Take final screenshot
    print("\nTaking final screenshot...")
    page.screenshot(path=str(screenshots_dir / f'{screenshot_count:03d}_final.png'), full_page=True)

    print("\n" + "="*60)
    print("=== Workflow Complete ===")
    print(f"Screenshots saved to: {screenshots_dir.absolute()}")
    print("="*60)

    browser.close()
