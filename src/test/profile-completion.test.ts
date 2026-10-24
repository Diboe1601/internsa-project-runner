import { describe, expect, it } from 'vitest';
import { profileCompletion } from '@/internsa/lib/profile-completion';
import { initialStore } from '@/internsa/lib/repository';

describe('Saved profile completion', () => {
  it('counts saved information instead of starting at zero', () => {
    expect(profileCompletion({...initialStore().profile, name:'Student', email:'student@example.com', institution:'University', qualification:'Diploma'})).toBe(50);
  });
  it('excludes whitespace-only answers', () => {
    expect(profileCompletion({...initialStore().profile, name:'   '})).toBe(0);
  });
  it('reaches 100 when all tracked profile details are saved', () => {
    expect(profileCompletion({...initialStore().profile, name:'Student', email:'student@example.com', phone:'0712345678', institution:'University', fieldOfStudy:'Computing', qualification:'Diploma', goal:'Developer', cvUrl:'https://example.com/cv'})).toBe(100);
  });
});