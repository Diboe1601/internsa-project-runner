import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, select, eq, maybeSingle, upsert, single } = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), single: vi.fn(),
}));
vi.mock('@/internsa/lib/supabase', () => ({ supabase: { from } }));

import { fetchProfile, updateProfile } from '@/internsa/lib/repository';
import { profileCompletion } from '@/internsa/lib/profile-completion';

describe('Database profile persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const chain = { select, eq, maybeSingle, upsert, single };
    from.mockReturnValue(chain);
    select.mockReturnValue(chain);
    eq.mockReturnValue(chain);
    upsert.mockReturnValue(chain);
  });

  it('saves account-owned details and calculates completion from the database read-back', async () => {
    const row = { id:'student-id', name:'Student', email:'student@example.com', province:'Gauteng', qualification:'Diploma', interests:[], field_of_study:'Computing', goal:'Developer', cv_url:'https://example.com/cv', institution:'University', phone:'0712345678' };
    single.mockResolvedValue({data:row,error:null});
    const saved = await updateProfile({id:'student-id',name:'Student',province:'Gauteng',qualification:'Diploma',interests:[],fieldOfStudy:'Computing',cvUrl:'https://example.com/cv'});
    expect(upsert).toHaveBeenCalledWith({id:'student-id',name:'Student',province:'Gauteng',qualification:'Diploma',interests:[],field_of_study:'Computing',cv_url:'https://example.com/cv'});
    expect(saved.cvUrl).toBe('https://example.com/cv');
    maybeSingle.mockResolvedValue({data:row,error:null});
    const fetched = await fetchProfile('student-id');
    expect(eq).toHaveBeenCalledWith('id','student-id');
    expect(fetched && profileCompletion(fetched)).toBe(100);
  });

  it('does not write a profile without an authenticated account ID', async () => {
    await expect(updateProfile({name:'Student',province:'Gauteng',qualification:'Diploma',interests:[]})).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('does not report a failed database save as successful', async () => {
    single.mockResolvedValue({data:null,error:new Error('write denied')});
    await expect(updateProfile({id:'student-id',name:'Student',province:'Gauteng',qualification:'Diploma',interests:[]})).rejects.toThrow('write denied');
  });

  it('surfaces a failed read rather than treating it as an empty profile', async () => {
    maybeSingle.mockResolvedValue({data:null,error:new Error('read denied')});
    await expect(fetchProfile('student-id')).rejects.toThrow('read denied');
  });
});