import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, Pencil, Trash, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: "published" | "draft";
  author_id: string;
  created_at: string;
  content?: string;
  author_email?: string;
}

export const ContentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [newItem, setNewItem] = useState({ title: '', type: 'article', content: '' });

  const fetchContentItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content")
      .select("*, author:profiles(email)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch content items.");
      console.error(error);
    } else {
      const items = data.map((item: any) => ({
        ...item,
        author_email: item.author?.email || 'Unknown',
      }));
      setContentItems(items);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContentItems();
  }, []);

  const handleError = (error: PostgrestError | null, message: string) => {
    if (error) {
      toast.error(message);
      console.error(error);
    }
  };

  const handleAddContent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to add content.");
      return;
    }

    const { error } = await supabase
      .from("content")
      .insert({ ...newItem, author_id: user.id, status: 'draft' });

    handleError(error, "Failed to add content.");
    if (!error) {
      toast.success("Content created as draft");
      setIsAddOpen(false);
      setNewItem({ title: '', type: 'article', content: '' });
      fetchContentItems();
    }
  };

  const handleEditContent = async () => {
    if (!selectedItem) return;
    
    const { error } = await supabase
      .from("content")
      .update({ title: selectedItem.title, type: selectedItem.type, content: selectedItem.content })
      .eq("id", selectedItem.id);

    handleError(error, "Failed to update content.");
    if (!error) {
      toast.success("Content updated successfully");
      setIsEditOpen(false);
      fetchContentItems();
    }
  };

  const handleDeleteContent = async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from("content")
      .delete()
      .eq("id", selectedItem.id);

    handleError(error, "Failed to delete content.");
    if (!error) {
      toast.success("Content deleted successfully");
      setIsDeleteOpen(false);
      fetchContentItems();
    }
  };

  const handleUpdateStatus = async (id: string, status: "published" | "draft") => {
    const { error } = await supabase
      .from("content")
      .update({ status })
      .eq("id", id);

    handleError(error, `Failed to ${status === 'published' ? 'publish' : 'unpublish'} content.`);
    if (!error) {
      toast.success(`Content ${status === 'published' ? 'published' : 'unpublished'} successfully`);
      fetchContentItems();
    }
  };

  const openEditModal = (item: ContentItem) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const openViewModal = (item: ContentItem) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const openDeleteModal = (item: ContentItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const filteredItems = contentItems.filter(item => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Content Management</h2>
        <Button onClick={() => setIsAddOpen(true)}>Add New Content</Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <div className="text-sm text-muted-foreground">
                {loading ? <Loader2 className="animate-spin" /> : `${filteredItems.length} items`}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        <Loader2 className="animate-spin inline-block" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell className="capitalize">{item.type}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell>{item.author_email}</TableCell>
                        <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openViewModal(item)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => openEditModal(item)}><Pencil className="h-4 w-4" /></Button>
                            {item.status === "draft" ? (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(item.id, 'published')}><CheckCircle className="h-4 w-4" /></Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(item.id, 'draft')}><XCircle className="h-4 w-4" /></Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => openDeleteModal(item)}><Trash className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit/View/Delete Dialogs */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Content</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Title" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
            <select className="w-full border rounded-md p-2" value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}>
              <option value="article">Article</option>
              <option value="tutorial">Tutorial</option>
              <option value="guide">Guide</option>
              <option value="announcement">Announcement</option>
            </select>
            <textarea className="w-full border rounded-md p-2 h-32" placeholder="Content..." value={newItem.content} onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}></textarea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContent}>Save as Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Content</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              <Input placeholder="Title" value={selectedItem.title} onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })} />
              <select className="w-full border rounded-md p-2" value={selectedItem.type} onChange={(e) => setSelectedItem({ ...selectedItem, type: e.target.value })}>
                <option value="article">Article</option>
                <option value="tutorial">Tutorial</option>
                <option value="guide">Guide</option>
                <option value="announcement">Announcement</option>
              </select>
              <textarea className="w-full border rounded-md p-2 h-32" placeholder="Content..." value={selectedItem.content || ''} onChange={(e) => setSelectedItem({ ...selectedItem, content: e.target.value })}></textarea>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditContent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs ${
                selectedItem?.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}>
                {selectedItem?.status}
              </span>
              <span className="text-sm text-muted-foreground">{selectedItem?.type} • {selectedItem && new Date(selectedItem.created_at).toLocaleDateString()} • {selectedItem?.author_email}</span>
            </div>
          </DialogHeader>
          <div className="py-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedItem?.content || '' }}></div>
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{selectedItem?.title}"? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteContent}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;
