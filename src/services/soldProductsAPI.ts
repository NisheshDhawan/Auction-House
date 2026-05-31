import { API_BASE_URL } from './api';

export interface OwnershipRecord {
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

export interface SoldProduct {
  id: string;
  productId: string;
  productName: string;
  productDescription: string;
  productImage: string;
  category: string;
  originalBasePrice: number;
  currentValue: number;
  totalSales: number;
  firstSaleDate: string;
  lastSaleDate: string;
  timesResold: number;
  totalProfit: number;
  status: 'active' | 'sold' | 'inactive';
  ownershipHistory: OwnershipRecord[];
  currentOwner: {
    id: string;
    name: string;
    email: string;
    acquiredDate: string;
    paidAmount: number;
  };
  originalSeller: {
    id: string;
    name: string;
    email: string;
    listedDate: string;
    basePrice: number;
  };
  salesMetrics: {
    averageSalePrice: number;
    highestSalePrice: number;
    lowestSalePrice: number;
    averageHoldingPeriod: number; // in days
    profitMargin: number; // percentage
  };
}

class SoldProductsAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get sold products for a seller with complete ownership history
   */
  async getSoldProducts(sellerId: string): Promise<{
    soldProducts: SoldProduct[];
    total: number;
    statistics: {
      totalRevenue: number;
      totalProfit: number;
      averageSalePrice: number;
      totalResales: number;
      bestPerformingCategory: string;
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/sold-products/seller/${sellerId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch sold products');
    }

    return response.json();
  }

  /**
   * Get detailed ownership history for a specific product
   */
  async getProductOwnershipHistory(productId: string): Promise<{
    product: {
      id: string;
      name: string;
      description: string;
      originalPrice: number;
      currentValue: number;
    };
    ownershipHistory: OwnershipRecord[];
    salesMetrics: {
      totalSales: number;
      totalProfit: number;
      averageSalePrice: number;
      profitMargin: number;
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/sold-products/ownership-history/${productId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch ownership history');
    }

    return response.json();
  }

  /**
   * Get ownership analytics for seller
   */
  async getOwnershipAnalytics(sellerId: string, period: string = '30d'): Promise<{
    totalProductsSold: number;
    totalRevenue: number;
    totalProfit: number;
    averageSalePrice: number;
    totalResales: number;
    categoryBreakdown: Array<{
      category: string;
      count: number;
      revenue: number;
      profit: number;
    }>;
    monthlyTrend: Array<{
      month: string;
      sales: number;
      revenue: number;
      profit: number;
    }>;
    topPerformingProducts: Array<{
      id: string;
      name: string;
      totalProfit: number;
      profitMargin: number;
      timesResold: number;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/sold-products/analytics/${sellerId}?period=${period}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch ownership analytics');
    }

    return response.json();
  }

  /**
   * Track ownership transfer (called when payment is completed)
   */
  async trackOwnershipTransfer(data: {
    productId: string;
    fromUserId: string;
    toUserId: string;
    salePrice: number;
    acquisitionMethod: 'auction' | 'direct_sale' | 'transfer';
    paymentId: string;
    listingId?: string;
  }): Promise<{
    success: boolean;
    ownershipRecord: OwnershipRecord;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/sold-products/track-ownership`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to track ownership transfer');
    }

    return response.json();
  }

  /**
   * Get product value history and trends
   */
  async getProductValueHistory(productId: string): Promise<{
    product: {
      id: string;
      name: string;
      originalPrice: number;
    };
    valueHistory: Array<{
      date: string;
      value: number;
      salePrice?: number;
      event: 'listed' | 'sold' | 'relisted';
      owner: string;
    }>;
    trends: {
      currentValue: number;
      valueAppreciation: number; // percentage
      averageHoldingPeriod: number; // days
      volatility: number; // price variance
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/sold-products/value-history/${productId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch product value history');
    }

    return response.json();
  }

  /**
   * Get seller performance metrics
   */
  async getSellerPerformanceMetrics(sellerId: string): Promise<{
    overallMetrics: {
      totalProductsCreated: number;
      totalProductsSold: number;
      sellThroughRate: number; // percentage
      averageTimeToSell: number; // days
      customerRetentionRate: number; // percentage
    };
    revenueMetrics: {
      totalRevenue: number;
      totalProfit: number;
      averageProfit: number;
      profitMargin: number; // percentage
      revenueGrowth: number; // percentage
    };
    productMetrics: {
      mostPopularCategory: string;
      highestValueProduct: {
        name: string;
        value: number;
      };
      mostResoldProduct: {
        name: string;
        resaleCount: number;
      };
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/sold-products/seller-metrics/${sellerId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch seller performance metrics');
    }

    return response.json();
  }
}

export const soldProductsAPI = new SoldProductsAPI();