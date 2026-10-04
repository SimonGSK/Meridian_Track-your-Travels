// Small inline icons, drawn with the current text color

type Props = { size?: number }

const svg = (size: number, children: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const PinIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
      <path d="m9.2 9.6 2 2 3.6-3.8" />
    </>,
  )

export const GamepadIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <path d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.4a2.6 2.6 0 0 1-4.5 1.2L14.5 15h-5l-2.2 2.6a2.6 2.6 0 0 1-4.5-1.2L2.1 13A5 5 0 0 1 7 7z" />
      <path d="M8 10v3M6.5 11.5h3M15.5 11h.01M17.5 12.5h.01" />
    </>,
  )

export const PaletteIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8.1-9-8.1z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
    </>,
  )

export const CheckIcon = ({ size = 16 }: Props) => svg(size, <path d="m5 12.5 4.5 4.5L19 7.5" />)

export const CompassIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>,
  )

export const EyeIcon = ({ size = 18 }: Props) =>
  svg(
    size,
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>,
  )

export const EyeOffIcon = ({ size = 18 }: Props) =>
  svg(
    size,
    <>
      <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.3 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
      <path d="M9.9 10a2.8 2.8 0 0 0 4 4M3.5 3.5l17 17" />
    </>,
  )

export const SearchIcon = ({ size = 18 }: Props) =>
  svg(
    size,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>,
  )

export const PlusIcon = ({ size = 16 }: Props) => svg(size, <path d="M12 5v14M5 12h14" />)

export const CloseIcon = ({ size = 16 }: Props) => svg(size, <path d="m6 6 12 12M18 6 6 18" />)

export const TrophyIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 6h2.5a1.5 1.5 0 0 1 1.5 1.5c0 2.2-1.8 4-4 4M7 6H4.5A1.5 1.5 0 0 0 3 7.5c0 2.2 1.8 4 4 4" />
    </>,
  )

export const LayersIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 12.5 9 5 9-5" />
      <path d="m3 16.5 9 5 9-5" />
    </>,
  )

export const GearIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  )
