import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      console.log('Loading user data...');
      const user = await base44.auth.me();
      console.log('Workspace Loading - User found:', user.email);
      setCurrentUser(user);

      console.log('Workspace Loading - Fetching memberships...');
      const memberships = await base44.entities.WorkspaceMember.filter({
        user_email: user.email,
        status: 'active'
      });
      console.log('Workspace Loading - Memberships found:', memberships.length);

      if (memberships.length > 0) {
        const wsIds = memberships.map(m => m.workspace_id);
        const allWorkspaces = await base44.entities.Workspace.list();
        console.log('Workspace Loading - Total workspaces in DB:', allWorkspaces.length);
        const userWorkspaces = allWorkspaces.filter(ws => wsIds.includes(ws.id));
        setWorkspaces(userWorkspaces);
        console.log('Workspace Loading - User workspaces filter matched:', userWorkspaces.length);

        const lastWsId = localStorage.getItem('taskhub_active_workspace');
        const lastWs = userWorkspaces.find(ws => ws.id === lastWsId);
        
        if (lastWs) {
          console.log('Workspace Loading - Setting active workspace from localStorage:', lastWs.name);
          setActiveWorkspace(lastWs);
          setActiveMembership(memberships.find(m => m.workspace_id === lastWs.id));
        } else if (userWorkspaces.length > 0) {
          console.log('Workspace Loading - Setting first available workspace as active:', userWorkspaces[0].name);
          setActiveWorkspace(userWorkspaces[0]);
          setActiveMembership(memberships.find(m => m.workspace_id === userWorkspaces[0].id));
        }
      } else {
        console.warn('Workspace Loading - No active memberships found for user');
        setWorkspaces([]);
        setActiveWorkspace(null);
        setActiveMembership(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = (workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem('taskhub_active_workspace', workspace.id);
    base44.entities.WorkspaceMember.filter({
      user_email: currentUser.email,
      workspace_id: workspace.id
    }).then(members => {
      if (members.length > 0) setActiveMembership(members[0]);
    });
  };

  const isAdmin = activeMembership?.role === 'admin';

  const refreshWorkspaces = () => loadUserData();

  return (
    <WorkspaceContext.Provider value={{
      currentUser,
      workspaces,
      activeWorkspace,
      activeMembership,
      isAdmin,
      loading,
      switchWorkspace,
      refreshWorkspaces,
      setActiveWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

export default useWorkspace;