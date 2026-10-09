/**
 * Checks if a string contains only ASCII / basic Latin characters (English)
 */
export function isEnglishOrLatin(text: string): boolean {
    if (!text || !text.trim()) return true;
    // Allows standard Latin letters, numbers, spaces, dots, dashes, apostrophes, parentheses
    return /^[\u0000-\u007F]+$/.test(text.trim());
}

export interface ClassifiedPlayerNames {
    first_name_local: string | null;
    middle_name_local: string | null;
    last_name_local: string | null;
    first_name_intl: string | null;
    middle_name_intl: string | null;
    last_name_intl: string | null;
}

/**
 * Smartly classify and distribute names into local and international fields.
 * If inputted in English from the start, local name fields remain null.
 * If inputted in a local language (Thai, Vietnamese, etc.), it goes to local name fields.
 */
export function classifyPlayerNames(params: {
    name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    first_name_local?: string | null;
    middle_name_local?: string | null;
    last_name_local?: string | null;
    first_name_intl?: string | null;
    middle_name_intl?: string | null;
    last_name_intl?: string | null;
    // Legacy support
    first_name_th?: string | null;
    middle_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    middle_name_en?: string | null;
    last_name_en?: string | null;
    firstNameTh?: string | null;
    middleNameTh?: string | null;
    lastNameTh?: string | null;
    firstNameEn?: string | null;
    middleNameEn?: string | null;
    lastNameEn?: string | null;
}): ClassifiedPlayerNames {
    let localFirst = params.first_name_local || params.first_name_th || params.firstNameTh || null;
    let localMiddle = params.middle_name_local || params.middle_name_th || params.middleNameTh || null;
    let localLast = params.last_name_local || params.last_name_th || params.lastNameTh || null;

    let intlFirst = params.first_name_intl || params.first_name_en || params.firstNameEn || null;
    let intlMiddle = params.middle_name_intl || params.middle_name_en || params.middleNameEn || null;
    let intlLast = params.last_name_intl || params.last_name_en || params.lastNameEn || null;

    // If explicit first/last name were passed generically
    const genFirst = params.first_name || null;
    const genMiddle = params.middle_name || null;
    const genLast = params.last_name || null;

    if (!localFirst && !intlFirst && genFirst) {
        if (isEnglishOrLatin(genFirst)) {
            intlFirst = genFirst;
            intlMiddle = genMiddle;
            intlLast = genLast;
        } else {
            localFirst = genFirst;
            localMiddle = genMiddle;
            localLast = genLast;
        }
    }

    // If only full name was passed (e.g. "สมชาย เข็มกลัด" or "John Doe")
    if (!localFirst && !intlFirst && params.name && params.name.trim()) {
        const parts = params.name.trim().split(/\s+/);
        const fName = parts[0];
        const lName = parts.length > 1 ? parts.slice(1).join(" ") : null;

        if (isEnglishOrLatin(params.name)) {
            intlFirst = fName;
            intlLast = lName;
        } else {
            localFirst = fName;
            localLast = lName;
        }
    }

    // Re-verify if what was entered in local field is actually pure English
    // If user typed English into the local field and intl is empty, move to intl
    if (localFirst && isEnglishOrLatin(localFirst) && (!localLast || isEnglishOrLatin(localLast)) && !intlFirst) {
        intlFirst = localFirst;
        intlMiddle = localMiddle;
        intlLast = localLast;
        localFirst = null;
        localMiddle = null;
        localLast = null;
    }

    return {
        first_name_local: localFirst ? localFirst.trim() : null,
        middle_name_local: localMiddle ? localMiddle.trim() : null,
        last_name_local: localLast ? localLast.trim() : null,
        first_name_intl: intlFirst ? intlFirst.trim() : null,
        middle_name_intl: intlMiddle ? intlMiddle.trim() : null,
        last_name_intl: intlLast ? intlLast.trim() : null,
    };
}

/**
 * Format a display name given a player with local and intl names
 */
export function formatPlayerDisplayName(
    player: {
        first_name_local?: string | null;
        last_name_local?: string | null;
        first_name_intl?: string | null;
        last_name_intl?: string | null;
        first_name_th?: string | null;
        last_name_th?: string | null;
        first_name_en?: string | null;
        last_name_en?: string | null;
        name?: string | null;
    },
    preferLocale: 'th' | 'en' | string = 'en'
): string {
    const localFirst = player.first_name_local || player.first_name_th;
    const localLast = player.last_name_local || player.last_name_th;
    const intlFirst = player.first_name_intl || player.first_name_en;
    const intlLast = player.last_name_intl || player.last_name_en;

    const localFull = [localFirst, localLast && localLast !== '-' ? localLast : null].filter(Boolean).join(" ").trim();
    const intlFull = [intlFirst, intlLast && intlLast !== '-' ? intlLast : null].filter(Boolean).join(" ").trim();

    if (preferLocale === 'th') {
        return localFull || intlFull || player.name || 'Unnamed Player';
    }
    return intlFull || localFull || player.name || 'Unnamed Player';
}
