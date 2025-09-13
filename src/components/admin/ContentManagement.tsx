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
import { CheckCircle, XCircle, Pencil, Trash, Eye } from "lucide-react";
import { fetchContent, addContent, updateContent, deleteContent, ContentItem } from "@/services/contentService";
import { supabase } from "@/integrations/supabase/client";

export const ContentManagement = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [newContent, setNewContent] = useState({ title: "", type: "article", content: "" });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const data = await fetchContent();
      setContentItems(data);
    } catch (error) {
      toast.error("Failed to load content");
    }
  };

  const handleAddDialog = () => {
    setNewContent({ title: "", type: "article", content: "" });
    setIsAddOpen(true);
  };

  const handleEditDialog = (item: ContentItem) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleViewDialog = (item: ContentItem) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };
  
  const handleDeleteDialog = (item: ContentItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleAdd = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("User not found");
      await addContent(newContent.title, newContent.type, newContent.content, user.id);
      setIsAddOpen(false);
      toast.success("Content created as draft");
      loadContent();
    } catch (error) {
      toast.error("Failed to create content");
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      await updateContent(selectedItem.id, { title: selectedItem.title, content: selectedItem.content, type: selectedItem.type });
      setIsEditOpen(false);
      toast.success("Content updated successfully");
      loadContent();
    } catch (error) {
      toast.error("Failed to update content");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await updateContent(id, { status: "published" });
      toast.success("Content published successfully");
      loadContent();
    } catch (error) {
      toast.error("Failed to publish content");
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await updateContent(id, { status: "draft" });
      toast.success("Content unpublished");
      loadContent();
    } catch (error) {
      toast.error("Failed to unpublish content");
    }
  };

  const confirmDelete = async () => {
    if (selectedItem) {
      try {
        await deleteContent(selectedItem.id);
        setIsDeleteOpen(false);
        toast.success("Content deleted successfully");
        loadContent();
      } catch (error) {
        toast.error("Failed to delete content");
      }
    }
  };
  
  const filteredItems = contentItems.filter(item => {
    if (activeTab === "all") return true;
    if (activeTab === "published") return item.status === "published";
    if (activeTab === "draft") return item.status === "draft";
    return true;
  });

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Content Management</h2>
        <Button onClick={handleAddDialog}>Add New Content</Button>
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
                {filteredItems.length} items
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
                  {filteredItems.map((item) => (
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
                      <TableCell>{item.profiles?.full_name || 'N/A'}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDialog(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {item.status === "draft" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePublish(item.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnpublish(item.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDialog(item)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add Content Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Content</DialogTitle>
            <DialogDescription>
              Create a new content item for your platform
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter content title"
                className="mt-1"
                value={newContent.title}
                onChange={(e) => setNewContent({...newContent, title: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full mt-1 border rounded-md p-2"
                value={newContent.type}
                onChange={(e) => setNewContent({...newContent, type: e.target.value})}
              >
                <option value="article">Article</option>
                <option value="tutorial">Tutorial</option>
                <option value="guide">Guide</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea
                className="w-full mt-1 border rounded-md p-2 h-32"
                placeholder="Write your content here..."
                value={newContent.content}
                onChange={(e) => setNewContent({...newContent, content: e.target.value})}
              ></textarea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Content Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Make changes to the selected content item
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={selectedItem?.title || ''}
                onChange={(e) => setSelectedItem(selectedItem ? {...selectedItem, title: e.target.value} : null)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full mt-1 border rounded-md p-2"
                value={selectedItem?.type || ''}
                onChange={(e) => setSelectedItem(selectedItem ? {...selectedItem, type: e.target.value} : null)}
              >
                <option value="article">Article</option>
                <option value="tutorial">Tutorial</option>
                <option value="guide">Guide</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea
                className="w-full mt-1 border rounded-md p-2 h-32"
                value={selectedItem?.content || ''}
                onChange={(e) => setSelectedItem(selectedItem ? {...selectedItem, content: e.target.value} : null)}
              ></textarea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Content Dialog */}
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
              <span className="text-sm text-muted-foreground">
                {selectedItem?.type} • {selectedItem ? new Date(selectedItem.created_at).toLocaleDateString() : ''} • {selectedItem?.profiles?.full_name || 'N/A'}
              </span>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="prose max-w-none">
              <p>{selectedItem?.content}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Content Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.title}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;
