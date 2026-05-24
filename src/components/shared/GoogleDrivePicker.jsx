import React, { useState, useEffect } from 'react';
import { listGoogleDriveFiles } from '@/lib/google-drive';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { File, Folder, ChevronRight, Loader2, Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GoogleDrivePicker({ open, onOpenChange, onSelect }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState([{ id: 'root', name: 'My Drive' }]);
  const [search, setSearch] = useState('');

  const currentFolder = path[path.length - 1];

  useEffect(() => {
    if (open) {
      loadFiles(currentFolder.id);
    }
  }, [open, currentFolder.id]);

  const loadFiles = async (folderId) => {
    setLoading(true);
    try {
      const data = await listGoogleDriveFiles(folderId);
      setFiles(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (folder) => {
    setPath([...path, folder]);
  };

  const goBack = (index) => {
    setPath(path.slice(0, index + 1));
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M12.5 2L6 2l-4 7v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9l-4-7h-5.5z" fill="#FFC107" />
              <path d="M15.5 2L12 9h9l-3.5-7h-2z" fill="#1976D2" />
              <path d="M8.5 2L2 9h9l-3.5-7h-2z" fill="#4CAF50" />
            </svg>
            Google Drive
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4 flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap py-1">
            {path.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                <button 
                  onClick={() => goBack(i)}
                  className={`hover:text-primary transition-colors ${i === path.length - 1 ? 'text-foreground font-medium' : ''}`}
                >
                  {p.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search files..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* File List */}
          <ScrollArea className="flex-1 border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>No files found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredFiles.map(file => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  return (
                    <div 
                      key={file.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer group transition-colors"
                      onClick={() => isFolder ? navigateTo({ id: file.id, name: file.name }) : onSelect(file)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isFolder ? (
                          <Folder className="h-5 w-5 text-blue-500 fill-blue-500" />
                        ) : file.thumbnailLink ? (
                          <img src={file.thumbnailLink} className="h-5 w-5 object-cover rounded shadow-sm" alt="" />
                        ) : (
                          <File className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm truncate font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isFolder ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onSelect(file); }}>
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="p-4 bg-muted/30 border-t flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
