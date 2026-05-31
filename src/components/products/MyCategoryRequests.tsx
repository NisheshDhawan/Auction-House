import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { categoryRequestsAPI, CategoryRequest } from '@/services/categoryRequestsAPI';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  MessageSquare,
  Trash2
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface MyCategoryRequestsProps {
  filter?: string;
}

const MyCategoryRequests = ({ filter = 'all' }: MyCategoryRequestsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter requests based on the filter prop
  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  // Fetch user's category requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.id) {
        console.log('No user ID available, skipping fetch');
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('Fetching category requests for user:', user.id);
        setIsLoading(true);
        const response = await categoryRequestsAPI.getUserCategoryRequests();
        console.log('Fetched category requests response:', response);
        setRequests(response.requests);
      } catch (error: any) {
        console.error('Error fetching category requests:', error);
        toast({
          title: "Error loading requests",
          description: error.message || "Failed to load your category requests",
          variant: "destructive",
        });
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [user?.id, toast]);

  // Handle request deletion
  const handleDeleteRequest = async (requestId: string) => {
    try {
      setIsDeleting(requestId);
      await categoryRequestsAPI.deleteCategoryRequest(requestId);
      
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Request Deleted",
        description: "Your category request has been deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting request",
        description: error.message || "Failed to delete category request",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusIcon = (status: CategoryRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: CategoryRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    }
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Requests" description="Fetching your category requests..." />;
  }

  return (
    <div className="space-y-6">
      {filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{request.name}</CardTitle>
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: request.color }}
                      />
                    </div>
                    {request.description && (
                      <CardDescription>{request.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {request.status === 'pending' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting === request.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete your request for "{request.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRequest(request.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {request.reviewedAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Status Details */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border">
                  {getStatusIcon(request.status)}
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      {request.status === 'pending' && 'Awaiting Admin Review'}
                      {request.status === 'approved' && 'Request Approved'}
                      {request.status === 'rejected' && 'Request Rejected'}
                    </div>
                    
                    {request.status === 'pending' && (
                      <p className="text-xs text-muted-foreground">
                        Your request is in the queue for admin review. You'll receive an email notification once it's processed.
                      </p>
                    )}
                    
                    {request.status === 'approved' && (
                      <p className="text-xs text-green-700">
                        Great! Your category has been approved and is now available for use.
                        {request.reviewedByName && ` Reviewed by ${request.reviewedByName}.`}
                      </p>
                    )}
                    
                    {request.status === 'rejected' && request.adminNotes && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <MessageSquare className="h-3 w-3 text-red-600" />
                          <span className="text-xs font-medium text-red-700">Admin Notes:</span>
                        </div>
                        <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
                          {request.adminNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === 'all' ? 'No Category Requests' : 
             filter === 'approved' ? 'No Approved Requests' :
             filter === 'rejected' ? 'No Rejected Requests' :
             filter === 'pending' ? 'No Pending Requests' : 'No Category Requests'}
          </h3>
          <p className="text-muted-foreground">
            {filter === 'all' ? "You haven't submitted any category requests yet" :
             filter === 'approved' ? "You don't have any approved category requests" :
             filter === 'rejected' ? "You don't have any rejected category requests" :
             filter === 'pending' ? "You don't have any pending category requests" :
             "You haven't submitted any category requests yet"}
          </p>
        </div>
      )}
    </div>
  );
};

export default MyCategoryRequests;