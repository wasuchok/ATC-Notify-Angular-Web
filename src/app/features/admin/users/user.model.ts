export interface User {
  id: number | string;
  name: string;
  email: string;
  roles: string[];
  level?: string;
  branch?: string;
  team?: string | null;
  status: 'Active' | 'Inactive';
  avatarColor: string;
  avatarUrl?: string | null;
  lastLogin: string;
}
