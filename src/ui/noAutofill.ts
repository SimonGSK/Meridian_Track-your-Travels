/**
 * For text boxes that aren't logins (searches, answers, notes), so password
 * managers (iCloud Passwords, 1Password, LastPass, Bitwarden, Dashlane) don't
 * pop up over the suggestions below them. Safari goes by the name: one with
 * "search" in it isn't taken for a username; the others have their own
 * markers. `name` says what the box is for: "city" → name="city-search".
 */
export const noAutofill = (name: string) =>
  ({
    name: `${name}-search`,
    autoComplete: 'off',
    'data-1p-ignore': true,
    'data-lpignore': 'true',
    'data-bwignore': true,
    'data-form-type': 'other',
  }) as const
