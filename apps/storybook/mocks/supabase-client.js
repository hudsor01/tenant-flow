// Lightweight mock of the typed Supabase client used in stories
// Prevents runtime crashes due to missing env vars and avoids network calls

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const mockTables = {
  Lease: Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    rentAmount: 1200 + i * 25,
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    status: 'ACTIVE',
    Tenant: { name: `Tenant ${i + 1}` },
    Unit: { unitNumber: `A-${100 + i}`, Property: { name: `Property ${Math.floor(i / 3) + 1}` } },
  })),
};

export const supabaseClient = {
  auth: {
    async getUser() {
      return { data: { user: null }, error: null };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
    async signOut() {
      return { error: null };
    },
  },
  from(tableName) {
    return {
      select() {
        return {
          limit: async () => {
            // tiny delay to mimic network
            await delay(10);
            const data = mockTables[tableName] || [];
            return { data, error: null };
          },
        };
      },
      insert: async () => ({ data: { id: Date.now() }, error: null }),
      update: async () => ({ data: { updated: true }, error: null }),
      delete: async () => ({ data: { deleted: true }, error: null }),
      eq: () => this,
    };
  },
};

export function getSupabaseAdmin() {
  throw new Error('supabaseAdmin is mocked in Storybook and unavailable in the browser');
}

export const supabaseAdmin = new Proxy({}, {
  get() {
    throw new Error('supabaseAdmin is mocked in Storybook and unavailable in the browser');
  }
});

export async function getCurrentUser() {
  return { user: null, error: null };
}

export async function getCurrentSession() {
  return { session: null, error: null };
}

export async function signOut() {
  return { error: null };
}

