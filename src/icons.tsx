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

export const GlobeIcon = ({ size = 24 }: Props) =>
  svg(
    size,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </>,
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
