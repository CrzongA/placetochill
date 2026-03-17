import { test, expect } from '@playwright/test';

test('should submit a place successfully', async ({ page }) => {
  // Listen for alerts
  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    // Check if the dialog is a success message or an error
    if (dialog.message().includes('successfully')) {
      await dialog.accept();
    } else {
      console.error(`Error dialog detected: ${dialog.message()}`);
      await dialog.dismiss();
    }
  });

  // 1. Navigate to submit/ page
  await page.goto('/submit/');

  // 2. Fill in a random place in Hong Kong
  const searchTerms = ['Central', 'Tsim Sha Tsui', 'Mong Kok', 'Causeway Bay', 'Lantau Island', 'Victoria Peak'];
  const randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const landmarkInput = page.getByLabel('Google Maps Landmark / Location Name *');
  await landmarkInput.fill(randomSearch);
  
  // Trigger search by clicking the search button
  const searchButton = page.getByRole('button', { name: 'Search landmark' });
  await expect(searchButton).toBeEnabled({ timeout: 10000 });
  await searchButton.click();

  // Wait for results or error
  const searchResults = page.getByTestId('search-results');
  const searchError = page.locator('div.bg-rose-500\\/10');

  // We wait for either the results to show up or an error message
  await Promise.race([
    searchResults.waitFor({ state: 'visible', timeout: 30000 }),
    searchError.waitFor({ state: 'visible', timeout: 30000 })
  ]).catch(() => {
    throw new Error('Neither search results nor search error appeared within timeout (30s).');
  });

  if (await searchError.isVisible()) {
    const errorMsg = await searchError.innerText();
    throw new Error(`Search failed: ${errorMsg}`);
  }

  // Select a random landmark suggested by google map api in the dropdown
  const suggestionButtons = searchResults.locator('button');
  const count = await suggestionButtons.count();
  if (count === 0) {
    throw new Error('Search results container appeared but no suggestion buttons found.');
  }
  
  const randomIndex = Math.floor(Math.random() * count);
  await suggestionButtons.nth(randomIndex).click();

  // 3. Choose a random tag
  const availableTags = ["咖啡廳", "游樂場", "餐廳", "安靜", "有wifi"];
  const randomTag = availableTags[Math.floor(Math.random() * availableTags.length)];
  await page.getByRole('button', { name: randomTag, exact: true }).click();

  // Fill in description (required)
  await page.locator('#description').fill('This is an automated test submission for a chill spot.');

  // 4. Click submit
  const submitButton = page.getByRole('button', { name: 'Submit Place for Approval' });
  await submitButton.click();

  // 5. Check for any errors
  // We can check if we navigated back to the home page or if there is a success breadcrumb/message
  // The form redirects to '/' on success after alert. 
  // We'll wait for the URL to be the homepage.
  await expect(page).toHaveURL('/', { timeout: 15000 });
  
  // Also check that there are no visible error messages in the form if we are still there
  if (page.url().includes('/submit')) {
    const errorBox = page.locator('div.bg-rose-500\\/10');
    if (await errorBox.isVisible()) {
      const errorText = await errorBox.innerText();
      throw new Error(`Submission failed with error: ${errorText}`);
    }
  }
});
