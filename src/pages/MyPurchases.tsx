import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePayment } from '@/hooks/usePayment';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ShoppingBag, Package, TrendingUp, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PurchasedProduct {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  category: string;
  image: string;
  status: string;
  purchaseDate: string;
  canResell: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseHistoryItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  listing_id: string;
  notes: any;
}

const MyPurchases: React.FC = () => {
  const { user } = useAuth();
  const { getPurchasedProducts, isLoading } = usePayment();
  const navigate = useNavigate();
  
  const [ownedProducts, setOwnedProducts] = useState<PurchasedProduct[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [activeTab, setActiveTab] = useState<'products' | 'history'>('products');

  useEffect(() => {
    if (user) {
      loadPurchasedProducts();
    }
  }, [user]);

  const loadPurchasedProducts = async () => {
    try {
      const result = await getPurchasedProducts();
      setOwnedProducts(result.ownedProducts);
      setPurchaseHistory(result.purchaseHistory);
      setTotalProducts(result.total);
    } catch (error) {
      console.error('Error loading purchased products:', error);
      toast.error('Failed to load your purchases');
    }
  };

  const handleResellProduct = (productId: string) => {
    // Navigate to the seller module to create a new listing for this product
    navigate(`/seller/manage-listings?productId=${productId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p>Please log in to view your purchases.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Purchases</h1>
        <p className="text-gray-600">
          Manage products you've purchased through auctions and resell them when ready.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products Owned</p>
                <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available to Resell</p>
                <p className="text-2xl font-bold text-green-600">
                  {ownedProducts.filter(p => p.canResell).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-purple-600">{purchaseHistory.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <Button
          variant={activeTab === 'products' ? 'default' : 'outline'}
          onClick={() => setActiveTab('products')}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          My Products ({totalProducts})
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Purchase History ({purchaseHistory.length})
        </Button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading your products...</p>
            </div>
          ) : ownedProducts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Yet</h3>
                <p className="text-gray-600 mb-4">
                  You haven't purchased any products through auctions yet.
                </p>
                <Button onClick={() => navigate('/auctions')} className="flex items-center gap-2">
                  Browse Auctions <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownedProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                      <Badge variant={product.canResell ? 'default' : 'secondary'}>
                        {product.canResell ? 'Available' : 'Listed'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description || 'No description available'}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Current Value:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(product.currentValue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Purchased:</span>
                        <span className="text-gray-900">
                          {formatDate(product.purchaseDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Category:</span>
                        <span className="text-gray-900">{product.category}</span>
                      </div>
                    </div>
                    
                    {product.canResell ? (
                      <Button
                        onClick={() => handleResellProduct(product.id)}
                        className="w-full flex items-center gap-2"
                      >
                        <TrendingUp className="h-4 w-4" />
                        List for Auction
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="w-full">
                        Currently Listed
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchase History Tab */}
      {activeTab === 'history' && (
        <div>
          {purchaseHistory.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Purchase History</h3>
                <p className="text-gray-600">Your purchase history will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {purchaseHistory.map((purchase) => (
                <Card key={purchase.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {purchase.notes?.product_name || 'Product Purchase'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Payment ID: {purchase.id}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(purchase.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(purchase.amount)}
                        </p>
                        <Badge variant="default">{purchase.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPurchases;