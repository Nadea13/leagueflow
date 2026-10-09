// Zero-dependency Standalone Mock Client (Supabase package removed)
/* eslint-disable @typescript-eslint/no-unused-vars */

export interface SupabaseQueryResult<T = any> {
    data: T | null;
    error: any;
    count?: number | null;
}

export class QueryChain<T = any> {
    private _data: any = [];

    select(..._args: any[]): this { return this; }
    insert(..._args: any[]): this { return this; }
    update(..._args: any[]): this { return this; }
    delete(..._args: any[]): this { return this; }
    upsert(..._args: any[]): this { return this; }
    eq(..._args: any[]): this { return this; }
    neq(..._args: any[]): this { return this; }
    not(..._args: any[]): this { return this; }
    in(..._args: any[]): this { return this; }
    is(..._args: any[]): this { return this; }
    or(..._args: any[]): this { return this; }
    and(..._args: any[]): this { return this; }
    ilike(..._args: any[]): this { return this; }
    like(..._args: any[]): this { return this; }
    gt(..._args: any[]): this { return this; }
    gte(..._args: any[]): this { return this; }
    lt(..._args: any[]): this { return this; }
    lte(..._args: any[]): this { return this; }
    order(..._args: any[]): this { return this; }
    limit(..._args: any[]): this { return this; }
    range(..._args: any[]): this { return this; }
    single(): Promise<{ data: any; error: any }> { return Promise.resolve({ data: {} as any, error: null }); }
    maybeSingle(): Promise<{ data: any; error: any }> { return Promise.resolve({ data: {} as any, error: null }); }
    then<TResult1 = any, TResult2 = never>(
        onfulfilled?: ((value: { data: any[]; error: any; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return Promise.resolve({ data: [] as any[], error: null, count: 0 }).then(onfulfilled, onrejected);
    }
}

export class StandaloneClient {
    auth: any = {
        getUser: async (): Promise<{ data: { user: any }; error: any }> => ({ data: { user: { id: '', email: '', user_metadata: {} } as any }, error: null }),
        getSession: async (): Promise<{ data: { session: any }; error: any }> => ({ data: { session: null as any }, error: null }),
        signInWithOAuth: async (..._args: any[]): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
        signInWithPassword: async (..._args: any[]): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
        signInWithOtp: async (..._args: any[]): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
        verifyOtp: async (..._args: any[]): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
        resetPasswordForEmail: async (..._args: any[]): Promise<{ data: any; error: any }> => ({ data: null, error: null }),
        signOut: async (): Promise<{ error: any }> => ({ error: null }),
        updateUser: async (..._args: any[]): Promise<{ data: { user: any }; error: any }> => ({ data: { user: null as any }, error: null }),
        onAuthStateChange: (callback?: (event: any, session: any) => void) => {
            if (callback) callback('INITIAL_SESSION', null);
            return { data: { subscription: { unsubscribe: () => {} } } };
        },
        admin: {
            listUsers: async (..._args: any[]) => ({ data: { users: [] as any[] }, error: null }),
            deleteUser: async (..._args: any[]) => ({ data: null, error: null }),
            createUser: async (..._args: any[]) => ({ data: null, error: null }),
        }
    };

    storage: any = {
        from: (_bucket: string) => ({
            upload: async () => ({ data: null, error: null }),
            download: async () => ({ data: null, error: null }),
            remove: async () => ({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
            list: async () => ({ data: [], error: null }),
        })
    };

    from(_table: string): QueryChain<any> {
        return new QueryChain<any>();
    }

    channel(_name: string) {
        const chan: {
            on(type: string, filter: any, callback: (payload: any) => void): typeof chan;
            on(type: string, callback: (payload: any) => void): typeof chan;
            subscribe(callback?: (status: any, err?: any) => void): typeof chan;
            unsubscribe(): void;
            send(...args: any[]): void;
            track(...args: any[]): Promise<string>;
            untrack(...args: any[]): Promise<string>;
            presenceState(): Record<string, any>;
        } = {
            on: function(_event: string, _optsOrCb: any, _cb?: any) { return chan; },
            subscribe: function(callback?: (status: any, err?: any) => void) {
                if (callback) callback('SUBSCRIBED');
                return chan;
            },
            unsubscribe: function() {},
            send: function(..._args: any[]) {},
            track: async function(..._args: any[]) { return 'ok'; },
            untrack: async function(..._args: any[]) { return 'ok'; },
            presenceState: function() { return {}; },
        };
        return chan;
    }

    removeChannel(_channel: any) {}
}

export type SupabaseClient = StandaloneClient;

export function createClient(): StandaloneClient {
    return new StandaloneClient();
}

export function createBrowserClient(): StandaloneClient {
    return new StandaloneClient();
}
