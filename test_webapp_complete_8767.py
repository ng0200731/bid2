from playwright.sync_api import sync_playwright
import time
from pathlib import Path

# Create screenshots directory
screenshots_dir = Path("capture 20260130")
screenshots_dir.mkdir(exist_ok=True)

def wait_and_screenshot(page, name, delay=1000):
    """Wait for a moment and take a screenshot"""
    page.wait_for_timeout(delay)
    page.screenshot(path=str(screenshots_dir / f"{name}.png"), full_page=True)
    print(f"  [OK] Screenshot saved: {name}.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    print("=" * 60)
    print("Starting Web Application Test - Port 8767")
    print("=" * 60)

    # Navigate to the application
    print("\n1. Navigating to http://localhost:8767...")
    page.goto('http://localhost:8767')
    page.wait_for_load_state('networkidle')
    wait_and_screenshot(page, "01_initial_page", 2000)

    # Fetch PO with input "1307938"
    print("\n2. Fetching PO with input '1307938'...")
    try:
        po_input = page.locator('input[placeholder*="PO"], input[name*="po"], input[id*="po"]').first
        po_input.fill("1307938")
        wait_and_screenshot(page, "02_po_input_filled", 500)

        # Click Fetch PO Information button
        print("   Testing: Fetch PO Information")
        fetch_po_btn = page.get_by_role('button', name='Fetch PO Information')
        fetch_po_btn.click()
        wait_and_screenshot(page, "03_after_fetch_po", 2000)
    except Exception as e:
        print(f"   [ERROR] Error fetching PO: {e}")
        wait_and_screenshot(page, "03_error_fetch_po", 1000)

    # Fetch Artwork with input "1307938"
    print("\n3. Fetching Artwork with input '1307938'...")
    try:
        artwork_input = page.locator('input[placeholder*="artwork"], input[name*="artwork"], input[id*="artwork"]').first
        artwork_input.fill("1307938")
        wait_and_screenshot(page, "04_artwork_input_filled", 500)

        # Click Fetch Artwork button
        print("   Testing: Fetch Artwork")
        fetch_artwork_btn = page.get_by_role('button', name='Fetch Artwork')
        fetch_artwork_btn.click()
        wait_and_screenshot(page, "05_after_fetch_artwork", 2000)
    except Exception as e:
        print(f"   [ERROR] Error fetching artwork: {e}")
        wait_and_screenshot(page, "05_error_fetch_artwork", 1000)

    # Fetch Messages with date filter >2026/01/29
    print("\n4. Fetching Messages with date filter >2026/01/29...")
    try:
        date_input = page.locator('input[type="date"], input[placeholder*="date"], input[name*="date"]').first
        date_input.fill("2026-01-29")
        wait_and_screenshot(page, "06_date_input_filled", 500)

        # Click Fetch Messages button
        print("   Testing: Fetch Messages")
        fetch_messages_btn = page.get_by_role('button', name='Fetch Messages')
        fetch_messages_btn.click()
        wait_and_screenshot(page, "07_after_fetch_messages", 2000)
    except Exception as e:
        print(f"   [ERROR] Error fetching messages: {e}")
        wait_and_screenshot(page, "07_error_fetch_messages", 1000)

    # Test Search button
    print("\n5. Testing: Search")
    try:
        search_btn = page.get_by_role('button', name='Search')
        search_btn.click()
        wait_and_screenshot(page, "08_after_search", 1500)
    except Exception as e:
        print(f"   [ERROR] Error with Search: {e}")
        wait_and_screenshot(page, "08_error_search", 1000)

    # Test More (10 more) button
    print("\n6. Testing: More (10 more)")
    try:
        more_btn = page.get_by_role('button', name='More (10 more)')
        if more_btn.is_visible():
            more_btn.click()
            wait_and_screenshot(page, "09_after_more_10", 1500)
        else:
            print("   [WARN] More (10 more) button not visible")
            wait_and_screenshot(page, "09_more_10_not_visible", 1000)
    except Exception as e:
        print(f"   [ERROR] Error with More (10 more): {e}")
        wait_and_screenshot(page, "09_error_more_10", 1000)

    # Test All button
    print("\n7. Testing: All")
    try:
        all_btn = page.get_by_role('button', name='All')
        all_btn.click()
        wait_and_screenshot(page, "10_after_all", 1500)
    except Exception as e:
        print(f"   [ERROR] Error with All: {e}")
        wait_and_screenshot(page, "10_error_all", 1000)

    # Test View Details button
    print("\n8. Testing: View Details")
    try:
        view_details_btn = page.get_by_role('button', name='View Details')
        if view_details_btn.is_visible():
            view_details_btn.click()
            wait_and_screenshot(page, "11_after_view_details", 1500)
        else:
            print("   [WARN] View Details button not visible")
            wait_and_screenshot(page, "11_view_details_not_visible", 1000)
    except Exception as e:
        print(f"   [ERROR] Error with View Details: {e}")
        wait_and_screenshot(page, "11_error_view_details", 1000)

    # Test Load All Messages from Database button
    print("\n9. Testing: Load All Messages from Database")
    try:
        load_all_btn = page.get_by_role('button', name='Load All Messages from Database')
        load_all_btn.click()
        wait_and_screenshot(page, "12_after_load_all_messages", 2000)
    except Exception as e:
        print(f"   [ERROR] Error with Load All Messages: {e}")
        wait_and_screenshot(page, "12_error_load_all_messages", 1000)

    # Test Save Changes button
    print("\n10. Testing: Save Changes")
    try:
        save_changes_btn = page.get_by_role('button', name='Save Changes')
        save_changes_btn.click()
        wait_and_screenshot(page, "13_after_save_changes", 1500)
    except Exception as e:
        print(f"   [ERROR] Error with Save Changes: {e}")
        wait_and_screenshot(page, "13_error_save_changes", 1000)

    # Test Delete All button
    print("\n11. Testing: Delete All")
    try:
        delete_all_btn = page.get_by_role('button', name='Delete All')
        delete_all_btn.click()
        wait_and_screenshot(page, "14_after_delete_all", 1500)

        # Handle confirmation dialog if it appears
        page.wait_for_timeout(500)
        try:
            page.on("dialog", lambda dialog: dialog.accept())
        except:
            pass
    except Exception as e:
        print(f"   [ERROR] Error with Delete All: {e}")
        wait_and_screenshot(page, "14_error_delete_all", 1000)

    # Test Delete All Messages button
    print("\n12. Testing: Delete All Messages")
    try:
        delete_all_messages_btn = page.get_by_role('button', name='Delete All Messages')
        delete_all_messages_btn.click()
        wait_and_screenshot(page, "15_after_delete_all_messages", 1500)

        # Handle confirmation dialog if it appears
        page.wait_for_timeout(500)
        try:
            page.on("dialog", lambda dialog: dialog.accept())
        except:
            pass
    except Exception as e:
        print(f"   [ERROR] Error with Delete All Messages: {e}")
        wait_and_screenshot(page, "15_error_delete_all_messages", 1000)

    # Take final screenshot
    print("\n13. Taking final screenshot...")
    wait_and_screenshot(page, "16_final_state", 1000)

    print("\n" + "=" * 60)
    print("Test Complete!")
    print(f"All screenshots saved to: {screenshots_dir.absolute()}")
    print("=" * 60)

    # Keep browser open for a moment to review
    page.wait_for_timeout(2000)

    browser.close()
