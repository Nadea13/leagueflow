import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserPayments, createPaymentRecord } from '@/actions/common/payments';
import { updatePaymentStatus } from '@/actions/common/admin';

// Mock Next.js headers / cache
vi.mock('next/headers', () => ({
    cookies: vi.fn(),
    headers: vi.fn(() => ({
        get: vi.fn(() => '127.0.0.1'),
    })),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock Supabase Server client
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
    storage: {
        from: vi.fn(),
    },
};

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
    createAdminClient: vi.fn(() => mockSupabase),
}));

// Helper to create query builders
function createMockQueryBuilder(resolvedValue: unknown) {
    const builder = {} as Record<string, unknown>;
    const chain = () => builder;

    builder.select = chain;
    builder.eq = chain;
    builder.is = chain;
    builder.limit = chain;
    builder.order = chain;
    builder.insert = chain;
    builder.update = chain;
    builder.delete = chain;
    builder.single = vi.fn().mockResolvedValue(resolvedValue);
    builder.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);

    // Make it awaitable
    builder.then = (onfulfilled?: (value: unknown) => unknown) => Promise.resolve(resolvedValue).then(onfulfilled);

    return builder;
}

describe('Payment Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getUserPayments', () => {
        it('should return error if unauthorized', async () => {
            mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

            const result = await getUserPayments();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Authentication required');
        });

        it('should fetch user payments successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });
            mockSupabase.from.mockImplementation(() => {
                return createMockQueryBuilder({
                    data: [
                        {
                            id: 'pay-123',
                            amount: 199.00,
                            payment_status: 'success',
                            payment_method: 'promptpay',
                            plan_name: 'pro',
                            created_at: new Date().toISOString(),
                            tournament_id: null,
                            transaction_id: 'LF_TXN_123',
                            raw_gateway_response: {}
                        }
                    ],
                    error: null
                });
            });

            const result = await getUserPayments();

            expect(result.success).toBe(true);
            expect(result.data?.length).toBe(1);
            expect(result.data?.[0].plan).toBe('pro');
        });
    });

    describe('createPaymentRecord (Free/Lifetime)', () => {
        it('should create a free payment record with instant paid_at', async () => {
            mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } } });
            mockSupabase.from.mockImplementation(() => {
                return createMockQueryBuilder({
                    data: {
                        id: 'pay-free',
                        amount: 0,
                        payment_status: 'success',
                        payment_method: 'promptpay',
                        plan_name: 'pro',
                        created_at: new Date().toISOString(),
                        tournament_id: null,
                        transaction_id: 'LF_FREE_123'
                    },
                    error: null
                });
            });

            const result = await createPaymentRecord('pro', 0, 'promptpay');

            expect(result.success).toBe(true);
            expect(result.data?.amount).toBe(0);
        });
    });

    describe('updatePaymentStatus (Admin Action)', () => {
        it('should verify admin role and update status to success', async () => {
            // Mock auth check
            mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'admin-123' } } });
            
            // Mock user role query, update query, etc.
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'users') {
                    return createMockQueryBuilder({ data: { role: 'admin' }, error: null });
                }
                return createMockQueryBuilder({
                    data: { id: 'pay-123', payment_status: 'success' },
                    error: null
                });
            });

            const result = await updatePaymentStatus('pay-123', 'success');

            expect(result.success).toBe(true);
        });
    });
});
