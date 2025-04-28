
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LibraryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  onTabChange: (value: string) => void;
}

const LibraryFilters = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
}: LibraryFiltersProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your library..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="songs">Songs</TabsTrigger>
          <TabsTrigger value="instrumentals">Instrumentals</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default LibraryFilters;
