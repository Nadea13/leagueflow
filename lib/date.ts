import { format as dateFnsFormat } from "date-fns";
import { th, enUS } from "date-fns/locale";

/**
 * Formats a date string, number, or Date object into a localized string.
 * Supports Thai Buddhist Era (BE) automatically when locale is 'th'.
 * 
 * @param date The date to format
 * @param formatStr The format string (date-fns format). Default: "d MMMM yyyy"
 * @param locale The locale code (e.g., 'en', 'th')
 * @returns The formatted date string
 */
export function formatDate(
    date: Date | string | number | null | undefined,
    formatStr: string = "d MMMM yyyy",
    locale: string = "en"
): string {
    if (!date) return "";

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    // If Thai locale, use Intl.DateTimeFormat for Buddhist Year support
    // date-fns doesn't natively support Buddhist calendar types easily without plugins
    if (locale === 'th') {
        const options: Intl.DateTimeFormatOptions = {};

        // Map date-fns format tokens to Intl options (Approximate mapping)
        // This is a basic mapping for common patterns used in the app
        if (formatStr.includes("d") && formatStr.includes("MMM") && formatStr.includes("yyyy")) {
            // "d MMMM yyyy" or similar
            options.day = "numeric";
            options.month = formatStr.includes("MMMM") ? "long" : "short";
            options.year = "numeric";
        } else if (formatStr.includes("HH:mm")) {
            // Includes time
            options.day = "numeric";
            options.month = formatStr.includes("MMMM") ? "long" : "short";
            options.year = "numeric";
            options.hour = "2-digit";
            options.minute = "2-digit";
            options.hour12 = false;
        }

        // Custom override for specific format requirements if needed, 
        // but generally we want "d MMMM yyyy" (5 กุมภาพันธ์ 2569)

        // If the format is strictly simple date
        if (formatStr === "d MMMM yyyy" || formatStr === "d MMM yyyy") {
            return new Intl.DateTimeFormat('th-TH', {
                year: 'numeric',
                month: formatStr === "d MMMM yyyy" ? 'long' : 'short',
                day: 'numeric',
                calendar: 'buddhist'
            }).format(dateObj);
        }

        // If format includes time
        if (formatStr.includes("HH:mm")) {
            return new Intl.DateTimeFormat('th-TH', {
                year: 'numeric',
                month: formatStr.includes("MMMM") ? 'long' : 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                calendar: 'buddhist'
            }).format(dateObj);
        }
    }

    // Fallback to date-fns for English or non-Thai (Gregorian)
    return dateFnsFormat(dateObj, formatStr, {
        locale: locale === 'th' ? th : enUS // date-fns 'th' is still Gregorian usually unless configured, so we rely on Intl above for year
    });
}
