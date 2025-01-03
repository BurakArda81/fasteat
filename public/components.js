import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
// API yardımcı fonksiyonlar
const BASE_URL = 'http://localhost:5000/api';

const api = {
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'API error');
    }
    
    return data.data;
  },

  async post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'API error');
    }
    
    return data.data;
  }
};

export default api;

// DashboardMetrics component
export const DashboardMetrics = () => {
  const [viewType, setViewType] = useState('Revenue');
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    totalOrders: 0,
    revenueGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchOrders = async (year, cityId, restaurantId) => {
    const params = new URLSearchParams({
      year: year.toString(),
      ...(cityId && { cityId }),
      ...(restaurantId && { restaurantId })
    });

    const response = await fetch(`${BASE_URL}/orders?${params}`);
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'API error');
    }
    
    return data.data;
  };

  const calculateStats = async (orders, currentMonth, currentYear) => {
    // Önceki ayların ciro ortalamasını hesapla
    const previousMonthsOrders = orders.filter(order => {
      const orderDate = new Date(order.SiparisTarihi);
      const orderMonth = orderDate.getMonth() + 1;
      const orderYear = orderDate.getFullYear();
      return orderYear <= currentYear && orderMonth < currentMonth;
    });

    const currentMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.SiparisTarihi);
      const orderMonth = orderDate.getMonth() + 1;
      const orderYear = orderDate.getFullYear();
      return orderMonth === currentMonth && orderYear === currentYear;
    });

    // Önceki ayların ortalaması
    const previousAvgRevenue = previousMonthsOrders.length > 0 
      ? previousMonthsOrders.reduce((sum, order) => sum + order.GunlukCiro, 0) / previousMonthsOrders.length
      : 0;

    // Bu ayın ortalaması
    const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + order.GunlukCiro, 0);
    const currentMonthAvgRevenue = currentMonthOrders.length > 0 
      ? currentMonthRevenue / currentMonthOrders.length 
      : 0;

    // Yüzdelik değişim
    const revenueGrowth = previousAvgRevenue === 0 
      ? 0 
      : ((currentMonthAvgRevenue - previousAvgRevenue) / previousAvgRevenue) * 100;

    // Toplam sipariş sayısı
    const totalOrders = orders.reduce((sum, order) => sum + order.ToplamSiparis, 0);

    return {
      revenue: currentMonthRevenue,
      totalOrders,
      revenueGrowth
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const year = document.getElementById('orderYear')?.value || new Date().getFullYear().toString();
      const month = document.getElementById('orderMonth')?.value || (new Date().getMonth() + 1).toString();
      const cityId = document.getElementById('citySelect')?.value;
      const restaurantId = document.getElementById('restaurantSelect')?.value;

      // Son 3 yılın verilerini çek
      const currentYear = parseInt(year);
      const [currentYearData, prevYearData, twoPrevYearData] = await Promise.all([
        fetchOrders(currentYear, cityId, restaurantId),
        fetchOrders(currentYear - 1, cityId, restaurantId),
        fetchOrders(currentYear - 2, cityId, restaurantId)
      ]);

      // İstatistikleri hesapla
      const currentStats = await calculateStats(
        currentYearData.orders, 
        parseInt(month),
        currentYear
      );

      setStats(currentStats);

      // Growth Chart için veri hazırla
      const monthlyData = new Array(12).fill(null).map((_, index) => {
        const monthNum = index + 1;
        
        const getCurrentYearMonthData = (yearData, monthNum) => {
          if (!yearData || !yearData.orders) return { revenue: 0, orders: 0 };
          
          const monthOrders = yearData.orders.filter(order => {
            const orderMonth = new Date(order.SiparisTarihi).getMonth() + 1;
            return orderMonth === monthNum;
          });

          return {
            revenue: monthOrders.reduce((sum, order) => sum + order.GunlukCiro, 0),
            orders: monthOrders.reduce((sum, order) => sum + order.ToplamSiparis, 0)
          };
        };

        const currentYearMonth = getCurrentYearMonthData(currentYearData, monthNum);
        const prevYearMonth = getCurrentYearMonthData(prevYearData, monthNum);
        const twoPrevYearMonth = getCurrentYearMonthData(twoPrevYearData, monthNum);

        return {
          name: new Date(2000, index).toLocaleString('default', { month: 'short' }),
          currentYear: viewType === 'Revenue' ? currentYearMonth.revenue : currentYearMonth.orders,
          prevYear: viewType === 'Revenue' ? prevYearMonth.revenue : prevYearMonth.orders,
          twoPrevYear: viewType === 'Revenue' ? twoPrevYearMonth.revenue : twoPrevYearMonth.orders
        };
      });

      setData(monthlyData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
      applyFiltersBtn.addEventListener('click', fetchData);
      fetchData();
    }
    return () => {
      if (applyFiltersBtn) {
        applyFiltersBtn.removeEventListener('click', fetchData);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading) fetchData();
  }, [viewType]);

  return (
    <div className="dashboard-metrics-grid">
      {/* Accounting Overview */}
      <div className="metrics-card">
        <div className="metrics-header">
          <h2>Accounting Overview</h2>
        </div>
        <div className="metrics-content">
          <div className={`p-4 rounded-lg ${stats.revenueGrowth >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="flex justify-between items-center">
              <span>Revenue</span>
              <span className={`text-xl font-bold ${stats.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                €{stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-sm ml-2">
                  {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}%
                </span>
              </span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 mt-4">
            <div className="flex justify-between items-center">
              <span>Total Orders</span>
              <span className="text-xl font-bold">
                {stats.totalOrders.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Trends */}
      <div className="metrics-card">
        <div className="metrics-header">
          <h2>Growth Trends</h2>
          <div className="metrics-controls">
            <select 
              value={viewType} 
              onChange={(e) => setViewType(e.target.value)}
              className="metric-select"
            >
              <option value="Revenue">Revenue</option>
              <option value="Orders">Orders</option>
            </select>
          </div>
        </div>
        <div className="chart-container">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => 
                    viewType === 'Revenue' 
                      ? `€${value.toLocaleString()}`
                      : value.toLocaleString()
                  }
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="currentYear"
                  name={`${viewType} (${new Date().getFullYear()})`}
                  stroke="#2563eb"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="prevYear"
                  name={`${viewType} (${new Date().getFullYear() - 1})`}
                  stroke="#82ca9d"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="twoPrevYear"
                  name={`${viewType} (${new Date().getFullYear() - 2})`}
                  stroke="#ff7300"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
// AnalysisDashboard component
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export const Analysis = () => {
    const customPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, index, payload }) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 30;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
        return (
            <text x={x} y={y} fill="#666" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {payload.type} ({value})
            </text>
        );
    };

    // State management
    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        cityId: '',
        restaurantId: ''
    });

    const [cities, setCities] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [data, setData] = useState({
        revenueComparison: [],
        categoryAnalysis: [],
        feedbackAnalysis: [],
        courierPerformance: [],
        customerSatisfaction: [],
        averageOrderValue: []
    });
    const [loading, setLoading] = useState(true);

    // Colors for charts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF99E6'];

    // Fetch cities on component mount
    useEffect(() => {
        const fetchCities = async () => {
            try {
                const response = await fetch('/api/cities');
                const result = await response.json();
                if (result.status === 'success') {
                    setCities(result.data);
                }
            } catch (error) {
                console.error('Error fetching cities:', error);
            }
        };
        fetchCities();
    }, []);

    // Fetch restaurants when city changes
    useEffect(() => {
        const fetchRestaurants = async () => {
            if (!filters.cityId) {
                setRestaurants([]);
                return;
            }
            try {
                const response = await fetch(`/api/restaurants?cityId=${filters.cityId}`);
                const result = await response.json();
                if (result.status === 'success') {
                    setRestaurants(result.data);
                }
            } catch (error) {
                console.error('Error fetching restaurants:', error);
            }
        };
        fetchRestaurants();
    }, [filters.cityId]);

    // Fetch analysis data when filters change
    useEffect(() => {
        const fetchAnalysisData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams(filters);
                
                // Fetch main analysis data and courier performance in parallel
                const [analysisResponse, courierResponse] = await Promise.all([
                    fetch(`/api/analysis/dashboard?${params}`),
                    fetch(`/api/analysis/courier-performance?${params}`)
                ]);

                const analysisData = await analysisResponse.json();
                const courierData = await courierResponse.json();

                if (analysisData.status === 'success' && courierData.status === 'success') {
                    setData({
                        ...analysisData.data,
                        courierPerformance: courierData.data
                    });
                }
            } catch (error) {
                console.error('Error fetching analysis data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalysisData();
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96">Loading...</div>;
    }

    return (
        <div className="p-4 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                        name="year"
                        value={filters.year}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded"
                    >
                        {[...Array(6)].map((_, i) => (
                            <option key={i} value={2019 + i}>
                                {2019 + i}
                            </option>
                        ))}
                    </select>

                    <select
                        name="month"
                        value={filters.month}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded"
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={i + 1}>
                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>

                    <select
                        name="cityId"
                        value={filters.cityId}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded"
                    >
                        <option value="">Tüm Şehirler</option>
                        {cities.map(city => (
                            <option key={city.CityID} value={city.CityID}>
                                {city.CityName}
                            </option>
                        ))}
                    </select>

                    <select
                        name="restaurantId"
                        value={filters.restaurantId}
                        onChange={handleFilterChange}
                        className="w-full p-2 border rounded"
                        disabled={!filters.cityId}
                    >
                        <option value="">Tüm Restoranlar</option>
                        {restaurants.map(restaurant => (
                            <option key={restaurant.RestaurantID} value={restaurant.RestaurantID}>
                                {restaurant.RestaurantName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue Comparison */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4">Ciro Karşılaştırması</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.revenueComparison}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="currentYear" 
                                stroke="#8884d8" 
                                name="Bu Yıl" 
                                strokeWidth={2}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="previousYear" 
                                stroke="#82ca9d" 
                                name="Geçen Yıl"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Analysis */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4">Kategori Bazlı Analiz</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.categoryAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" />
                            <YAxis domain={[0, 'auto']} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" fill="#8884d8" name="Ciro (€)" />
                            <Bar dataKey="totalQuantity" fill="#82ca9d" name="Sipariş Adedi" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Feedback Distribution */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4">Feedback Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data.feedbackAnalysis}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={customPieLabel}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {data.feedbackAnalysis.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Courier Performance */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4">Kurye Performansı</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.courierPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="Month" />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="AverageRating" 
                                stroke="#8884d8" 
                                name="Kurye Değerlendirmesi"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Customer Satisfaction */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4">Müşteri Memnuniyeti Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.customerSatisfaction}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="rating" 
                                stroke="#8884d8" 
                                name="Memnuniyet (1-5)"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Average Order Value */}
                <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-4">Ortalama Sipariş Değeri</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.averageOrderValue}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="avgValue" 
                                stroke="#8884d8" 
                                name="Ortalama Sipariş"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
    
  //acc
export const AccountingDashboard = () => {
      // State tanımlamaları
      const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        cityId: '',
        restaurantId: ''
      });
    
      const [projectionParams, setProjectionParams] = useState({
        growthRate: 25,
        months: 12,
        expectedRating: 4.5
      });
    
      const [currentStats, setCurrentStats] = useState({
        revenue: 0,
        orders: 0,
        averageOrderValue: 0,
        rating: 0
      });
    
      const [projections, setProjections] = useState({
        revenue: [],
        orders: [],
        rating: []
      });
    
      const [cities, setCities] = useState([]);
      const [restaurants, setRestaurants] = useState([]);
      const [loading, setLoading] = useState(true);
    
      // Şehirleri yükle
      useEffect(() => {
        const fetchCities = async () => {
          try {
            const response = await fetch('/api/cities');
            const result = await response.json();
            if (result.status === 'success') {
              setCities(result.data);
            }
          } catch (error) {
            console.error('Error fetching cities:', error);
          }
        };
        fetchCities();
      }, []);
    
      // Şehir seçildiğinde restoranları yükle
      useEffect(() => {
        const fetchRestaurants = async () => {
          if (!filters.cityId) {
            setRestaurants([]);
            return;
          }
          try {
            const response = await fetch(`/api/restaurants?cityId=${filters.cityId}`);
            const result = await response.json();
            if (result.status === 'success') {
              setRestaurants(result.data);
            }
          } catch (error) {
            console.error('Error fetching restaurants:', error);
          }
        };
        fetchRestaurants();
      }, [filters.cityId]);
    
      // Mevcut istatistikleri yükle
      useEffect(() => {
        const fetchCurrentStats = async () => {
          setLoading(true);
          try {
            const params = new URLSearchParams(filters);
            const ordersResponse = await fetch(`/api/orders?${params}`);
            const ordersResult = await ordersResponse.json();
    
            if (ordersResult.status === 'success' && ordersResult.data.orders) {
              const stats = calculateCurrentStats(ordersResult.data.orders);
              setCurrentStats(stats);
              calculateProjections(stats);
            }
          } catch (error) {
            console.error('Error fetching current stats:', error);
          } finally {
            setLoading(false);
          }
        };
        fetchCurrentStats();
      }, [filters]);
    
      const calculateCurrentStats = (orders) => {
        if (!orders || orders.length === 0) return {
          revenue: 0,
          orders: 0,
          averageOrderValue: 0,
          rating: 0
        };
    
        const totalOrders = orders.reduce((sum, order) => sum + order.ToplamSiparis, 0);
        const totalRevenue = orders.reduce((sum, order) => sum + order.GunlukCiro, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
        const ratings = orders.filter(order => order.rating);
        const averageRating = ratings.length > 0 
          ? ratings.reduce((sum, order) => sum + order.rating, 0) / ratings.length 
          : 0;
    
        return {
          revenue: totalRevenue,
          orders: totalOrders,
          averageOrderValue: averageOrderValue,
          rating: averageRating
        };
      };
    
      const calculateProjections = (baseStats) => {
        const revenueProjections = [];
        const orderProjections = [];
        const ratingProjections = [];
    
        let currentRevenue = baseStats.revenue;
        let currentOrders = baseStats.orders;
        let currentRating = baseStats.rating;
    
        // Aylık büyüme/küçülme oranı (-1 ile 1 arasında)
    const monthlyGrowthRate = projectionParams.growthRate / 100;

    for (let i = 1; i <= projectionParams.months; i++) {
        // Negatif oranlar için de çalışacak
        currentRevenue *= (1 + monthlyGrowthRate);
        currentOrders *= (1 + monthlyGrowthRate);

        revenueProjections.push({
            month: i,
            projected: Math.max(0, currentRevenue), // Negatif gelir olmaması için
            baseline: baseStats.revenue
        });

        orderProjections.push({
            month: i,
            projected: Math.max(0, currentOrders), // Negatif sipariş olmaması için
            baseline: baseStats.orders
        });

        const ratingDiff = projectionParams.expectedRating - currentRating;
        currentRating += ratingDiff / projectionParams.months;
        ratingProjections.push({
            month: i,
            projected: Math.min(5, Math.max(0, currentRating)), // 0-5 arasında tutmak için
            baseline: baseStats.rating
        });
    }

    setProjections({
        revenue: revenueProjections,
        orders: orderProjections,
        rating: ratingProjections
    });

      };
    
      const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
          ...prev,
          [name]: value
        }));
      };
    
      const handleProjectionParamChange = (e) => {
        const { name, value } = e.target;
        setProjectionParams(prev => {
          const newParams = {
            ...prev,
            [name]: Number(value)
          };
          calculateProjections(currentStats);
          return newParams;
        });
      };
    
      if (!window.Recharts) {
        return <div className="p-4">Loading charts...</div>;
      }
    
      const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = window.Recharts;
    
      if (loading) {
        return <div className="flex items-center justify-center h-96">Loading...</div>;
      }
    
      return (
        <div className="p-4 space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              >
                {[...Array(6)].map((_, i) => (
                  <option key={i} value={2019 + i}>
                    {2019 + i}
                  </option>
                ))}
              </select>
    
              <select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
    
              <select
                name="cityId"
                value={filters.cityId}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Tüm Şehirler</option>
                {cities.map(city => (
                  <option key={city.CityID} value={city.CityID}>
                    {city.CityName}
                  </option>
                ))}
              </select>
    
              <select
                name="restaurantId"
                value={filters.restaurantId}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
                disabled={!filters.cityId}
              >
                <option value="">Tüm Restoranlar</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant.RestaurantID} value={restaurant.RestaurantID}>
                    {restaurant.RestaurantName}
                  </option>
                ))}
              </select>
            </div>
          </div>
    
          {/* Projection Parameters */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Tahmin Parametreleri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Büyüme ve Küçülme Oranı (%)
                </label>
                <input
                  type="number"
                  name="growthRate"
                  value={projectionParams.growthRate}
                  onChange={handleProjectionParamChange}
                  className="w-full p-2 border rounded"
                  min="-100"
                  max="100"
                  step="0.1"

                />
              </div>
    
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tahmin Süresi (Ay)
                </label>
                <input
                  type="number"
                  name="months"
                  value={projectionParams.months}
                  onChange={handleProjectionParamChange}
                  className="w-full p-2 border rounded"
                  min="1"
                  max="24"
                />
              </div>
    
              <div>
                <label className="block text-sm font-medium mb-1">
                  Hedef Rating (1-5)
                </label>
                <input
                  type="number"
                  name="expectedRating"
                  value={projectionParams.expectedRating}
                  onChange={handleProjectionParamChange}
                  className="w-full p-2 border rounded"
                  min="1"
                  max="5"
                  step="0.1"
                />
              </div>
            </div>
          </div>
    
          {/* Current Stats */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-4">Mevcut Durum</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-sm text-blue-600">Aylık Gelir</p>
                <p className="text-2xl font-bold">€{Math.round(currentStats.revenue).toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded">
                <p className="text-sm text-green-600">Sipariş Sayısı</p>
                <p className="text-2xl font-bold">{Math.round(currentStats.orders).toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded">
                <p className="text-sm text-purple-600">Ortalama Sipariş</p>
                <p className="text-2xl font-bold">€{Math.round(currentStats.averageOrderValue).toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded">
                <p className="text-sm text-yellow-600">Müşteri Puanı</p>
                <p className="text-2xl font-bold">{currentStats.rating.toFixed(1)}/5</p>
              </div>
            </div>
          </div>
    
          {/* Projection Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Projection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Gelir Tahmini</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projections.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `€${Math.round(value).toLocaleString()}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#8884d8" 
                    name="Tahmini Gelir"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke="#82ca9d" 
                    name="Mevcut Gelir"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
    
            {/* Orders Projection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Sipariş Tahmini</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projections.orders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => Math.round(value).toLocaleString()} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#8884d8" 
                    name="Tahmini Sipariş"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke="#82ca9d" 
                    name="Mevcut Sipariş"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
    
            {/* Rating Projection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">Rating Tahmini</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projections.rating}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip formatter={(value) => value.toFixed(1)} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#8884d8" 
                    name="Tahmini Rating"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke="#82ca9d" 
                    name="Mevcut Rating"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    };
    
    
// MessagesDashboard component
export const MessagesDashboard = () => {
   
        // State tanımlamaları
        const [filters, setFilters] = useState({
          cityId: '',
          restaurantId: ''
        });
      
        const [messageForm, setMessageForm] = useState({
          subject: '',
          content: '',
          priority: 'normal',
          restaurantId: ''
        });
      
        const [cities, setCities] = useState([]);
        const [restaurants, setRestaurants] = useState([]);
        const [messages, setMessages] = useState([]);
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState(null);
      
        // Şehirleri yükle
        useEffect(() => {
          const fetchCities = async () => {
            try {
              const response = await fetch('/api/cities');
              const result = await response.json();
              if (result.status === 'success') {
                setCities(result.data);
              }
            } catch (error) {
              console.error('Error fetching cities:', error);
            }
          };
          fetchCities();
        }, []);
      
        // Şehir seçildiğinde restoranları yükle
        useEffect(() => {
          const fetchRestaurants = async () => {
            if (!filters.cityId) {
              setRestaurants([]);
              return;
            }
            try {
              const response = await fetch(`/api/restaurants?cityId=${filters.cityId}`);
              const result = await response.json();
              if (result.status === 'success') {
                setRestaurants(result.data);
              }
            } catch (error) {
              console.error('Error fetching restaurants:', error);
            }
          };
          fetchRestaurants();
        }, [filters.cityId]);
      
        // Mesajları yükle
        useEffect(() => {
          const fetchMessages = async () => {
            try {
              const params = new URLSearchParams(filters);
              const response = await fetch(`/api/messages/history?${params}`);
              const result = await response.json();
              if (result.status === 'success') {
                setMessages(result.data);
              }
            } catch (error) {
              console.error('Error fetching messages:', error);
            }
          };
          fetchMessages();
        }, [filters]);
      
        // Handler Fonksiyonları
        const handleFilterChange = (e) => {
          const { name, value } = e.target;
          setFilters(prev => ({
            ...prev,
            [name]: value
          }));
        };
      
        const handleFormChange = (e) => {
          const { name, value } = e.target;
          setMessageForm(prev => ({
            ...prev,
            [name]: value
          }));
        };
      
        const handleSubmit = async (e) => {
          e.preventDefault();
          setLoading(true);
      
          try {
            const response = await fetch('/api/messages/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(messageForm)
            });
      
            const result = await response.json();
      
            if (result.status === 'success') {
              setAlert({
                type: 'success',
                message: 'Mesaj başarıyla gönderildi!'
              });
              
              // Formu temizle
              setMessageForm({
                subject: '',
                content: '',
                priority: 'normal',
                restaurantId: ''
              });
              
              // Mesaj listesini güncelle
              const params = new URLSearchParams(filters);
              const messagesResponse = await fetch(`/api/messages/history?${params}`);
              const messagesResult = await messagesResponse.json();
              if (messagesResult.status === 'success') {
                setMessages(messagesResult.data);
              }
            }
          } catch (error) {
            setAlert({
              type: 'error',
              message: 'Mesaj gönderilirken bir hata oluştu'
            });
          } finally {
            setLoading(false);
          }
        };
      
        const handleMarkAsRead = async (messageId) => {
          try {
            const response = await fetch(`/api/messages/${messageId}/read`, {
              method: 'PUT'
            });
      
            if (response.ok) {
              // Mesaj listesini güncelle
              const updatedMessages = messages.map(msg => 
                msg.id === messageId ? { ...msg, status: 'read' } : msg
              );
              setMessages(updatedMessages);
            }
          } catch (error) {
            console.error('Error marking message as read:', error);
          }
        };
      
        const formatDate = (dateString) => {
          return new Date(dateString).toLocaleString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        };
      
        return (
          <div className="p-4 space-y-6">
            {/* Alert */}
            {alert && (
              <div className={`p-4 rounded-lg mb-4 ${
                alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {alert.message}
              </div>
            )}
      
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  name="cityId"
                  value={filters.cityId}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Tüm Şehirler</option>
                  {cities.map(city => (
                    <option key={city.CityID} value={city.CityID}>
                      {city.CityName}
                    </option>
                  ))}
                </select>
      
                <select
                  name="restaurantId"
                  value={filters.restaurantId}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded"
                  disabled={!filters.cityId}
                >
                  <option value="">Tüm Restoranlar</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.RestaurantID} value={restaurant.RestaurantID}>
                      {restaurant.RestaurantName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
      
            {/* Message Form */}
            <div className="bg-white rounded-lg shadow p-4">
      
      
              <h3 className="text-lg font-semibold mb-4">Yeni Mesaj</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Restoran</label>
                  <select
                    name="restaurantId"
                    value={messageForm.restaurantId}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">Restoran Seçin</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.RestaurantID} value={restaurant.RestaurantID}>
                        {restaurant.RestaurantName}
                      </option>
                    ))}
                  </select>
                </div>
      
                <div>
                  <label className="block text-sm font-medium mb-1">Konu</label>
                  <input
                    type="text"
                    name="subject"
                    value={messageForm.subject}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
      
                <div>
                  <label className="block text-sm font-medium mb-1">Mesaj</label>
                  <textarea
                    name="content"
                    value={messageForm.content}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded h-32"
                    required
                  />
                </div>
      
                <div>
                  <label className="block text-sm font-medium mb-1">Öncelik</label>
                  <select
                    name="priority"
                    value={messageForm.priority}
                    onChange={handleFormChange}
                    className="w-full p-2 border rounded"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
      
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </form>
            </div>
      
            {/* Messages History */}
            <div className="bg-white rounded-lg shadow p-4">
      
      
              <h3 className="text-lg font-semibold mb-4">Mesaj Geçmişi</h3>
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className="border rounded p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{message.subject}</h4>
                          <p className="text-sm text-gray-600">
                            {message.restaurantName} - {message.cityName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`
                            px-2 py-1 rounded text-sm
                            ${message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              message.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'}
                          `}>
                            {message.priority === 'urgent' ? 'Acil' :
                              message.priority === 'high' ? 'Yüksek' : 'Normal'}
                          </span>
                          <span className={`
                            px-2 py-1 rounded text-sm
                            ${message.status === 'read' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'}
                          `}>
                            {message.status === 'read' ? 'Okundu' : 'Okunmadı'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700 whitespace-pre-wrap">{message.content}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {formatDate(message.sentAt)}
                        </span>
                        {message.status !== 'read' && (
                          <button
                            onClick={() => handleMarkAsRead(message.id)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Okundu olarak işaretle
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Henüz mesaj bulunmuyor
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      };
      
      // Bileşeni hem export et hem de window objesine ekle
      


// SettingsDashboard component
export const SettingsDashboard = () => {
        // State tanımlamaları
        const [activeTab, setActiveTab] = useState('profile');
        const [settings, setSettings] = useState({
          theme: 'light',
          language: 'tr',
          emailNotifications: true,
          appNotifications: true
        });
        
        const [profile, setProfile] = useState({
          name: 'Admin User',
          email: 'admin@fasteat.com',
          phone: '',
          city: ''
        });
      
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState(null);
      
        // Sekme menüsü için veriler
        const tabs = [
          { id: 'profile', name: 'Profil', icon: 'user' },
          { id: 'appearance', name: 'Görünüm', icon: 'paint-brush' },
          { id: 'notifications', name: 'Bildirimler', icon: 'bell' },
          { id: 'security', name: 'Güvenlik', icon: 'shield' }
        ];
      
        // Settings verilerini yükle
        useEffect(() => {
          const fetchSettings = async () => {
            try {
              const response = await fetch('/api/settings/get');
              const data = await response.json();
              if (data.status === 'success') {
                setSettings(data.data);
              }
            } catch (error) {
              console.error('Settings yüklenirken hata:', error);
            }
          };
          
          fetchSettings();
        }, []);
      
        // Form gönderme işleyicisi
        const handleSubmit = async (e) => {
          e.preventDefault();
          setLoading(true);
      
          try {
            const response = await fetch('/api/settings/update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(settings)
            });
      
            const data = await response.json();
      
            if (data.status === 'success') {
              setAlert({
                type: 'success',
                message: 'Ayarlar başarıyla güncellendi!'
              });
            } else {
              throw new Error(data.message);
            }
          } catch (error) {
            setAlert({
              type: 'error',
              message: 'Ayarlar güncellenirken bir hata oluştu'
            });
          } finally {
            setLoading(false);
          }
        };
      
        // Input değişiklik işleyicisi
        const handleInputChange = (e) => {
          const { name, value, type, checked } = e.target;
          setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
          }));
        };
      
        return (
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sol Menü */}
            <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
                <nav className="space-y-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-2 p-2 rounded ${
                        activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                      }`}
                    >
                      <i className={`fas fa-${tab.icon}`}></i>
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
      
            {/* Sağ İçerik */}
            <div className="col-span-1 md:col-span-3">
              {alert && (
                <div className={`p-4 rounded-lg mb-4 ${
                  alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {alert.message}
                </div>
              )}
      
      <div className="bg-white rounded-lg shadow p-4">
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Profil Ayarları</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Ad Soyad</label>
                        <input
                          type="text"
                          name="name"
                          value={profile.name}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={profile.email}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </form>
                  </div>
                )}
      
                {activeTab === 'appearance' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Görünüm Ayarları</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Tema</label>
                        <select
                          name="theme"
                          value={settings.theme}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                        >
                          <option value="light">Açık Tema</option>
                          <option value="dark">Koyu Tema</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Dil</label>
                        <select
                          name="language"
                          value={settings.language}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                        >
                          <option value="tr">Türkçe</option>
                          <option value="en">English</option>
                          <option value="it">Italiano</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </form>
                  </div>
                )}
      
                {activeTab === 'notifications' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Bildirim Ayarları</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Email Bildirimleri</label>
                        <input
                          type="checkbox"
                          name="emailNotifications"
                          checked={settings.emailNotifications}
                          onChange={handleInputChange}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Uygulama Bildirimleri</label>
                        <input
                          type="checkbox"
                          name="appNotifications"
                          checked={settings.appNotifications}
                          onChange={handleInputChange}
                          className="h-4 w-4"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </form>
                  </div>
                )}
      
                {activeTab === 'security' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Güvenlik Ayarları</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Mevcut Şifre</label>
                        <input
                          type="password"
                          name="currentPassword"
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Yeni Şifre</label>
                        <input
                          type="password"
                          name="newPassword"
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Yeni Şifre (Tekrar)</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      };
      
      


// Global olarak erişim için window objesine ata
window.DashboardMetrics = DashboardMetrics;
window.AnalysisDashboard = AnalysisDashboard;
window.AccountingDashboard = AccountingDashboard;
window.MessagesDashboard = MessagesDashboard;
window.SettingsDashboard = SettingsDashboard;
