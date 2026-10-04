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

/**
 * Points at a spot on a still globe, so the same country stays under the
 * pointer: grabbing the globe (here, a click in the space beside it) stops
 * the idle spin, and the test waits out the last of the drift. The top bar
 * shows where the globe looks.
 */
async function pointAt(page: Page, x: number, y: number) {
  await page.mouse.click(24, page.viewportSize()!.height / 2)
  await page.mouse.move(x, y)
  const readings: string[] = []
  await expect
    .poll(
      async () => {
        const where = await page.locator('.view-center').textContent()
        const what = await tooltip(page).textContent()
        readings.push(`${where} ${what}`)
        return readings.length >= 3 && readings.slice(-3).every((r) => r === readings.at(-1))
      },
      { intervals: [400], timeout: 20_000 },
    )
    .toBe(true)
}
const panel = (page: Page) => page.locator('aside.panel')

test.describe('mouse', () => {
  test('loads the globe without errors', async ({ page }) => {
    const { errors } = await openGlobe(page)
    await expect(page.getByRole('heading', { name: 'Meridian' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('hovering a country names it, clicking opens its panel', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)

    await pointAt(page, x, y)
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

    await pointAt(page, x, y)
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
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Add a country' }).fill('Denmark')
    await page.keyboard.press('Enter')
    const list = page.getByRole('list', { name: 'Visited countries' })
    await expect(list).toContainText('Denmark')

    await page.reload()
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await expect(list).toContainText('Denmark')
    await expect(page.getByLabel('Your atlas')).toContainText('1 / 197')
  })

  test('marking the clicked country as visited', async ({ page }) => {
    await openGlobe(page)
    const { x, y } = center(page)
    await pointAt(page, x, y)
    await expect(tooltip(page)).toBeVisible()
    await page.mouse.click(x, y)
    const name = (await panel(page).getByRole('heading', { level: 2 }).textContent())!

    await panel(page).getByRole('button', { name: 'Add to visited atlas' }).click()
    await expect(panel(page).getByRole('button', { name: 'In visited atlas' })).toHaveAttribute('aria-pressed', 'true')

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

    const statesLine = panel(page).getByRole('button', { name: /explored$/ })
    await statesLine.click()
    await panel(page).getByRole('checkbox', { name: 'Tasmania' }).check()
    await expect(statesLine).toHaveText('1 of 9 states and territories explored')
    await expect(panel(page).getByRole('button', { name: 'In visited atlas' })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Australia/ })).toContainText('1 of 9 states and territories')
    await page.getByRole('button', { name: /^Australia/ }).click()
    await statesLine.click()
    await expect(panel(page).getByRole('checkbox', { name: 'Tasmania' })).toBeChecked()
  })
})

test.describe('visited cities', () => {
  test('adding a city pins it and marks the country, and both stay after reloading', async ({ page }) => {
    const { errors } = await openGlobe(page)
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Add a country' }).fill('Japan')
    await page.getByRole('button', { name: /^Japan/ }).first().click()
    await page.getByRole('button', { name: /^Japan/ }).first().click() // show it
    await expect(panel(page).getByRole('heading', { name: 'Japan' })).toBeVisible()

    const addCity = panel(page).getByRole('searchbox', { name: 'Add a city' })
    await addCity.fill('Kyoto')
    await addCity.press('Enter')
    await addCity.fill('osa')
    await panel(page).getByRole('button', { name: 'Osaka' }).click()
    const visitedCities = panel(page).getByRole('list', { name: 'Visited cities' })
    await expect(visitedCities).toHaveText(/Kyoto.*Osaka|Osaka.*Kyoto/)
    await expect(panel(page).getByRole('button', { name: 'In visited atlas' })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Japan/ })).toContainText('2 cities')
    await page.getByRole('button', { name: /^Japan/ }).click()
    await expect(visitedCities).toContainText('Kyoto')
    // The pins' shader compiled and drew without complaints
    expect(errors).toEqual([])
  })
})

test.describe('flights', () => {
  test('adding a flight between airports draws it, and it stays after reloading', async ({ page }) => {
    const { errors } = await openGlobe(page)
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await page.getByRole('tab', { name: 'Flights' }).click()
    for (const [label, query] of [['From', 'copenhagen'], ['To', 'bkk']]) {
      await page.getByRole('searchbox', { name: label, exact: true }).fill(query)
      await page.getByRole('list', { name: `${label} airports` }).getByRole('button').first().click()
    }
    await page.getByRole('button', { name: 'Add flight' }).click()
    const flights = page.getByRole('list', { name: 'Flights' })
    await expect(flights).toContainText('Copenhagen → Bangkok')

    await page.reload()
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await page.getByRole('tab', { name: 'Flights' }).click()
    await expect(flights).toContainText('CPH → BKK')
    await flights.getByRole('button', { name: /^Copenhagen → Bangkok/ }).click()
    // The routes and their planes drew without complaints
    await page.waitForTimeout(1000)
    expect(errors).toEqual([])
  })
})

test.describe('screensaver', () => {
  test('shows just the globe, with the places the address brings', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    const places = Buffer.from(
      JSON.stringify({
        'countries-app.visited': JSON.stringify(['Denmark', 'Japan']),
        'countries-app.flights': JSON.stringify([{ id: 'a', from: 'CPH', to: 'HND' }]),
      }),
    ).toString('base64url')
    await page.goto(`/?screensaver#places=${places}`)
    await expect(page.getByTestId('globe')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByRole('navigation')).toHaveCount(0)
    await expect(page.getByRole('heading')).toHaveCount(0)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('countries-app.visited')!))).toEqual(['Denmark', 'Japan'])
    await page.waitForTimeout(1000)
    expect(errors).toEqual([])
  })
})

test.describe('explore', () => {
  test('layers switch off, and stay off after reloading', async ({ page }) => {
    await openGlobe(page)
    // Explore is open from the start on big screens, as a magnifying glass and a gear
    const gear = page.getByRole('button', { name: 'Design and layers' })
    const visitedSwitch = page.getByRole('switch', { name: /Visited countries/ })
    const markerSwitch = page.getByRole('switch', { name: /Small islands/ })
    const pinSwitch = page.getByRole('switch', { name: /City pins/ })
    await gear.click()
    await expect(visitedSwitch).toBeChecked()
    await visitedSwitch.click()
    await markerSwitch.click()
    await pinSwitch.click()

    await page.reload()
    await gear.click()
    await expect(visitedSwitch).not.toBeChecked()
    await expect(markerSwitch).not.toBeChecked()
    await expect(pinSwitch).not.toBeChecked()
  })

  test('the magnifying glass opens a search of the atlas, which shows the country found', async ({ page }) => {
    await openGlobe(page)
    await expect(page.getByRole('region', { name: /Games/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Search the atlas' }).click()
    const search = page.getByRole('searchbox', { name: 'Search the atlas' })
    await expect(search).toBeFocused()
    await search.fill('kyoto')
    await page.getByRole('button', { name: /^Kyoto/ }).click()
    await expect(panel(page).getByRole('heading', { name: 'Japan' })).toBeVisible()
    await expect(search).toHaveCount(0)
  })
})

test.describe('settings', () => {
  test('a backup downloaded and restored brings the places back', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    for (const name of ['Denmark', 'Japan']) {
      await page.getByRole('searchbox', { name: 'Add a country' }).fill(name)
      await page.keyboard.press('Enter')
    }
    await expect(page.getByText('2 visited')).toBeVisible()

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect(page.getByText('In this browser: 2 places.')).toBeVisible()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download backup' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^meridian-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const file = await download.path()

    // As in a new browser
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('0 visited')).toBeVisible()

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await page.getByLabel('Backup file').setInputFiles(file)
    await expect(page.getByRole('alertdialog')).toContainText('2 places')
    await page.getByRole('button', { name: 'Replace with this backup' }).click()
    // The page starts over with the backup
    await expect(page.getByText('2 visited')).toBeVisible()
    await page.getByRole('button', { name: 'Visited', exact: true }).click()
    await expect(page.getByRole('list', { name: 'Visited countries' })).toContainText('Japan')
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
    await page.getByRole('button', { name: 'Design', exact: true }).click()
    await page.getByRole('button', { name: /Night/ }).click()
    await expect(page.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
    await page.mouse.move(x, y)
    await expect.poll(async () => (await page.screenshot({ clip: globeArea })).equals(before)).toBe(false)

    await page.reload()
    await page.getByRole('button', { name: 'Design', exact: true }).click()
    await expect(page.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('games', () => {
  const feedback = (page: Page) => page.getByRole('status')

  test('find the country: clicking the globe answers the round', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    // Giving up is no perfect run, so its time sets no record
    await expect(page.getByText(/^Time \d+:\d\d\.\d\. Only perfect runs/)).toBeVisible()
    await expect(page.getByText(/^Kiribati, /)).toBeVisible()
  })

  test('all countries: 197 rounds, which can be stopped early', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    await page.getByRole('button', { name: 'Games', exact: true }).click()
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
    const sheet = page.getByRole('region', { name: 'Visited', exact: true })
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
