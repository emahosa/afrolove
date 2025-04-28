
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ContestEntry {
  id: number;
  user: string;
  title: string;
  votes: number;
  status: string;
}

interface ContestManagementProps {
  contestEntries: ContestEntry[];
  renderStatusLabel: (status: string) => React.ReactNode;
}

export const ContestManagement = ({ contestEntries, renderStatusLabel }: ContestManagementProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contest Management</h2>
        <Button>Create New Contest</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current Contest: Summer Hits 2025</CardTitle>
          <CardDescription>Active until June 30, 2025</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Contest Entries</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Votes</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contestEntries.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="py-3 px-4">{entry.user}</td>
                      <td className="py-3 px-4">{entry.title}</td>
                      <td className="py-3 px-4">{entry.votes}</td>
                      <td className="py-3 px-4">{renderStatusLabel(entry.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          View
                        </Button>
                        {entry.status === 'pending' ? (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-green-500">
                            Approve
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-amber-500">
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline">End Contest</Button>
            <Button>Choose Winner</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
