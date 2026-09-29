import { expect, test, type Page } from '@playwright/test'

// These run against the real WebGL globe. The app starts looking at North
// Africa, so the middle of the screen is always over land on load.

async function openGlobe(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  await page.goto('/')
  await expect(page.locator('.globe canvas')).toBeVisible()
  await expect(page.getByTestId('globe')).toHaveAttribute('aria-busy', 'false')
  return { errors }
}

const center = (page: Page) => {
  const { width, height } = page.viewportSize()!
  return { x: width / 2, y: height / 2 }
}
const tooltip = (page: Page) => page.getByRole('tooltip')
const panel = (page: Page) => page.locator('aside.panel')

test.describe('mouse', () => {
  test('loads the globe without errors', async ({ page }) => {
    const { errors } = await openGlobe(page)
    await expect(page.getByRole('heading', { name: 'Countries of the World' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('hovering a country names it, clicking opens its panel', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)

    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    const name = (await tooltip(page).textContent())!.trim()
    expect(name.length).toBeGreaterThan(0)

    await page.mouse.click(x, y)
    await expect(panel(page)).toBeVisible()
    await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText(name)
  })

  test('the panel closes with the close button and with Escape', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)

    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    await page.mouse.click(x, y)
    await expect(panel(page)).toBeVisible()
    await panel(page).getByRole('button', { name: 'Close' }).click()
    await expect(panel(page)).toBeHidden()

    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    await page.mouse.click(x, y)
    await expect(panel(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel(page)).toBeHidden()
  })

  test('clicking empty space closes the panel', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)

    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    await page.mouse.click(x, y)
    await expect(panel(page)).toBeVisible()

    await page.mouse.click(8, page.viewportSize()!.height - 8) // corner, outside the globe
    await expect(panel(page)).toBeHidden()
  })

  test('dragging spins the globe without selecting a country', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)

    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    const before = await tooltip(page).textContent()

    await page.mouse.down()
    await page.mouse.move(x + 300, y, { steps: 15 })
    await page.mouse.up()
    await expect(panel(page)).toBeHidden()

    // A different part of the world is now under the pointer
    await page.mouse.move(x, y)
    await expect(async () => {
      const hidden = await tooltip(page).isHidden()
      expect(hidden || (await tooltip(page).textContent()) !== before).toBe(true)
    }).toPass()
  })
})

test.describe('touch', { tag: '@touch' }, () => {
  test('tapping a country opens its panel', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)
    await page.touchscreen.tap(x, y)
    await expect(panel(page)).toBeVisible()
    await expect(panel(page).getByRole('heading', { level: 2 })).not.toBeEmpty()
    await expect(tooltip(page)).toBeHidden()
  })
})
