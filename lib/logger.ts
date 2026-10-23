// Centralized Logger sending structured logs directly to Grafana Loki (0฿ Free)

const LOKI_URL = process.env.LOKI_URL;
const LOKI_USER = process.env.LOKI_USER;
const LOKI_TOKEN = process.env.LOKI_TOKEN;

interface LogOptions {
    level?: 'info' | 'warn' | 'error';
    labels?: Record<string, string>;
    context?: Record<string, any>;
}

export async function logToLoki(message: string, options: LogOptions = {}) {
    const level = options.level || 'info';
    const consoleMsg = `[Loki:${level.toUpperCase()}] ${message}`;

    // Standard server console logging
    if (level === 'error') {
        console.error(consoleMsg, options.context || '');
    } else if (level === 'warn') {
        console.warn(consoleMsg, options.context || '');
    } else {
        console.log(consoleMsg, options.context || '');
    }

    // If Loki credentials are not set (e.g. local dev), skip remote push
    if (!LOKI_URL || !LOKI_USER || !LOKI_TOKEN) {
        return;
    }

    try {
        let pushUrl = LOKI_URL.replace(/\/$/, '');
        if (!pushUrl.endsWith('/loki/api/v1/push')) {
            pushUrl = `${pushUrl}/loki/api/v1/push`;
        }

        const authHeader = 'Basic ' + Buffer.from(`${LOKI_USER}:${LOKI_TOKEN}`).toString('base64');
        const nanoTime = (BigInt(Date.now()) * BigInt(1000000)).toString();

        const streamLabels = {
            app: 'tourni',
            env: 'production',
            source: 'frontend',
            level,
            ...(options.labels || {}),
        };

        const logLine = options.context 
            ? `${message} | context: ${JSON.stringify(options.context)}`
            : message;

        const payload = {
            streams: [
                {
                    stream: streamLabels,
                    values: [[nanoTime, logLine]],
                },
            ],
        };

        // Fire-and-forget asynchronous fetch
        fetch(pushUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            body: JSON.stringify(payload),
        }).catch((err) => {
            console.error('[Loki Logger Push Error]:', err);
        });
    } catch (err) {
        console.error('[Loki Logger Exception]:', err);
    }
}

export const logger = {
    info: (msg: string, opts?: Omit<LogOptions, 'level'>) => logToLoki(msg, { ...opts, level: 'info' }),
    warn: (msg: string, opts?: Omit<LogOptions, 'level'>) => logToLoki(msg, { ...opts, level: 'warn' }),
    error: (msg: string, opts?: Omit<LogOptions, 'level'>) => logToLoki(msg, { ...opts, level: 'error' }),
};
