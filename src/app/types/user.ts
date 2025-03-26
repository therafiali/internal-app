export interface User {
  name: string;
  email: string;
  department: string;
  role: string;
  joinedDate?: string;
  agentId?: string;
  status?: 'active' | 'inactive';
  lastActive?: string;
  performanceRating?: number;
  handledCases?: number;
} 