import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useToast } from '@/hooks/use-toast';
import { purchasesAPI, Purchase } from '@/services/purchasesAPI';
import { ImageDisplay } from '@/components/ui/image-display';
import { usePayment } from '@/hooks/usePayment';
import { 
  Package, 
  Calendar, 
  ShoppingBag,
  Trophy,
  CreditCard,
  CheckCircle
} from 'lucide-react';

const MyProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Create a Set of paid item IDs for quick lookup
  const paidItems = new Set(purchases.filter(p => p.isPaid).map(p => p.id));

  const { 
    isLoading: paymentLoading, 
    processPurchasePayment,
  } = usePayment();

  // Fetch user's purchases
  const fetchPurchases = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const response = await purchasesAPI.getUserPurchases(user.id);
      setPurchases(response.purchases);
    } catch (error: any) {
      toast({
        title: "Error loading purchases",
        description: error.message || "Failed to load your purchased items",
        variant: "destructive",
      });
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [user?.id, toast]);

  // Handle payment for a purchase
  const handleMakePayment = async (purchase: Purchase) => {
    try {
      setSelectedPurchase(purchase);
      
      console.log('Making payment for purchase:', {
        id: purchase.id,
        finalPrice: purchase.finalPrice,
        finalPriceType: typeof purchase.finalPrice,
        productName: purchase.productName
      });
      
      // Use the new purchase payment flow
      await processPurchasePayment(
        purchase.id,
        purchase.finalPrice,
        purchase.listingId,
        purchase.productName,
        (response) => {
          // Payment successful
          console.log('Purchase payment successful:', response);
          setSelectedPurchase(null);
          
          toast({
            title: "Payment Successful! 🎉",
            description: `Payment completed for ${purchase.productName}. The product is now yours and you can resell it from your seller dashboard!`,
          });
          
          // Refresh the purchases list to get updated data from server
          fetchPurchases();
        },
        (error) => {
          // Payment failed
          console.error('Purchase payment failed:', error);
          setSelectedPurchase(null);
          
          toast({
            title: "Payment Failed",
            description: error.message || "Payment could not be processed",
            variant: "destructive",
          });
        }
      );
      
    } catch (error) {
      console.error('Error creating payment order:', error);
      toast({
        title: "Payment Error",
        description: "Failed to create payment order. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if item is paid
  const isItemPaid = (purchase: Purchase) => {
    return purchase.isPaid === true;
  };

  if (isLoading) {
    return <LoadingScreen title="Loading Your Products" description="Fetching your purchased items..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">My Products</h1>
            <p className="text-muted-foreground mt-2">
              Items you've won in auctions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">{purchases.length} Items Won</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{purchases.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ₹{purchases.reduce((sum, p) => sum + p.finalPrice, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {paidItems.size}
              </div>
              <div className="text-sm text-muted-foreground">Paid Items</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {purchases.length - paidItems.size}
              </div>
              <div className="text-sm text-muted-foreground">Pending Payment</div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        {purchases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="glass-card hover-tilt">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{purchase.productName}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        Won for: ₹{purchase.finalPrice.toLocaleString('en-IN')}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge variant="default" className="bg-green-500">
                        WON
                      </Badge>
                      {isItemPaid(purchase) ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          PAID
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          PENDING
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Product Image */}
                  <div className="w-full h-32 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
                    <ImageDisplay
                      imageId={purchase.productImage}
                      alt={purchase.productName}
                      className="w-full h-full object-cover rounded-lg"
                      fallbackClassName="w-full h-full flex items-center justify-center"
                      showLoader={false}
                    />
                  </div>

                  {/* Purchase Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Category:</span>
                      <Badge variant="outline">{purchase.category}</Badge>
                    </div>
                    
                    {purchase.sellerName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Seller:</span>
                        <span className="text-sm font-medium">{purchase.sellerName}</span>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Won on: {new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Auction ended: {new Date(purchase.auctionEndDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Final Price Highlight */}
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-700">Final Price:</span>
                        <span className="text-lg font-bold text-green-700">
                          ₹{purchase.finalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Payment Button */}
                    <div className="pt-2">
                      {isItemPaid(purchase) ? (
                        <Button 
                          variant="outline" 
                          className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          disabled
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Payment Completed
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleMakePayment(purchase)}
                          disabled={paymentLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          {paymentLoading ? 'Processing...' : 'Make Payment'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't won any auctions yet. Start bidding to add items to your collection!
            </p>
            <Button 
              onClick={() => window.location.href = '/products'}
              className="bg-primary hover:bg-primary/90"
            >
              Browse Auctions
            </Button>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default MyProducts;