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

  test('hovering a country shows its flag in the corner', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)
    const flag = page.getByRole('img', { name: /^Flag of/ })

    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    const name = (await tooltip(page).textContent())!.trim()
    await expect(flag).toHaveAccessibleName(`Flag of ${name}`)
    await expect(flag).toBeInViewport()
    // The SVG actually loaded
    await expect.poll(() => flag.evaluate((img) => (img as { naturalWidth: number }).naturalWidth)).toBeGreaterThan(0)

    const box = (await flag.boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.x).toBeGreaterThan(viewport.width / 2)
    expect(box.y).toBeGreaterThan(viewport.height / 2)

    await page.mouse.move(8, 8) // outer space
    await expect(flag).toBeHidden()
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

    const viewport = page.viewportSize()!
    await page.mouse.click(viewport.width - 8, viewport.height - 8) // corner, outside the globe
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

test.describe('visited', () => {
  test('adding a visited country keeps it after reloading', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Visited' }).click()
    await page.getByRole('searchbox', { name: 'Add a country' }).fill('Denmark')
    await page.keyboard.press('Enter')
    const list = page.getByRole('list', { name: 'Visited countries' })
    await expect(list).toContainText('Denmark')

    await page.reload()
    await page.getByRole('button', { name: 'Visited' }).click()
    await expect(list).toContainText('Denmark')
    await expect(page.getByText('1 of 197 countries')).toBeVisible()
  })

  test('marking the clicked country as visited', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)
    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()
    await page.mouse.click(x, y)
    const name = (await panel(page).getByRole('heading', { level: 2 }).textContent())!

    await panel(page).getByRole('button', { name: 'Mark as visited' }).click()
    await expect(panel(page).getByRole('button', { name: 'Visited' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Visited', exact: true }).first().click()
    await expect(page.getByRole('list', { name: 'Visited countries' })).toContainText(name)
  })
})

test.describe('visited states', () => {
  test('ticking a state marks the country too, and both stay after reloading', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Add a country' }).fill('Australia')
    await page.getByRole('button', { name: /^Australia/ }).first().click()
    await page.getByRole('button', { name: /^Australia/ }).first().click() // show it
    await expect(panel(page).getByRole('heading', { name: 'Australia' })).toBeVisible()

    await panel(page).getByRole('checkbox', { name: 'Tasmania' }).check()
    await expect(panel(page).getByText('of 9 visited')).toContainText('1 of 9')

    await page.reload()
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Australia/ })).toContainText('1 of 9 states and territories')
    await page.getByRole('button', { name: /^Australia/ }).click()
    await expect(panel(page).getByRole('checkbox', { name: 'Tasmania' })).toBeChecked()
  })
})

test.describe('explore', () => {
  test('settings switch visited countries and markers off, and stay off after reloading', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Explore' }).click()
    const visitedSwitch = page.getByRole('switch', { name: /Visited countries/ })
    const markerSwitch = page.getByRole('switch', { name: /Island markers/ })
    await expect(visitedSwitch).toBeChecked()
    await visitedSwitch.uncheck()
    await markerSwitch.uncheck()

    await page.reload()
    await page.getByRole('button', { name: 'Explore' }).click()
    await expect(visitedSwitch).not.toBeChecked()
    await expect(markerSwitch).not.toBeChecked()
  })
})

test.describe('design', () => {
  test('switching design repaints the globe and is remembered', async ({ page }) => {
    test.slow() // compares screenshots of the software-rendered globe
    await openGlobe(page)
    const { x, y } = center(page)
    const globeArea = { x: x - 150, y: y - 150, width: 300, height: 300 }
    // Hold the pointer still over the globe so the spin pauses between shots
    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeVisible()

    const before = await page.screenshot({ clip: globeArea })
    await page.getByRole('button', { name: 'Design' }).click()
    await page.getByRole('button', { name: /Night/ }).click()
    await expect(page.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Close panel' }).click()
    await page.mouse.move(x, y)
    await expect.poll(async () => (await page.screenshot({ clip: globeArea })).equals(before)).toBe(false)

    await page.reload()
    await page.getByRole('button', { name: 'Design' }).click()
    await expect(page.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('games', () => {
  const feedback = (page: Page) => page.getByRole('status')

  test('find the country: clicking the globe answers the round', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Find the country/ }).click()
    await page.getByRole('button', { name: /^Easy/ }).click()
    await expect(page.getByText('Round 1 of 10')).toBeVisible()

    // The middle of the globe, which sits beside the side panel
    const box = (await page.locator('.globe canvas').boundingBox())!
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await expect(tooltip(page)).toBeHidden() // no giveaways
    await page.mouse.click(x, y)
    // Right away, or a miss with two tries left
    await expect(feedback(page)).toHaveText(/Correct! \+3 points|Try again: 2 tries left/)
    await expect(panel(page)).toBeHidden()
  })

  test('flag quiz: picking a country gives feedback', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Flag quiz/ }).click()
    await page.getByRole('button', { name: /^Easy/ }).click()
    const flag = page.getByRole('img', { name: 'The flag to identify' })
    await expect.poll(() => flag.evaluate((img) => (img as { naturalWidth: number }).naturalWidth)).toBeGreaterThan(0)

    await page.locator('.option').first().click()
    await expect(feedback(page)).toHaveText(/Correct!|The answer is/)
    await expect(page.locator('.option.correct')).toHaveCount(1)
  })

  test('letter hunt: clicking the globe checks the letter', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Letter hunt/ }).click()
    await page.getByRole('button', { name: /^K:/ }).click()
    await expect(page.getByText('Found 0 of 6')).toBeVisible()

    const box = (await page.locator('.globe canvas').boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(feedback(page)).toHaveText(/✓|doesn't start with|territory/)

    await page.getByRole('button', { name: 'Give up and show the rest' }).click()
    await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
    await page.getByRole('button', { name: 'Another letter' }).click()
    await expect(page.getByRole('button', { name: /^K:/ })).toContainText(/K\d\/6/)
  })

  test('shape quiz on medium: type an answer', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Shape quiz/ }).click()
    await page.getByRole('button', { name: /^Medium/ }).click()
    await expect(page.getByRole('img', { name: 'The outline to identify' })).toBeVisible()

    const input = page.getByRole('textbox', { name: 'Your answer' })
    await expect(input).toBeFocused()
    await input.fill('Swaziland')
    await expect(page.getByRole('option')).toHaveCount(0) // no suggestions
    await input.press('Enter')
    await expect(feedback(page)).toHaveText(/Correct|The answer is/)
    await expect(page.getByRole('button', { name: 'Next' })).toBeFocused()
  })

  test('name them all: type countries until giving up', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Name them all/ }).click()
    await page.getByRole('button', { name: /^Oceania/ }).click()
    const input = page.getByRole('textbox', { name: 'Name a country' })
    await expect(input).toBeFocused()
    for (const name of ['Australia', 'New Zealand', 'fiji']) {
      await input.fill(name)
      await input.press('Enter')
    }
    await expect(page.getByText('3 / 14')).toBeVisible()
    await page.getByRole('button', { name: 'Give up and show the rest' }).click()
    await expect(page.getByText(/countries named in \d+:\d\d/)).toBeVisible()
    await expect(page.getByText(/^Kiribati, /)).toBeVisible()
  })

  test('all countries: 197 rounds, which can be stopped early', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Flag quiz/ }).click()
    await page.getByRole('button', { name: /^All countries/ }).click()
    await expect(page.getByText('Round 1 of 197')).toBeVisible()
    const input = page.getByRole('textbox', { name: 'Your answer' })
    await input.fill('Denmark')
    await input.press('Enter')
    await expect(feedback(page)).toHaveText(/Correct|The answer is/)
    await page.getByRole('button', { name: 'Stop and see results' }).click()
    await expect(page.getByText('Stopped after 1 of 197 countries')).toBeVisible()
  })

  test('name that country: can be played to the end', async ({ page }) => {
    test.slow() // ten rounds, each with a camera flight
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games' }).click()
    await page.getByRole('button', { name: /Name that country/ }).click()
    await page.getByRole('button', { name: /^Easy/ }).click()
    for (let round = 1; round <= 10; round++) {
      await expect(page.getByText(`Round ${round} of 10`)).toBeVisible()
      await page.locator('.option').first().click()
      await page.getByRole('button', { name: round < 10 ? 'Next' : 'See results' }).click()
    }
    await expect(page.getByText(/^\d+ \/ 10$/)).toBeVisible()
    await page.getByRole('button', { name: 'All games' }).click()
    await page.getByRole('button', { name: /Name that country/ }).click()
    await expect(page.getByRole('button', { name: /^Easy/ })).toContainText('Best:')
  })
})

test.describe('touch', { tag: '@touch' }, () => {
  test('the menu is a tab bar and panels open as bottom sheets', async ({ page }) => {
    await openGlobe(page)
    const viewport = page.viewportSize()!
    const nav = (await page.getByRole('navigation', { name: 'Main' }).boundingBox())!
    expect(nav.y + nav.height).toBeCloseTo(viewport.height, 0)
    expect(nav.width).toBeCloseTo(viewport.width, 0)

    await page.getByRole('button', { name: 'Visited' }).tap()
    const sheet = page.getByRole('region', { name: 'Visited' })
    // Let it finish sliding in before measuring
    await sheet.evaluate((el) =>
      Promise.all((el as unknown as { getAnimations(): { finished: Promise<unknown> }[] }).getAnimations().map((a) => a.finished)),
    )
    const box = (await sheet.boundingBox())!
    expect(box.width).toBeCloseTo(viewport.width, 0)
    expect(box.y + box.height).toBeCloseTo(nav.y, 0)
  })

  test('tapping a country opens its panel', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)
    await page.touchscreen.tap(x, y)
    await expect(panel(page)).toBeVisible()
    await expect(panel(page).getByRole('heading', { level: 2 })).not.toBeEmpty()
    await expect(tooltip(page)).toBeHidden()
  })
})
