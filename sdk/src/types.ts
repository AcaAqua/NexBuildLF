export type ProjectStatus = 'planning' | 'in_progress' | 'delayed' | 'completed';
export type TaskStatus = 'pending' | 'doing' | 'done';

export interface Period {
  start: string;
  end: string;
  label?: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  periods: Period[];
  memo?: string;
  photo?: string;
  color?: string;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  status: ProjectStatus;
  location: string;
  progress: number;
  updatedAt: string;
  tasks: Task[];
  memo?: string;
  isArchived: boolean;
  dailyMemos?: { [date: string]: string };
}

export interface Partner {
  id: string;
  name: string;
  company?: string;
  type: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Settings {
  companyName: string;
  userName: string;
  qualifications: string;
}
