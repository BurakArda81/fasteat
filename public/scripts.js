document.addEventListener('DOMContentLoaded', function() {
    window.appState = {
        filters: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            cityId: null,
            restaurantId: null
        },
        ui: {
            sidebarCollapsed: false,
            currentPage: 'dashboard',
            theme: localStorage.getItem('theme') || 'light'
        }
    };

    // Component mounting
    mountComponents();
    
    // Initialize everything
    try {
        mountComponents();
        initializeDashboardFilters();
        loadCitiesData();
        setupNavigation();
        initializeSidebar();
    } catch (error) {
        console.error('Initialization error:', error);
        showErrorMessage('Application initialization failed. Please refresh the page.');
    }

    function mountComponents() {
        const React = window.React;
        const ReactDOM = window.ReactDOM;
    
        // Dashboard Metrics Component
        if (window.DashboardMetrics) {
            const dashboardContainer = document.querySelector('.dashboard-metrics');
            if (dashboardContainer) {
                const root = ReactDOM.createRoot(dashboardContainer);
                root.render(
                    React.createElement(window.DashboardMetrics, {
                        data: {
                            orders: ordersData.data,
                            monthlyStats: monthlyData.data,
                            yearlyStats: yearlyData.data
                        },
                        filters: filters
                    })
                );
            }
        }
    
         // Analysis grafiklerini güncelle
         if (window.Analysis) {
            const analysisContainer = document.querySelector('.analysis-content');
            if (analysisContainer) {
                const root = ReactDOM.createRoot(analysisContainer);
                root.render(
                    React.createElement(window.Analysis, {
                        data: {
                            revenueComparison: yearlyData.data.map(item => ({
                                date: item.Month,
                                currentYear: item.Revenue,
                                previousYear: item.prevRevenue
                            })),
                            categoryAnalysis: ordersData.data.orders.reduce((acc, order) => {
                                const category = order.Kategori;
                                if (!acc[category]) {
                                    acc[category] = {
                                        category,
                                        revenue: 0,
                                        totalQuantity: 0
                                    };
                                }
                                acc[category].revenue += order.GunlukCiro;
                                acc[category].totalQuantity += order.ToplamSiparis;
                                return acc;
                            }, {}),
                            feedbackAnalysis: ordersData.data.feedback,
                            courierPerformance: courierData.data,
                            customerSatisfaction: yearlyData.data.map(item => ({
                                date: item.Month,
                                rating: item.Feedback
                            })),
                            averageOrderValue: monthlyData.data.map(item => ({
                                date: item.OrderDate,
                                avgValue: item.Revenue / item.TotalOrders
                            }))
                        },
                        filters: filters
                    })
                );
            }
        }
        

        
   

    
        // Accounting Component
        const accountingContainer = document.querySelector('.accounting-content');
        if (accountingContainer && !accountingContainer.hasAttribute('data-mounted')) {
            try {
                const root = ReactDOM.createRoot(accountingContainer);
                root.render(
                    React.createElement(
                        React.StrictMode,
                        null,
                        React.createElement(window.AccountingDashboard)
                    )
                );
                accountingContainer.setAttribute('data-mounted', 'true');
            } catch (error) {
                console.error('Error mounting Accounting:', error);
            }
        }
    
        // Messages Component
        const messagesContainer = document.querySelector('.messages-content');
        if (messagesContainer && !messagesContainer.hasAttribute('data-mounted')) {
            try {
                const root = ReactDOM.createRoot(messagesContainer);
                root.render(
                    React.createElement(
                        React.StrictMode,
                        null,
                        React.createElement(window.MessagesDashboard)
                    )
                );
                messagesContainer.setAttribute('data-mounted', 'true');
            } catch (error) {
                console.error('Error mounting Messages:', error);
            }
        }
    
        // Settings Component
        const settingsContainer = document.querySelector('.settings-content');
        if (settingsContainer && !settingsContainer.hasAttribute('data-mounted')) {
            try {
                const root = ReactDOM.createRoot(settingsContainer);
                root.render(
                    React.createElement(
                        React.StrictMode,
                        null,
                        React.createElement(window.SettingsDashboard)
                    )
                );
                settingsContainer.setAttribute('data-mounted', 'true');
            } catch (error) {
                console.error('Error mounting Settings:', error);
            }
        }
    
        // Update Profile Images
        const profileImages = document.querySelectorAll('.profile-image, .avatar');
        profileImages.forEach(img => {
            if (img.src !== '/assets/pepe.png') {
                img.src = '/assets/pepe.png';
                img.alt = 'Profile Avatar';
            }
        });
    }
    
    // Helper function to check if all components are mounted
    function areAllComponentsMounted() {
        const containers = [
            '.dashboard-metrics',
            '.analysis-content',
            '.accounting-content',
            '.messages-content',
            '.settings-content'
        ];
    
        return containers.every(selector => {
            const container = document.querySelector(selector);
            return !container || container.hasAttribute('data-mounted');
        });
    

        // Profile Image Update
        const profileImages = document.querySelectorAll('.profile-image, .avatar');
        profileImages.forEach(img => {
            img.src = '/assets/pepe.png';
            img.alt = 'Profile Avatar';
        });
    }

    // Sidebar Initialization
    function initializeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const toggleButton = document.createElement('button');
        toggleButton.className = 'sidebar-toggle';
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
        sidebar.insertBefore(toggleButton, sidebar.firstChild);

        toggleButton.addEventListener('click', () => {
            window.appState.ui.sidebarCollapsed = !window.appState.ui.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', window.appState.ui.sidebarCollapsed);
            document.querySelector('.main-content').classList.toggle('expanded', window.appState.ui.sidebarCollapsed);
        });
    }// scripts.js içindeki setupNavigation fonksiyonunu güncelleyelim
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-links a');
        const pages = document.querySelectorAll('[id$="-page"]');
    
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showLoadingIndicator();
                
                const pageId = link.getAttribute('data-page');
                
                // Update active state
                navLinks.forEach(nav => nav.parentElement.classList.remove('active'));
                link.parentElement.classList.add('active');
                
                // Hide all pages first
                pages.forEach(page => page.classList.add('hidden'));
                
                // Show selected page
                const selectedPage = document.getElementById(`${pageId}-page`);
                if (selectedPage) {
                    selectedPage.classList.remove('hidden');
                    loadPageData(pageId);
                }
                
                // Update breadcrumb
                const pageTitle = document.getElementById('pageTitle');
                if (pageTitle) {
                    pageTitle.textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);
                }
            });
        });
    }

// Sayfa yükleme fonksiyonunu güncelleyelim
function loadPageData(pageId) {
    showLoadingIndicator();
    
    try {
        switch(pageId) {
            case 'dashboard':
                if (window.DashboardMetrics) {
                    const container = document.querySelector('.dashboard-metrics');
                    if (container && !container.hasAttribute('data-mounted')) {
                        mountComponents();
                    }
                }
                loadFilteredData(window.appState.filters);
                break;
            case 'analysis':
            case 'accounting':
            case 'messages':
            case 'settings':
                const container = document.querySelector(`.${pageId}-content`);
                if (container && !container.hasAttribute('data-mounted')) {
                    mountComponents();
                }
                break;
        }
    } catch (error) {
        console.error('Error loading page:', error);
        showErrorMessage('Sayfa yüklenirken bir hata oluştu');
    } finally {
        hideLoadingIndicator();
    }
}
// scripts.js içine eklenecek yardımcı fonksiyonlar
// Global loading state ekleyin
// BU İKİ FONKSİYONU TEKRAR TANIMLAMAYIN (şu anda kodunuzda iki kez var)
let isLoading = false;

function showLoadingIndicator() {
    if (isLoading) return; // Prevent multiple loaders
    isLoading = true;
    const loader = document.querySelector('.loading-indicator');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

function hideLoadingIndicator() {
    isLoading = false;
    const loader = document.querySelector('.loading-indicator');
    if (loader) {
        loader.classList.add('hidden');
    }
}
async function loadFilteredData(filters) {
    try {
        const queryParams = new URLSearchParams();
        
        if (filters.year) queryParams.append('year', filters.year);
        if (filters.month) queryParams.append('month', filters.month);
        if (filters.cityId) queryParams.append('cityId', filters.cityId);
        if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);

        // Tüm verileri paralel olarak çek
        const [ordersResponse, monthlyResponse, yearlyResponse, courierResponse] = await Promise.all([
            fetch(`/api/orders?${queryParams}`),
            fetch(`/api/orders/monthly?${queryParams}`),
            fetch(`/api/orders/yearly?${queryParams}`),
            fetch(`/api/analysis/courier-performance?${queryParams}`)
        ]);

        const [ordersData, monthlyData, yearlyData, courierData] = await Promise.all([
            ordersResponse.json(),
            monthlyResponse.json(),
            yearlyResponse.json(),
            courierResponse.json()
        ]);

        if (data.status === 'success' && data.data) {
            if (data.data.orders && data.data.orders.length > 0) {
                displayOrders(data.data.orders);
            } else {
                showNoDataMessage('orders');
            }

            if (data.data.feedback && data.data.feedback.length > 0) {
                displayFeedback(data.data.feedback);
            } else {
                showNoDataMessage('feedback');
            }
        }
    } catch (error) {
        console.error('Error loading filtered data:', error);
        showErrorMessage('Veri yüklenirken bir hata oluştu');
    } finally {
        hideLoadingIndicator();
    }
}



    // Dashboard Filters Initialization
    function initializeDashboardFilters() {
        
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                const filters = {
                    year: document.getElementById('orderYear')?.value,
                    month: document.getElementById('orderMonth')?.value,
                    cityId: document.getElementById('citySelect')?.value,
                    restaurantId: document.getElementById('restaurantSelect')?.value
                };
                window.appState.filters = filters;
                loadFilteredData(filters);
            });
        }
    
        // Initialize year options
        if (yearSelect) {
            yearSelect.innerHTML = '<option value="">Select Year</option>';
            const currentYear = new Date().getFullYear();
            const years = new Set();
            for (let year = currentYear; year >= 2019; year--) {
                years.add(year);
            }
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        }
    
        // Event listeners
        if (citySelect) {
            citySelect.addEventListener('change', function(e) {
                const selectedCityId = e.target.value;
                window.appState.filters.cityId = selectedCityId;
                
                if (selectedCityId) {
                    updateRestaurantsByCity(selectedCityId);
                } else {
                    loadCitiesData();
                }
            });
        }
    
        if (restaurantSelect) {
            restaurantSelect.addEventListener('change', function(e) {
                window.appState.filters.restaurantId = e.target.value;
            });
        }
    
        if (yearSelect) {
            yearSelect.addEventListener('change', function(e) {
                window.appState.filters.year = e.target.value;
            });
        }
    
        if (monthSelect) {
            monthSelect.addEventListener('change', function(e) {
                window.appState.filters.month = e.target.value;
            });
        }
    
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', function() {
                loadFilteredData(window.appState.filters);
            });
        }
    
        // Initial data load
        loadCitiesData();
    }// Data Loading Functions
    async function loadCitiesData() {
        try {
            const citiesResponse = await fetch('/api/cities');
            const citiesData = await citiesResponse.json();
    
            if (citiesData.status === 'success') {
                const citySelect = document.getElementById('citySelect');
                if (citySelect) {
                    citySelect.innerHTML = '<option value="">Select City</option>';
                    
                    citiesData.data.forEach(city => {
                        const option = document.createElement('option');
                        option.value = city.CityID;
                        option.textContent = city.CityName;
                        citySelect.appendChild(option);
                    });
                }
            }
    
            // Load all restaurants initially
            const restaurantsResponse = await fetch('/api/restaurants');
            const restaurantsData = await restaurantsResponse.json();
    
            if (restaurantsData.status === 'success') {
                const restaurantSelect = document.getElementById('restaurantSelect');
                if (restaurantSelect) {
                    restaurantSelect.innerHTML = '<option value="">Select Restaurant</option>';
                    
                    restaurantsData.data.forEach(restaurant => {
                        const option = document.createElement('option');
                        option.value = restaurant.RestaurantID;
                        option.textContent = restaurant.RestaurantName;
                        restaurantSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            showErrorMessage('Failed to load cities and restaurants data');
        }
    }

    async function updateRestaurantsByCity(cityId) {
        try {
            const response = await fetch(`/api/restaurants?cityId=${cityId}`);
            const data = await response.json();
            
            const restaurantSelect = document.getElementById('restaurantSelect');
            if (restaurantSelect) {
                restaurantSelect.innerHTML = '<option value="">Select Restaurant</option>';
                
                if (data.status === 'success' && data.data) {
                    data.data.forEach(restaurant => {
                        const option = document.createElement('option');
                        option.value = restaurant.RestaurantID;
                        option.textContent = restaurant.RestaurantName;
                        restaurantSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading restaurants:', error);
            showErrorMessage('Failed to load restaurants for selected city');
        }
    }

    // scripts.js içindeki loadFilteredData fonksiyonunu güncelleyin
async function loadFilteredData(filters) {
    try {
        showLoadingIndicator();
        const queryParams = new URLSearchParams();
        
        if (filters.year) queryParams.append('year', filters.year);
        if (filters.month) queryParams.append('month', filters.month);
        if (filters.cityId) queryParams.append('cityId', filters.cityId);
        if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);

        const response = await fetch(`/api/orders?${queryParams}`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
            const { orders, feedback } = data.data;

            if (orders && orders.length > 0) {
                displayOrders(orders);
                const stats = calculateStats(orders);
                if (stats) {
                    window.lastStats = stats;
                }
            } else {
                showNoDataMessage('orders');
            }

            if (feedback && feedback.length > 0) {
                displayFeedback(feedback);
            } else {
                showNoDataMessage('feedback');
            }

            hideLoadingIndicator();
        } else {
            throw new Error(data.message || 'Veri formatı geçersiz');
        }
    } catch (error) {
        console.error('Error loading filtered data:', error);
        showErrorMessage(`Veri yüklenirken hata oluştu: ${error.message}`);
        hideLoadingIndicator();
    }
}

function calculateGrowthRate(data) {
    if (!data || data.length < 2) return 0;
    const first = data[0].value;
    const last = data[data.length - 1].value;
    return ((last - first) / first) * 100;
}
function initializeAnalysis() {
    // Bu fonksiyon boş olabilir çünkü analiz işlemleri React bileşeninde yapılıyor
}

    // Display Functions
    function displayOrders(orders) {
        const ordersList = document.querySelector('.orders-list');
        if (!ordersList) return;

        ordersList.innerHTML = '';
    
        if (!orders || orders.length === 0) {
            showNoDataMessage('orders');
            return;
        }
    
        // Restaurant header
        const restaurantInfo = document.createElement('div');
        restaurantInfo.className = 'restaurant-info-header';
        const date = new Date(orders[0].SiparisTarihi);
        restaurantInfo.innerHTML = `
            <div class="restaurant-main-info">
                <h2 class="restaurant-name-italic">${orders[0].RestaurantName}</h2>
                <span class="time-period">${date.toLocaleDateString('tr-TR', { 
                    month: 'long',
                    year: 'numeric'
                })}</span>
            </div>
            <div class="restaurant-divider"></div>
        `;
        ordersList.appendChild(restaurantInfo);
    
        // Monthly totals
        const monthlyTotalElement = document.createElement('div');
        monthlyTotalElement.className = 'monthly-total';
        monthlyTotalElement.innerHTML = `
            <div class="monthly-stats">
                <h3>Monthly Total Orders: ${orders[0].AylikToplam}</h3>
                <h3>Monthly Total Revenue: €${orders[0].AylikCiro.toFixed(2)}</h3>
            </div>
            <hr>
        `;
        ordersList.appendChild(monthlyTotalElement);
    
        // Group orders by date and category
        const ordersByDate = {};
        orders.forEach(order => {
            const dateKey = new Date(order.SiparisTarihi).toLocaleDateString('tr-TR');
            if (!ordersByDate[dateKey]) {
                ordersByDate[dateKey] = {};
            }
            if (!ordersByDate[dateKey][order.Kategori]) {
                ordersByDate[dateKey][order.Kategori] = [];
            }
            ordersByDate[dateKey][order.Kategori].push(order);
        });
    
        // Display grouped orders
        Object.entries(ordersByDate).forEach(([date, categories]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.textContent = date;
            dateGroup.appendChild(dateHeader);
    
            Object.entries(categories).forEach(([category, categoryOrders]) => {
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                categoryHeader.textContent = category;
                dateGroup.appendChild(categoryHeader);
    
                categoryOrders.forEach(order => {
                    const orderElement = document.createElement('div');
                    orderElement.className = 'order-item';
                    orderElement.innerHTML = `
                        <div class="order-details">
                            <div class="order-name">${order.YemekAdi}</div>
                        </div>
                        <div class="order-stats">
                            <span class="order-count">${order.ToplamSiparis} orders</span>
                            <span class="order-revenue">€${order.GunlukCiro.toFixed(2)}</span>
                        </div>
                    `;
                    dateGroup.appendChild(orderElement);
                });
            });
    
            ordersList.appendChild(dateGroup);
        });
    }// Feedback Display and Analysis Functions
    function displayFeedback(feedback) {
        const feedbackList = document.querySelector('.feedback-list');
        if (!feedbackList) return;

        feedbackList.innerHTML = '';
    
        if (!feedback || feedback.length === 0) {
            showNoDataMessage('feedback');
            return;
        }
    
        // Restaurant Performance Header
        const restaurantHeader = document.createElement('div');
        restaurantHeader.className = 'restaurant-performance-header';
    
        // Process date information
        const monthYear = window.appState.filters.year && window.appState.filters.month ? 
            new Date(window.appState.filters.year, window.appState.filters.month - 1) : new Date();
    
        // Calculate average rating
        const relevantFeedback = feedback.filter(f => 
            f.type === 'Kuryeler' || f.type === 'Yemek Kalitesi'
        );
        const averageRating = relevantFeedback.length > 0 ?
            relevantFeedback.reduce((sum, f) => sum + f.rating, 0) / relevantFeedback.length : 0;
        
        restaurantHeader.innerHTML = `
            <h2>
                <span class="restaurant-name-italic">${feedback[0].restaurantName}</span>'s 
                ${monthYear.toLocaleDateString('tr-TR', { 
                    month: 'long',
                    year: 'numeric'
                })}
                Overall Performance Rating: ${averageRating.toFixed(1)}/5
            </h2>
        `;
        feedbackList.appendChild(restaurantHeader);
    
        // Group feedback by type
        const feedbackByType = feedback.reduce((acc, item) => {
            if (!acc[item.type]) {
                acc[item.type] = [];
            }
            acc[item.type].push(item);
            return acc;
        }, {});
    
        // Create sections for each feedback type
        Object.entries(feedbackByType).forEach(([type, items]) => {
            const categorySection = document.createElement('div');
            categorySection.className = 'feedback-category';
            
            const avgRating = items.reduce((sum, item) => sum + item.rating, 0) / items.length;
    
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header clickable';
            categoryHeader.innerHTML = `
                <div class="category-title">
                    <h4>${type}</h4>
                    <div class="category-stats">
                        <span class="avg-rating">Average Rating: ${avgRating.toFixed(1)}/5</span>
                        <span class="feedback-count">(${items.length} feedbacks)</span>
                    </div>
                </div>
                <i class="fas fa-chevron-down"></i>
            `;
    
            const feedbackDetails = document.createElement('div');
            feedbackDetails.className = 'feedback-details hidden';
    
            items.forEach(item => {
                const feedbackCard = document.createElement('div');
                feedbackCard.className = 'feedback-item';
                feedbackCard.innerHTML = `
                    <div class="feedback-header">
                        <span class="rating">Rating: ${item.rating}/5</span>
                        <span class="date">${item.date}</span>
                    </div>
                    <div class="feedback-content">
                        <p class="comment">${item.comment || 'No comment provided'}</p>
                    </div>
                `;
                feedbackDetails.appendChild(feedbackCard);
            });
    
            categoryHeader.addEventListener('click', () => {
                feedbackDetails.classList.toggle('hidden');
                categoryHeader.querySelector('i').classList.toggle('fa-chevron-up');
                categoryHeader.querySelector('i').classList.toggle('fa-chevron-down');
            });
    
            categorySection.appendChild(categoryHeader);
            categorySection.appendChild(feedbackDetails);
            feedbackList.appendChild(categorySection);
        });
    }

    // Analysis Functions
    async function loadAnalysisData() {
        try {
            showLoadingIndicator();

            const queryParams = new URLSearchParams(window.appState.filters);
            
            const [revenueTrends, orderTrends, feedbackAnalysis, performanceMetrics] = await Promise.all([
                fetch(`/api/analysis/revenue-trends?${queryParams}`).then(res => res.json()),
                fetch(`/api/analysis/order-trends?${queryParams}`).then(res => res.json()),
                fetch(`/api/analysis/feedback-analysis?${queryParams}`).then(res => res.json()),
                fetch(`/api/analysis/performance-metrics?${queryParams}`).then(res => res.json())
            ]);

            if (revenueTrends.status === 'success' && 
                orderTrends.status === 'success' && 
                feedbackAnalysis.status === 'success' &&
                performanceMetrics.status === 'success') {
                
                updateAnalysisCharts({
                    revenueTrends: revenueTrends.data,
                    orderTrends: orderTrends.data,
                    feedbackAnalysis: feedbackAnalysis.data,
                    performanceMetrics: performanceMetrics.data
                });
            }
        } catch (error) {
            console.error('Error loading analysis data:', error);
            showErrorMessage('Failed to load analysis data');
        } finally {
            hideLoadingIndicator();
        }
    }

    function updateAnalysisCharts(data) {
        // Revenue Trends Chart
        const revenueChart = Chart.getChart('revenueTrendsChart');
        if (revenueChart && data.revenueTrends) {
            revenueChart.data.labels = data.revenueTrends.map(item => item.month);
            revenueChart.data.datasets[0].data = data.revenueTrends.map(item => item.revenue);
            revenueChart.update();
        }

        // Order Trends Chart
        const orderChart = Chart.getChart('orderTrendsChart');
        if (orderChart && data.orderTrends) {
            orderChart.data.labels = data.orderTrends.map(item => item.month);
            orderChart.data.datasets[0].data = data.orderTrends.map(item => item.orders);
            orderChart.update();
        }

        // Feedback Analysis Chart
        const feedbackChart = Chart.getChart('feedbackAnalysisChart');
        if (feedbackChart && data.feedbackAnalysis) {
            feedbackChart.data.labels = data.feedbackAnalysis.map(item => item.category);
            feedbackChart.data.datasets[0].data = data.feedbackAnalysis.map(item => item.rating);
            feedbackChart.data.datasets[1].data = data.feedbackAnalysis.map(item => item.count);
            feedbackChart.update();
        }

       // Performance Metrics Chart
       const performanceChart = Chart.getChart('performanceMetricsChart');
       if (performanceChart && data.performanceMetrics) {
           performanceChart.data.labels = data.performanceMetrics.map(item => item.month);
           performanceChart.data.datasets[0].data = data.performanceMetrics.map(item => item.performance);
           performanceChart.data.datasets[1].data = data.performanceMetrics.map(item => item.efficiency);
           performanceChart.update();
       }

       // Update summary statistics
       updateAnalysisSummary(data);
   }

   function updateAnalysisSummary(data) {
       const summaryContainer = document.querySelector('.analysis-summary');
       if (!summaryContainer) return;

       // Calculate summary statistics
       const revenueGrowth = calculateGrowthRate(data.revenueTrends);
       const orderGrowth = calculateGrowthRate(data.orderTrends);
       const avgFeedback = calculateAverageFeedback(data.feedbackAnalysis);

       summaryContainer.innerHTML = `
           <div class="summary-grid">
               <div class="summary-card">
                   <h3>Revenue Growth</h3>
                   <p class="${revenueGrowth >= 0 ? 'positive' : 'negative'}">
                       ${revenueGrowth.toFixed(1)}%
                   </p>
               </div>
               <div class="summary-card">
                   <h3>Order Growth</h3>
                   <p class="${orderGrowth >= 0 ? 'positive' : 'negative'}">
                       ${orderGrowth.toFixed(1)}%
                   </p>
               </div>
               <div class="summary-card">
                   <h3>Average Feedback</h3>
                   <p>${avgFeedback.toFixed(1)}/5</p>
               </div>
           </div>
       `;
   }
// scripts.js içine ekleyin
function calculateStats(orders) {
    if (!orders || orders.length === 0) return null;

    return {
        totalRevenue: orders.reduce((sum, order) => sum + order.GunlukCiro, 0),
        totalOrders: orders.reduce((sum, order) => sum + order.ToplamSiparis, 0),
        averageOrderValue: orders.reduce((sum, order) => sum + order.GunlukCiro, 0) / 
                          orders.reduce((sum, order) => sum + order.ToplamSiparis, 0)
    };
}
   // Accounting Functions
   async function loadAccountingData() {
       try {
           showLoadingIndicator();

           const queryParams = new URLSearchParams(window.appState.filters);
           const growthRate = document.getElementById('growthRateInput')?.value || 10;
           queryParams.append('growthRate', growthRate);

           const [currentStats, predictions] = await Promise.all([
               fetch(`/api/accounting/current-stats?${queryParams}`).then(res => res.json()),
               fetch(`/api/accounting/predictions?${queryParams}`).then(res => res.json())
           ]);

           if (currentStats.status === 'success' && predictions.status === 'success') {
               displayAccountingStats(currentStats.data);
               updatePredictionCharts(predictions.data);
           }
       } catch (error) {
           console.error('Error loading accounting data:', error);
           showErrorMessage('Failed to load accounting data');
       } finally {
           hideLoadingIndicator();
       }
   }

   function displayAccountingStats(stats) {
       const statsContainer = document.querySelector('.accounting-stats');
       if (!statsContainer) return;

       statsContainer.innerHTML = `
           <div class="stats-grid">
               <div class="stat-card">
                   <h3>Current Monthly Revenue</h3>
                   <p class="stat-value">€${stats.revenue.toLocaleString()}</p>
               </div>
               <div class="stat-card">
                   <h3>Current Monthly Orders</h3>
                   <p class="stat-value">${stats.orders.toLocaleString()}</p>
               </div>
               <div class="stat-card">
                   <h3>Average Order Value</h3>
                   <p class="stat-value">€${stats.averageOrderValue.toFixed(2)}</p>
               </div>
               <div class="stat-card">
                   <h3>Customer Rating</h3>
                   <p class="stat-value">${stats.rating.toFixed(1)}/5</p>
               </div>
           </div>
       `;
   }

   function updatePredictionCharts(data) {
       // Revenue Prediction Chart
       const revenuePredictionChart = Chart.getChart('revenuePredictionChart');
       if (revenuePredictionChart) {
           revenuePredictionChart.data.labels = data.revenue.map(item => item.month);
           revenuePredictionChart.data.datasets[0].data = data.revenue.map(item => item.predicted);
           revenuePredictionChart.data.datasets[1].data = data.revenue.map(item => item.actual);
           revenuePredictionChart.update();
       }

       // Order Prediction Chart
       const orderPredictionChart = Chart.getChart('orderPredictionChart');
       if (orderPredictionChart) {
           orderPredictionChart.data.labels = data.orders.map(item => item.month);
           orderPredictionChart.data.datasets[0].data = data.orders.map(item => item.predicted);
           orderPredictionChart.data.datasets[1].data = data.orders.map(item => item.actual);
           orderPredictionChart.update();
       }

       // Update metrics summary
       updatePredictionMetrics(data.metrics);
   }

   function updatePredictionMetrics(metrics) {
       const metricsContainer = document.querySelector('.prediction-metrics');
       if (!metricsContainer) return;

       metricsContainer.innerHTML = `
           <div class="metrics-grid">
               <div class="metric-card">
                   <h3>Revenue Growth</h3>
                   <p class="metric-value ${metrics.revenueGrowth >= 0 ? 'positive' : 'negative'}">
                       ${metrics.revenueGrowth.toFixed(1)}%
                   </p>
               </div>
               <div class="metric-card">
                   <h3>Order Growth</h3>
                   <p class="metric-value ${metrics.orderGrowth >= 0 ? 'positive' : 'negative'}">
                       ${metrics.orderGrowth.toFixed(1)}%
                   </p>
               </div>
               <div class="metric-card">
                   <h3>Projected Monthly Revenue</h3>
                   <p class="metric-value">€${metrics.projectedRevenue.toLocaleString()}</p>
               </div>
               <div class="metric-card">
                   <h3>Projected Monthly Orders</h3>
                   <p class="metric-value">${metrics.projectedOrders.toLocaleString()}</p>
               </div>
           </div>
       `;
   }// Messages Functions
   function initializeMessages() {
    const messageForm = document.querySelector('.message-form');
    const messageList = document.querySelector('.messages-list');

    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(messageForm);
            const messageData = {
                restaurantId: formData.get('restaurantId'),
                subject: formData.get('subject'),
                content: formData.get('content'),
                priority: formData.get('priority')
            };

            await sendMessage(messageData);
            messageForm.reset();
        });
    }

    loadMessages();
}

async function loadMessages() {
    try {
        const queryParams = new URLSearchParams(window.appState.filters);
        const response = await fetch(`/api/messages/history?${queryParams}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            displayMessages(data.data);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showErrorMessage('Failed to load message history');
    }
}

async function sendMessage(messageData) {
    try {
        showLoadingIndicator();

        const response = await fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });

        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage('Message sent successfully');
            loadMessages();  // Refresh message list
        } else {
            throw new Error(data.message || 'Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorMessage(error.message);
    } finally {
        hideLoadingIndicator();
    }
}

function displayMessages(messages) {
    const messagesList = document.querySelector('.messages-list');
    if (!messagesList) return;

    messagesList.innerHTML = '';

    if (!messages || messages.length === 0) {
        messagesList.innerHTML = '<div class="no-data">No messages found</div>';
        return;
    }

    messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-card';
        messageElement.innerHTML = `
            <div class="message-header">
                <h3 class="message-subject">${message.subject}</h3>
                <span class="message-priority ${message.priority}">${message.priority}</span>
            </div>
            <div class="message-content">
                <p>${message.content}</p>
            </div>
            <div class="message-footer">
                <span class="message-date">${new Date(message.sentAt).toLocaleString()}</span>
                <span class="message-status ${message.status}">
                    <i class="fas fa-${message.status === 'delivered' ? 'check' : 
                                     message.status === 'failed' ? 'times' : 'clock'}"></i>
                    ${message.status}
                </span>
            </div>
        `;
        messagesList.appendChild(messageElement);
    });
}

// Settings Functions
function initializeSettings() {
    loadSettings();

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSubmit);
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            window.appState.ui.theme = themeToggle.checked ? 'dark' : 'light';
            updateTheme();
        });
    }
}

async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (data.status === 'success') {
            populateSettingsForm(data.data.settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showErrorMessage('Failed to load settings');
    }
}

function populateSettingsForm(settings) {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    // Populate each settings section
    Object.entries(settings).forEach(([category, values]) => {
        Object.entries(values).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${category}.${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else {
                    input.value = value;
                }
            }
        });
    });
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    
    try {
        showLoadingIndicator();

        const formData = new FormData(e.target);
        const settings = {};

        // Group settings by category
        formData.forEach((value, key) => {
            const [category, setting] = key.split('.');
            if (!settings[category]) {
                settings[category] = {};
            }
            settings[category][setting] = value;
        });

        // Update each category
        for (const [category, values] of Object.entries(settings)) {
            const response = await fetch(`/api/settings/${category}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values)
            });

            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(`Failed to update ${category} settings`);
            }
        }

        showSuccessMessage('Settings updated successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        showErrorMessage(error.message);
    } finally {
        hideLoadingIndicator();
    }
}



function hideLoadingIndicator() {
    const loader = document.querySelector('.loading-indicator');
    if (loader) {
        loader.remove();
    }
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    showToast(toast);
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    showToast(toast);
}

function showToast(toast) {
    const container = document.querySelector('.toast-container') || 
                     createToastContainer();
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showNoDataMessage(type) {
    const container = document.querySelector(`.${type}-list`);
    if (container) {
        container.innerHTML = `
            <div class="no-data">
                No ${type} found for the selected filters
            </div>
        `;
    }
}

function updateTheme() {
    document.body.classList.toggle('dark-theme', window.appState.ui.theme === 'dark');
    localStorage.setItem('theme', window.appState.ui.theme);
}
});