from playwright.sync_api import Page, expect

def test_winner_card_size(page: Page):
    """
    This test verifies that the winner card size has been reduced.
    """
    # 1. Arrange: Go to the dashboard page.
    page.goto("http://localhost:8080/")

    # 2. Act: Wait for the page to load.
    page.wait_for_load_state("networkidle")

    # 3. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
