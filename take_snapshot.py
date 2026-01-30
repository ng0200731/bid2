from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        # Navigate to the application
        page.goto('http://localhost:8766', timeout=10000)
        page.wait_for_load_state('networkidle', timeout=10000)

        # Take screenshot
        page.screenshot(path='current_snapshot.png', full_page=True)
        print("Screenshot saved to current_snapshot.png")

        # Get page title
        title = page.title()
        print(f"\nPage Title: {title}")

        # Get all buttons
        buttons = page.locator('button').all()
        print(f"\nFound {len(buttons)} buttons:")
        for i, button in enumerate(buttons):
            try:
                text = button.inner_text()
                is_visible = button.is_visible()
                print(f"  {i+1}. '{text}' (visible: {is_visible})")
            except:
                print(f"  {i+1}. [Could not get button text]")

        # Save HTML content
        content = page.content()
        with open('current_snapshot.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\nHTML content saved to current_snapshot.html")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
