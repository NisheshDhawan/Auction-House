import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  Database, 
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface PlaceholderAdminPageProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tableName: string;
  features: string[];
}

const PlaceholderAdminPage = ({ title, description, icon: Icon, tableName, features }: PlaceholderAdminPageProps) => {
  const handleAction = (action: string) => {
    alert(`${action} - Not implemented yet. ${tableName} table needs to be created first.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => handleAction('Add New')}
        >
          <Plus className="h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* Status Card */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <CardTitle className="text-yellow-800">Implementation Pending</CardTitle>
              <CardDescription className="text-yellow-700">
                This section is ready for implementation once the database schema is created.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Required table: <code className="bg-yellow-100 px-2 py-1 rounded text-xs">{tableName}</code>
            </span>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Planned Features:</h4>
              <div className="flex flex-wrap gap-2">
                {features.map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-yellow-700 border-yellow-300">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mock Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{title} Interface</CardTitle>
                <CardDescription>Preview of the management interface</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock toolbar */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Search and filter controls will appear here</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleAction('Filter')}>
                  Filter
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction('Export')}>
                  Export
                </Button>
              </div>
            </div>

            {/* Mock table */}
            <div className="border rounded-lg">
              <div className="p-4 border-b bg-muted/50">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                  <div>Name</div>
                  <div>Status</div>
                  <div>Created</div>
                  <div>Updated</div>
                  <div className="text-right">Actions</div>
                </div>
              </div>
              
              {/* Mock rows */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border-b last:border-b-0">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Sample Item {i}</div>
                        <div className="text-xs text-muted-foreground">Sample description</div>
                      </div>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-muted-foreground">
                        Active
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">Dec {10 + i}, 2024</div>
                    <div className="text-sm text-muted-foreground">Dec {10 + i}, 2024</div>
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAction('View')}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAction('Edit')}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAction('Delete')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center py-8 text-muted-foreground">
              <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                This interface will be fully functional once the {tableName} table is implemented.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderAdminPage;