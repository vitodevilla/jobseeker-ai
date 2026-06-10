export const APP_DISPLAY_TIME_ZONE = "Europe/Zagreb"

const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_DISPLAY_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
})

const displayDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_DISPLAY_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function toDisplayDate(date: Date | string | null | undefined) {
  if (!date) {
    return null
  }

  const parsedDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export function formatDisplayDate(date: Date | string | null | undefined) {
  const parsedDate = toDisplayDate(date)

  return parsedDate ? displayDateFormatter.format(parsedDate) : "Not set"
}

export function formatDisplayDateTime(date: Date | string | null | undefined) {
  const parsedDate = toDisplayDate(date)

  return parsedDate ? displayDateTimeFormatter.format(parsedDate) : "Not set"
}
