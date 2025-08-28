import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Pencil, Trash, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Gateway {
  id: number;
  name: string;
  api_key: string;
  secret_key: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const newGatewayInitialState = {
  name: "",
  api_key: "",
  secret_key: "",
  status: "inactive" as 'active' | 'inactive',
};

export const PaymentGatewayManagement = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  const [newGateway, setNewGateway] = useState(newGatewayInitialState);
  const [editingGateway, setEditingGateway] = useState<Partial<Gateway> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGateways = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("payment_gateways").select("*").order('created_at', { ascending: false });
    if (error) {
      toast.error("Failed to fetch payment gateways: " + error.message);
      console.error(error);
    } else {
      setGateways(data as Gateway[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const handleAddDialogOpen = () => {
    setNewGateway(newGatewayInitialState);
    setIsAddOpen(true);
  };

  const handleEditDialogOpen = (gateway: Gateway) => {
    setSelectedGateway(gateway);
    setEditingGateway({ ...gateway });
    setIsEditOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isAddOpen) {
        setNewGateway(prev => ({ ...prev, [name]: value }));
    }
    if (isEditOpen && editingGateway) {
        setEditingGateway(prev => ({...prev, [name]: value}));
    }
  };

  const handleStatusChange = (checked: boolean) => {
    const status = checked ? 'active' : 'inactive';
     if (isAddOpen) {
        setNewGateway(prev => ({ ...prev, status }));
    }
    if (isEditOpen && editingGateway) {
        setEditingGateway(prev => ({...prev, status}));
    }
  }

  const handleAddGateway = async () => {
    if (!newGateway.name || !newGateway.api_key || !newGateway.secret_key) {
        toast.error("Please fill all the fields");
        return;
    }

    const { error } = await supabase.from("payment_gateways").insert([newGateway]);
    if (error) {
      toast.error("Failed to add gateway: " + error.message);
    } else {
      toast.success("Payment gateway added successfully");
      setIsAddOpen(false);
      fetchGateways();
    }
  };

  const handleEditGateway = async () => {
    if (!editingGateway || !selectedGateway) return;

    const { name, api_key, secret_key, status } = editingGateway;

    const { error } = await supabase
      .from("payment_gateways")
      .update({ name, api_key, secret_key, status })
      .eq("id", selectedGateway.id);

    if (error) {
      toast.error("Failed to update gateway: " + error.message);
    } else {
      toast.success("Payment gateway updated successfully");
      setIsEditOpen(false);
      fetchGateways();
    }
  };

  const confirmDelete = async (gateway: Gateway) => {
    if (window.confirm(`Are you sure you want to delete the "${gateway.name}" gateway?`)) {
      const { error } = await supabase.from("payment_gateways").delete().eq("id", gateway.id);
      if (error) {
        toast.error("Failed to delete gateway: " + error.message);
      } else {
        toast.success(`Gateway ${gateway.name} deleted successfully`);
        fetchGateways();
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold">Payment Gateway Settings</h2>
            <p className="text-muted-foreground">Manage your payment gateways and their API keys.</p>
        </div>
        <Button onClick={handleAddDialogOpen}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Gateway
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p>Loading gateways...</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gateway Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.map((gateway) => (
                <TableRow key={gateway.id}>
                  <TableCell className="font-medium">{gateway.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      gateway.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {gateway.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">...{gateway.api_key.slice(-8)}</TableCell>
                  <TableCell>{new Date(gateway.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDialogOpen(gateway)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(gateway)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Gateway Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Payment Gateway</DialogTitle>
            <DialogDescription>
              Enter the details for the new payment gateway.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Gateway Name</Label>
              <Input id="name" name="name" value={newGateway.name} onChange={handleInputChange} placeholder="e.g., Stripe" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="api_key">API Key</Label>
              <Input id="api_key" name="api_key" value={newGateway.api_key} onChange={handleInputChange} placeholder="Enter API Key" className="mt-1" />
            </div>
             <div>
              <Label htmlFor="secret_key">Secret Key</Label>
              <Input id="secret_key" name="secret_key" value={newGateway.secret_key} onChange={handleInputChange} placeholder="Enter Secret Key" className="mt-1" />
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="status-switch-add"
                    checked={newGateway.status === 'active'}
                    onCheckedChange={handleStatusChange}
                />
                <Label htmlFor="status-switch-add">
                    {newGateway.status === 'active' ? 'Active' : 'Inactive'}
                </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddGateway}>
              Save Gateway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Gateway Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Gateway</DialogTitle>
            <DialogDescription>
              Update the details for {selectedGateway?.name}.
            </DialogDescription>
          </DialogHeader>
          {editingGateway && (
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name-edit">Gateway Name</Label>
              <Input id="name-edit" name="name" value={editingGateway.name || ''} onChange={handleInputChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="api_key-edit">API Key</Label>
              <Input id="api_key-edit" name="api_key" value={editingGateway.api_key || ''} onChange={handleInputChange} className="mt-1" />
            </div>
             <div>
              <Label htmlFor="secret_key-edit">Secret Key</Label>
              <Input id="secret_key-edit" name="secret_key" value={editingGateway.secret_key || ''} onChange={handleInputChange} placeholder="Enter new Secret Key" className="mt-1" />
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="status-switch-edit"
                    checked={editingGateway.status === 'active'}
                    onCheckedChange={handleStatusChange}
                />
                <Label htmlFor="status-switch-edit">
                    {editingGateway.status === 'active' ? 'Active' : 'Inactive'}
                </Label>
            </div>
          </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditGateway}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentGatewayManagement;
