import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Crown, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Gavel,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';

interface OwnershipRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  acquiredDate: string;
  soldDate?: string;
  purchasePrice: number;
  salePrice?: number;
  isCurrentOwner: boolean;
  acquisitionMethod: 'auction' | 'direct_sale' | 'transfer';
  paymentStatus: 'completed' | 'pending' | 'failed';
}

interface OwnershipTimelineProps {
  ownershipHistory: OwnershipRecord[];
  productName: string;
}

const OwnershipTimeline = ({ ownershipHistory, productName }: OwnershipTimelineProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get acquisition method icon
  const getAcquisitionIcon = (method: string) => {
    switch (method) {
      case 'auction':
        return <Gavel className="w-4 h-4" />;
      case 'direct_sale':
        return <ShoppingCart className="w-4 h-4" />;
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Ownership Timeline: {productName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {ownershipHistory.map((record, index) => (
            <div key={record.id} className="flex items-start gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  record.isCurrentOwner 
                    ? 'bg-green-500 border-green-500' 
                    : 'bg-blue-500 border-blue-500'
                }`} />
                {index < ownershipHistory.length - 1 && (
                  <div className="w-px h-16 bg-border mt-2" />
                )}
              </div>
              
              {/* Record details */}
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{record.userName}</span>
                    {record.isCurrentOwner && (
                      <Crown className="w-4 h-4 text-yellow-500" title="Current Owner" />
                    )}
                  </div>
                  {getPaymentStatusBadge(record.paymentStatus)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Acquired:</span>
                      <div className="font-medium">{formatDate(record.acquiredDate)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Purchase Price:</span>
                      <div className="font-medium text-green-600">
                        {formatCurrency(record.purchasePrice)}
                      </div>
                    </div>
                  </div>
                  
                  {record.soldDate && (
                    <>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Sold:</span>
                          <div className="font-medium">{formatDate(record.soldDate)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Sale Price:</span>
                          <div className="font-medium text-blue-600">
                            {formatCurrency(record.salePrice || 0)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {getAcquisitionIcon(record.acquisitionMethod)}
                    <div>
                      <span className="text-muted-foreground">Method:</span>
                      <div className="font-medium capitalize">
                        {record.acquisitionMethod.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <div className="font-medium text-xs">{record.userEmail}</div>
                    </div>
                  </div>
                </div>
                
                {/* Profit/Loss indicator */}
                {record.soldDate && record.salePrice && (
                  <div className="mt-3 p-2 rounded-lg bg-background/50 border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Profit/Loss:</span>
                      <span className={`font-semibold ${
                        record.salePrice > record.purchasePrice 
                          ? 'text-green-600' 
                          : record.salePrice < record.purchasePrice 
                            ? 'text-red-600' 
                            : 'text-muted-foreground'
                      }`}>
                        {record.salePrice > record.purchasePrice ? '+' : ''}
                        {formatCurrency(record.salePrice - record.purchasePrice)}
                        {record.purchasePrice > 0 && (
                          <span className="ml-1 text-xs">
                            ({((record.salePrice - record.purchasePrice) / record.purchasePrice * 100).toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {ownershipHistory.length === 0 && (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Ownership History</h3>
            <p className="text-muted-foreground">
              This product hasn't been sold yet or ownership data is not available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OwnershipTimeline;