from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    logs = []
    page.on("console", lambda msg: logs.append(msg.text))

    try:
        page.goto("http://localhost:8080/login", timeout=60000)
        page.wait_for_load_state('networkidle', timeout=30000)

        page.get_by_placeholder("you@email.com").fill("loxserviceng@gmail.com")
        page.get_by_placeholder("••••••••").fill("11223344")
        page.get_by_role("button", name="Sign In").click()

        page.wait_for_url("http://localhost:8080/dashboard", timeout=30000)
        time.sleep(10) # Wait for data to load
        page.wait_for_selector('.h-\\[60vh\\]')
        page.screenshot(path="jules-scratch/verification/winner-slider-verification.png")
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"Error during verification: {e}")
        print("Page content:", page.content())
    finally:
        print("Console logs:", logs)
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
