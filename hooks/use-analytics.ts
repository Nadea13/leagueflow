'use client';

import { usePathname } from 'next/navigation';
import { trackEvent } from '@/actions/common/analytics';
import { useEffect } from 'react';

export function useAnalytics() {
    const pathname = usePathname();

    const trackClick = async (featureName: string, targetType: string = 'ui_element', details?: Record<string, unknown>) => {
        try {
            await trackEvent('FEATURE_CLICK', targetType, featureName, {
                ...details,
                pathname
            });
        } catch (error) {
            console.error('Analytics tracking failed', error);
        }
    };

    const trackAction = async (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => {
        try {
            await trackEvent(action, targetType, targetId, {
                ...details,
                pathname
            });
        } catch (error) {
            console.error('Analytics tracking failed', error);
        }
    };

    return {
        trackClick,
        trackAction,
        pathname
    };
}

/**
 * A simple component to drop into a layout or page to automatically track page views.
 */
export function PageViewTracker({ pageName }: { pageName?: string }) {
    const pathname = usePathname();

    useEffect(() => {
        trackEvent('PAGE_VIEW', 'page', pageName || pathname, { pathname });
    }, [pathname, pageName]);

    return null;
}
