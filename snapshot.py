from playwright.sync_api import sync_playwright
import sys

# Get the URL from command line argument or use default
url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        page.goto(url, timeout=10000)
        page.wait_for_load_state('networkidle', timeout=10000)

        # Take screenshot
        page.screenshot(path='snapshot.png', full_page=True)
        print(f"Screenshot saved to snapshot.png")

        # Get page title
        title = page.title()
        print(f"\nPage Title: {title}")

        # Get all buttons
        buttons = page.locator('button').all()
        print(f"\nFound {len(buttons)} buttons:")
        for i, button in enumerate(buttons):
            text = button.inner_text()
            print(f"  {i+1}. {text}")

        # Get page content for inspection
        content = page.content()
        with open('snapshot.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\nHTML content saved to snapshot.html")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
