import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

const mockContentItems = [
  {
    id: 1,
    title: "Welcome to MelodyVerse",
    type: "article",
    status: "published",
    author: "Admin",
    created: "2025-03-15"
  },
  {
    id: 2,
    title: "How to Create Your First Song",
    type: "tutorial",
    status: "published",
    author: "Admin",
    created: "2025-03-18"
  },
  {
    id: 3,
    title: "Voice Cloning Guide",
    type: "guide",
    status: "draft",
    author: "Admin",
    created: "2025-03-25"
  },
  {
    id: 4,
    title: "Latest Platform Updates",
    type: "announcement",
    status: "draft",
    author: "Admin",
    created: "2025-04-10"
  },
];

const TermsAndConditionsEditor = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const { data, error } = await supabase
          .from('terms_and_conditions')
          .select('content')
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setContent(data.content || '');
        }
      } catch (err: any) {
        setError('Failed to load terms and conditions.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('terms_and_conditions')
        .update({ content })
        .eq('id', 1); // Assuming there's only one row with id 1

      if (error) {
        throw error;
      }

      toast.success('Terms and Conditions updated successfully.');
    } catch (err: any) {
      toast.error('Failed to save changes.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms and Conditions</CardTitle>
        <CardDescription>
          Edit the Terms and Conditions for your platform. This will be visible to users on the registration page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="Enter your terms and conditions here..."
            />
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export const ContentManagement = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [contentItems, setContentItems] = useState(mockContentItems);

  const handleAddContent = () => {
    setIsAddOpen(true);
  };

  const handleEditContent = (item: any) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleViewContent = (item: any) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleDeleteContent = (item: any) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handlePublish = (id: number) => {
    setContentItems(
      contentItems.map(item =>
        item.id === id
          ? { ...item, status: "published" }
          : item
      )
    );

    toast.success("Content published successfully");
  };

  const handleUnpublish = (id: number) => {
    setContentItems(
      contentItems.map(item =>
        item.id === id
          ? { ...item, status: "draft" }
          : item
      )
    );

    toast.success("Content unpublished");
  };

  const confirmDelete = () => {
    if (selectedItem) {
      setContentItems(contentItems.filter(item => item.id !== selectedItem.id));
      setIsDeleteOpen(false);
      toast.success("Content deleted successfully");
    }
  };

  const renderContentTable = (items: any[]) => (
    <Card>
      <CardHeader>
        <div className="text-sm text-muted-foreground">
          {items.length} items
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
            {items.map((item) => (
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
                <TableCell>{item.author}</TableCell>
                <TableCell>{item.created}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewContent(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditContent(item)}
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
                      onClick={() => handleDeleteContent(item)}
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
  );


  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Content Management</h2>
        {activeTab !== 'terms' && <Button onClick={handleAddContent}>Add New Content</Button>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderContentTable(contentItems)}
        </TabsContent>
        <TabsContent value="published" className="mt-6">
          {renderContentTable(contentItems.filter(item => item.status === 'published'))}
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          {renderContentTable(contentItems.filter(item => item.status === 'draft'))}
        </TabsContent>
        <TabsContent value="terms" className="mt-6">
          <TermsAndConditionsEditor />
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
              <Input placeholder="Enter content title" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select className="w-full mt-1 border rounded-md p-2">
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
            <Button onClick={() => {
              setIsAddOpen(false);
              toast.success("Content created as draft");
            }}>
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
                defaultValue={selectedItem?.title}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full mt-1 border rounded-md p-2"
                defaultValue={selectedItem?.type}
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
                defaultValue="This is the content of the selected item..."
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
            <Button onClick={() => {
              setIsEditOpen(false);
              toast.success("Content updated successfully");
            }}>
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
                {selectedItem?.type} • {selectedItem?.created} • {selectedItem?.author}
              </span>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="prose max-w-none">
              <p>This is the content of the "{selectedItem?.title}" article.</p>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.</p>
              <p>Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.</p>
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
