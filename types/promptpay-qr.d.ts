declare module 'promptpay-qr' {
    interface Options {
        amount?: number;
    }
    function generatePayload(id: string, options?: Options): string;
    export = generatePayload;
}
