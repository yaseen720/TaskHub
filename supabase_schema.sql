-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  security_key TEXT UNIQUE NOT NULL,
  owner_email TEXT NOT NULL
);

-- Workspace Members table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  role TEXT DEFAULT 'employee', -- 'admin' or 'employee'
  status TEXT DEFAULT 'active' -- 'active', 'inactive', 'pending'
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  assigned_to TEXT, -- user email
  due_date TIMESTAMP WITH TIME ZONE,
  attachments JSONB DEFAULT '[]'
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT FALSE
);

-- Join Requests table
CREATE TABLE join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  skills JSONB DEFAULT '[]',
  message TEXT,
  status TEXT DEFAULT 'pending' -- 'pending', 'approved', 'rejected'
);

-- Leave Requests table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' -- 'pending', 'approved', 'rejected'
);

-- Chat Messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'general', -- Also used for group name
  user_email TEXT NOT NULL,
  user_name TEXT,
  recipient_email TEXT, -- For individual chats
  is_private BOOLEAN DEFAULT FALSE,
  content TEXT,
  type TEXT DEFAULT 'text', -- 'text', 'file', 'system'
  file_url TEXT
);

-- Content Items table
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  type TEXT,
  owner_email TEXT NOT NULL
);

-- Video Submissions table
CREATE TABLE video_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  video_url TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  feedback TEXT
);

-- Storage bucket for files
-- Note: You'll need to create a 'files' bucket in Supabase Storage and set public access policies.
