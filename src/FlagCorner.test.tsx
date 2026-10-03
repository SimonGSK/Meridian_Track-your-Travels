import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import FlagCorner from './FlagCorner'
import { countries } from './countries'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const flag = () => screen.queryByRole('img', { name: /^Flag of/ })

describe('FlagCorner', () => {
  it('shows the flag of the given country', () => {
    render(<FlagCorner country={byName('Denmark')} />)
    expect(flag()).toHaveAccessibleName('Flag of Denmark')
    expect(flag()).toHaveAttribute('src', expect.stringMatching(/dk\.svg/))
  })

  it('shows nothing without a country', () => {
    const { container } = render(<FlagCorner country={null} />)
    expect(flag()).not.toBeInTheDocument()
    expect(container.querySelector('.flag-visible')).not.toBeInTheDocument()
  })

  it('keeps the last flag in place while it fades out', () => {
    const { container, rerender } = render(<FlagCorner country={byName('Denmark')} />)
    rerender(<FlagCorner country={null} />)
    expect(container.querySelector('.flag-visible')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/dk\.svg/))
    expect(flag()).not.toBeInTheDocument() // hidden from assistive tech
  })

  it('switches flags when moving to another country', () => {
    const { rerender } = render(<FlagCorner country={byName('Denmark')} />)
    rerender(<FlagCorner country={byName('Japan')} />)
    expect(flag()).toHaveAccessibleName('Flag of Japan')
  })

  it('stays hidden for places without a flag', () => {
    const { container } = render(<FlagCorner country={byName('Siachen Glacier')} />)
    expect(container.querySelector('.flag-visible')).not.toBeInTheDocument()
  })
})
