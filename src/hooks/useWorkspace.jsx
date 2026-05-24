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
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);

    const memberships = await base44.entities.WorkspaceMember.filter({
      user_email: user.email,
      status: 'active'
    });

    if (memberships.length > 0) {
      const wsIds = memberships.map(m => m.workspace_id);
      const allWorkspaces = await base44.entities.Workspace.list();
      const userWorkspaces = allWorkspaces.filter(ws => wsIds.includes(ws.id));
      setWorkspaces(userWorkspaces);

      const lastWsId = localStorage.getItem('taskhub_active_workspace');
      const lastWs = userWorkspaces.find(ws => ws.id === lastWsId);
      
      if (lastWs) {
        setActiveWorkspace(lastWs);
        setActiveMembership(memberships.find(m => m.workspace_id === lastWs.id));
      } else if (userWorkspaces.length > 0) {
        setActiveWorkspace(userWorkspaces[0]);
        setActiveMembership(memberships.find(m => m.workspace_id === userWorkspaces[0].id));
      }
    }
    setLoading(false);
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