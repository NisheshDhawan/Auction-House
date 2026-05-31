import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { categoryRequestsAPI, CategoryRequest, ReviewCategoryRequestData } from '@/services/categoryRequestsAPI';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User, 
  MessageSquare,
  Check,
  X,
  Mail
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CategoryRequestsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CategoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CategoryRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Fetch category requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        const response = await categoryRequestsAPI.getAllCategoryRequests();
        setRequests(response.requests);
      } catch (error: any) {
        toast({
          title: "Error loading requests",
          description: error.message || "Failed to load category requests",
          variant: "destructive",
        });
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [toast]);

  // Handle request review
  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return;

    try {
      setIsReviewing(requestId);
      
      const reviewData: ReviewCategoryRequestData = {
        status,
        adminNotes: reviewNotes.trim() || undefined,
        reviewedBy: user.id,
        reviewedByName: user.fullName || 'Admin'
      };

      const updatedRequest = await categoryRequestsAPI.reviewCategoryRequest(requestId, reviewData);
      
      // Update the requests list
      setRequests(prev => prev.map(req => 
        req.id === requestId ? updatedRequest : req
      ));
      
      toast({
        title: `Request ${status}`,
        description: `Category request has been ${status}. The user will be notified via email.`,
      });

      // Reset review dialog
      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes('');
    } catch (error: any) {
      toast({
        title: "Review failed",
        description: error.message || "Failed to review category request",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(null);
    }
  };

  const openReviewDialog = (request: CategoryRequest) => {
    setSelectedRequest(request);
    setReviewNotes('');
    setReviewDialogOpen(true);
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

  const filteredRequests = requests.filter(request => {
    if (activeTab === 'all') return true;
    return request.status === activeTab;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (isLoading) {
    return <LoadingScreen title="Loading Requests" description="Fetching category requests..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Category Requests Management</h2>
        <p className="text-muted-foreground">
          Review and manage user-submitted category requests
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedCount})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
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
                          <Button 
                            onClick={() => openReviewDialog(request)}
                            size="sm"
                            className="ml-2"
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Request Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>By: {request.requestedByName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{request.requestedByEmail}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Status Details */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border">
                      {getStatusIcon(request.status)}
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          {request.status === 'pending' && 'Awaiting Review'}
                          {request.status === 'approved' && 'Approved & Category Created'}
                          {request.status === 'rejected' && 'Request Rejected'}
                        </div>
                        
                        {request.reviewedAt && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Reviewed on {new Date(request.reviewedAt).toLocaleDateString()} 
                            {request.reviewedByName && ` by ${request.reviewedByName}`}
                          </p>
                        )}
                        
                        {request.adminNotes && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 mb-1">
                              <MessageSquare className="h-3 w-3" />
                              <span className="text-xs font-medium">Admin Notes:</span>
                            </div>
                            <p className="text-xs bg-muted p-2 rounded border">
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
                No {activeTab === 'all' ? '' : activeTab} requests
              </h3>
              <p className="text-muted-foreground">
                {activeTab === 'pending' 
                  ? "No category requests are waiting for review"
                  : `No ${activeTab} category requests found`
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Category Request</DialogTitle>
            <DialogDescription>
              Review the request for "{selectedRequest?.name}" category
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Request Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Category:</strong> {selectedRequest.name}</div>
                  {selectedRequest.description && (
                    <div><strong>Description:</strong> {selectedRequest.description}</div>
                  )}
                  <div><strong>Requested by:</strong> {selectedRequest.requestedByName} ({selectedRequest.requestedByEmail})</div>
                  <div><strong>Submitted:</strong> {new Date(selectedRequest.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes for the user (will be included in the email notification)"
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Email Notification</h4>
                <p className="text-sm text-blue-800">
                  The user will receive an email notification with your decision and any notes you provide.
                  If approved, the category will be created automatically.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isReviewing !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleReviewRequest(selectedRequest.id, 'rejected')}
              disabled={isReviewing !== null}
            >
              {isReviewing === selectedRequest?.id ? (
                <>Processing...</>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
            <Button
              onClick={() => selectedRequest && handleReviewRequest(selectedRequest.id, 'approved')}
              disabled={isReviewing !== null}
            >
              {isReviewing === selectedRequest?.id ? (
                <>Processing...</>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryRequestsManager;