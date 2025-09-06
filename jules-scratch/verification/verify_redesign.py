import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Increase timeout
    page.set_default_timeout(10000)

    # Public pages
    page.goto("http://127.0.0.1:8080/")
    page.screenshot(path="jules-scratch/verification/index_page.png")

    page.goto("http://127.0.0.1:8080/login")
    page.screenshot(path="jules-scratch/verification/login_page.png")

    page.goto("http://127.0.0.1:8080/register")
    page.screenshot(path="jules-scratch/verification/register_page.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
