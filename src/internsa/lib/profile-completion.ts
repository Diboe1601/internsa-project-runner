import type { Profile } from './repository';

const completionFields = ['name', 'email', 'phone', 'institution', 'fieldOfStudy', 'qualification', 'goal', 'cvUrl'] as const;

export function profileCompletion(profile: Profile): number {
  const completed = completionFields.filter(key => profile[key]?.trim()).length;
  return Math.round(completed / completionFields.length * 100);
}