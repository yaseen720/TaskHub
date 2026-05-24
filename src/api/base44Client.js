import { supabase } from '@/lib/supabase';

// Helper to convert base44 filter format to Supabase query
const applyFilter = (query, criteria) => {
  let q = query;
  Object.entries(criteria).forEach(([key, value]) => {
    q = q.eq(key, value);
  });
  return q;
};

class SupabaseEntity {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async list() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      created_date: item.created_at || item.created_date
    }));
  }

  async filter(criteria = {}, sort = '') {
    let query = supabase.from(this.tableName).select('*');
    query = applyFilter(query, criteria);

    if (sort) {
      const descending = sort.startsWith('-');
      const column = descending ? sort.substring(1) : sort;
      // Handle created_date vs created_at in sort
      const sortColumn = column === 'created_date' ? 'created_at' : column;
      query = query.order(sortColumn, { ascending: !descending });
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      created_date: item.created_at || item.created_date
    }));
  }

  async create(data) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return {
      ...result,
      created_date: result.created_at || result.created_date
    };
  }

  async update(id, data) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      ...result,
      created_date: result.created_at || result.created_date
    };
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
}

const entityProxies = new Proxy({}, {
  get: (target, name) => {
    // Table names in Supabase are usually lowercase and pluralized/snake_case
    // We'll map the entity names to table names
    const tableNameMap = {
      'Workspace': 'workspaces',
      'WorkspaceMember': 'workspace_members',
      'Task': 'tasks',
      'Notification': 'notifications',
      'JoinRequest': 'join_requests',
      'LeaveRequest': 'leave_requests',
      'ChatMessage': 'chat_messages',
      'ContentItem': 'content_items',
      'VideoSubmission': 'video_submissions'
    };
    const tableName = tableNameMap[name] || name.toLowerCase();
    if (!target[name]) {
      target[name] = new SupabaseEntity(tableName);
    }
    return target[name];
  }
});

export const base44 = {
  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw { status: 401, message: 'Unauthorized' };
      return {
        ...user,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
      };
    },
    logout: async () => {
      await supabase.auth.signOut();
      window.location.reload();
    }
  },
  entities: entityProxies,
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { data, error } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        return { file_url: publicUrl };
      },
      SendEmail: async (data) => {
        console.log('Simulating SendEmail via Supabase Edge Function or similar:', data);
        // This would typically be an Edge Function call
      },
    }
  }
};
