import { supabase } from '@/lib/supabase';

export const getGoogleAccessToken = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.provider_token;
};

export const listGoogleDriveFiles = async (folderId = 'root') => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not logged in with Google');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed = false&fields=files(id, name, mimeType, thumbnailLink, webViewLink, iconLink)&pageSize=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch files from Google Drive');
  }

  const data = await response.json();
  return data.files;
};

export const downloadGoogleDriveFile = async (fileId) => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Not logged in with Google');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download file from Google Drive');
  }

  return await response.blob();
};
