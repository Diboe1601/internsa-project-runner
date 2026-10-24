import { supabase } from './supabase';

export type OpportunityStatus = 'draft' | 'published' | 'closed' | 'archived';
export type GuideStatus = 'draft' | 'published' | 'archived';

export type Opportunity = {
  id: string;
  title: string;
  organisation: string;
  type: string;
  province: string;
  city: string;
  locationType: string;
  industry: string;
  qualification: string;
  experience: string;
  paidStatus: string;
  stipend: string;
  closingDate: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  howToApply: string;
  sourceUrl: string;
  sourceStatus: string;
  status: OpportunityStatus;
  createdAt: string;
  featured: boolean;
};

export type Guide = {
  id: string;
  title: string;
  category: string;
  copy: string;
  read: string;
  checklist: string[];
  status: GuideStatus;
  createdAt: string;
};

export type ApplyIntent = {
  id: string;
  opportunityId: string;
  createdAt: string;
  userId?: string;
};

export type Report = {
  id: string;
  opportunityId: string;
  reason: string;
  details: string;
  createdAt: string;
  status: 'open' | 'resolved';
};

export type Profile = {
  id?: string;
  name: string;
  province: string;
  qualification: string;
  interests: string[];
  email?: string;
  phone?: string;
  institution?: string;
  fieldOfStudy?: string;
  graduationYear?: string;
  goal?: string;
  cvUrl?: string;
  linkedinUrl?: string;
  workPreference?: string;
};

export type AdminProfile = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  organisation: string;
  notifyReports: boolean;
  notifyClosing: boolean;
  weeklySummary: boolean;
};

export const defaultAdminProfile: AdminProfile = {
  name: '',
  email: '',
  phone: '',
  jobTitle: 'Content administrator',
  department: 'Opportunities & partnerships',
  organisation: 'InternSA',
  notifyReports: true,
  notifyClosing: true,
  weeklySummary: false
};

export type Activity = {
  id: string;
  kind: 'view' | 'search' | 'save' | 'apply' | 'report' | 'share';
  opportunityId?: string;
  term?: string;
  createdAt: string;
  userId?: string;
};

// --- Repository Functions ---

export const provinces = ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape', 'National'];
export const types = ['Internship', 'Graduate programme', 'Entry-level job', 'Learnership', 'Bursary', 'Government programme', 'YES Programme', 'Other'];

export const emptyOpportunity = (): Opportunity => ({
  id: '', title: '', organisation: '', type: 'Internship', province: 'Gauteng', city: '',
  locationType: 'On-site', industry: 'Other', qualification: 'Any qualification', experience: 'No experience',
  paidStatus: 'Not specified', stipend: '', closingDate: new Date().toISOString().slice(0, 10),
  description: '', requirements: '', responsibilities: '', benefits: '', howToApply: '',
  sourceUrl: 'https://', sourceStatus: 'Verified source',
  status: 'draft', createdAt: new Date().toISOString(), featured: false
});

export const emptyGuide = (): Guide => ({
  id: '', title: '', category: 'Career skills', copy: '', read: '5 min read', checklist: [],
  status: 'draft', createdAt: new Date().toISOString()
});

export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function daysUntil(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(year, month - 1, day);
  return Math.round((targetUtc - todayUtc) / 86400000);
}

export function isLive(item: Opportunity) {
  return item.status === 'published' && daysUntil(item.closingDate) >= 0;
}

// --- Supabase Data Fetching ---
// Database columns are snake_case (created_at, closing_date, ...); the app uses camelCase.
// Convert on every read/write so rows round-trip correctly.

const camelize = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
    value,
  ]));

const snakeify = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/[A-Z0-9]/g, (c) => (/[A-Z]/.test(c) ? `_${c.toLowerCase()}` : `_${c}`)),
    value,
  ]));

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }
  return ((data || []) as Record<string, unknown>[]).map((row) => camelize(row) as unknown as Opportunity);
}

export async function fetchGuides(): Promise<Guide[]> {
  const { data, error } = await supabase
    .from('guides')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guides:', error);
    return [];
  }
  return ((data || []) as Record<string, unknown>[]).map((row) => camelize(row) as unknown as Guide);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? (camelize(data as Record<string, unknown>) as unknown as Profile) : null;
}

export async function updateProfile(profile: Profile) {
  if (!profile.id) throw new Error('Please log in to save your profile.');
  const { data, error } = await supabase
    .from('profiles')
    .upsert(snakeify(profile as unknown as Record<string, unknown>))
    .select('*')
    .single();

  if (error) throw error;
  return camelize(data as Record<string, unknown>) as unknown as Profile;
}

export async function trackActivity(activity: Omit<Activity, 'id' | 'createdAt'>) {
  const { error } = await supabase
    .from('activities')
    .insert([snakeify({ ...activity, id: makeId(), createdAt: new Date().toISOString() })]);

  if (error) console.error('Error tracking activity:', error);
}

// NOTE: The existing Store type and local storage functions (readStore, writeStore)
// are kept for backward compatibility with the current App.tsx state management,
// but they should eventually be replaced with direct Supabase calls and React Query/SWR.
export type Store = {
  version: number;
  opportunities: Opportunity[];
  guides: Guide[];
  applyIntents: ApplyIntent[];
  savedIds: string[];
  reports: Report[];
  profile: Profile;
  activity: Activity[];
  adminProfile?: AdminProfile;
};

// Fallback seeds for initial development/testing if DB is empty
const guideSeeds: Guide[] = [
  {id:'guide-cv',category:'CVs',title:'Build a CV that gets read',copy:'A clear one-page starting point for your first role: structure, skills, and what to leave out.',read:'6 min read',checklist:['Lead with the role or study path you want.','Use clear headings and reverse-chronological experience.','Describe projects, volunteering and responsibilities with concrete examples.','Check names, dates and contact details before sharing.'],status:'published',createdAt:new Date().toISOString()},
];

export function initialStore(): Store {
  return {
    version: 1,
    opportunities: [],
    guides: [],
    applyIntents: [],
    savedIds: [],
    reports: [],
    profile: { name: '', province: 'Gauteng', qualification: '', interests: [] },
    activity: []
  };
}

export function readStore(): Store {
  try {
    const raw = localStorage.getItem('internsa.data.v1');
    if (!raw) return initialStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { ...initialStore(), ...parsed };
  } catch {
    return initialStore();
  }
}

export function writeStore(value: Store) {
  try {
    localStorage.setItem('internsa.data.v1', JSON.stringify(value));
  } catch {
    console.error('LocalStorage write failed');
  }
}
