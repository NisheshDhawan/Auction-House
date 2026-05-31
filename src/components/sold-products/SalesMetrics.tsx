import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Clock,
  Target,
  Percent
} from 'lucide-react';

interface SalesMetricsProps {
  metrics: {
    averageSalePrice: number;
    highestSalePrice: number;
    lowestSalePrice: number;
    averageHoldingPeriod: number; // in days
    profitMargin: number; // percentage
  };
  originalPrice: number;
  totalSales: number;
  totalProfit: number;
}

const SalesMetrics = ({ 
  metrics, 
  originalPrice, 
  totalSales, 
  totalProfit 
}: SalesMetricsProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Format days
  const formatDays = (days: number) => {
    if (days < 30) {
      return `${Math.round(days)} days`;
    } else if (days < 365) {
      return `${Math.round(days / 30)} months`;
    } else {
      return `${Math.round(days / 365)} years`;
    }
  };

  // Get trend indicator
  const getTrendIndicator = (current: number, original: number) => {
    if (current > original) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (current < original) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
  };

  // Calculate value appreciation
  const valueAppreciation = originalPrice > 0 
    ? ((metrics.averageSalePrice - originalPrice) / originalPrice) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Average Sale Price */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Sale Price</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(metrics.averageSalePrice)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIndicator(metrics.averageSalePrice, originalPrice)}
                <span className={`text-xs ${
                  valueAppreciation > 0 ? 'text-green-600' : 
                  valueAppreciation < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {valueAppreciation > 0 ? '+' : ''}{valueAppreciation.toFixed(1)}% vs original
                </span>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* Highest Sale Price */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Highest Sale</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(metrics.highestSalePrice)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">
                  Peak value
                </span>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Lowest Sale Price */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Lowest Sale</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(metrics.lowestSalePrice)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-orange-600">
                  Minimum value
                </span>
              </div>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      {/* Average Holding Period */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Holding Period</p>
              <p className="text-xl font-bold text-purple-600">
                {formatDays(metrics.averageHoldingPeriod)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-purple-600">
                  Time to resell
                </span>
              </div>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      {/* Profit Margin */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Profit Margin</p>
              <p className="text-xl font-bold text-indigo-600">
                {metrics.profitMargin.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Percent className="w-3 h-3 text-indigo-500" />
                <span className="text-xs text-indigo-600">
                  {formatCurrency(totalProfit)} total
                </span>
              </div>
            </div>
            <Percent className="w-8 h-8 text-indigo-500" />
          </div>
        </CardContent>
      </Card>

      {/* Total Sales */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold text-teal-600">
                {totalSales}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Target className="w-3 h-3 text-teal-500" />
                <span className="text-xs text-teal-600">
                  Completed transactions
                </span>
              </div>
            </div>
            <Target className="w-8 h-8 text-teal-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesMetrics;