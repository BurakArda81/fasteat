// routes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import db from './db.js';

const router = express.Router();

// Middleware setup
router.use(cors());
router.use(express.json());

// JWT için secret key
const JWT_SECRET = 'your-secret-key';



// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

// Login endpoint - routes.js içinde olmalı
router.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const query = `
            SELECT YoneticiID, KullaniciAdi
            FROM Yoneticiler 
            WHERE KullaniciAdi = ? AND Sifre = ?
        `;
        
        const [users] = await db.query(query, [username, password]);
        
        if (users && users.length > 0) {
            res.json({
                status: 'success',
                token: 'dummy-token',
                data: {
                    id: users[0].YoneticiID,
                    username: users[0].KullaniciAdi
                }
            });
        } else {
            res.status(401).json({
                status: 'error',
                message: 'Kullanıcı adı veya şifre hatalı'
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Sunucu hatası'
        });
    }
});

// Orders endpoint
router.get('/api/orders', async (req, res) => {
    const { year, month, cityId, restaurantId } = req.query;
    
    try {
        let query = `
            SELECT 
                o.OrderID,
                r.RestaurantName,
                m.MealName as YemekAdi,
                m.MealType as Kategori,
                o.OrderDate as SiparisTarihi,
                o.TotalOrders as ToplamSiparis,
                CAST(mp.Price AS DECIMAL(10,2)) as BirimFiyat,
                CAST((o.TotalOrders * mp.Price) AS DECIMAL(10,2)) as GunlukCiro,
                c.CityName as SehirAdi,
                c.CityID,
                r.RestaurantID,
                (
                    SELECT CAST(SUM(o2.TotalOrders) AS DECIMAL(10,2))
                    FROM Orders o2 
                    WHERE o2.RestaurantID = r.RestaurantID
                    AND YEAR(o2.OrderDate) = YEAR(o.OrderDate) 
                    AND MONTH(o2.OrderDate) = MONTH(o.OrderDate)
                ) as AylikToplam,
                (
                    SELECT CAST(SUM(o2.TotalOrders * mp2.Price) AS DECIMAL(10,2))
                    FROM Orders o2 
                    JOIN MealPrices mp2 ON o2.MealID = mp2.MealID
                    WHERE o2.RestaurantID = r.RestaurantID
                    AND YEAR(o2.OrderDate) = YEAR(o.OrderDate) 
                    AND MONTH(o2.OrderDate) = MONTH(o.OrderDate)
                ) as AylikCiro
            FROM Orders o
            JOIN Cities c ON o.CityID = c.CityID
            JOIN Restaurants r ON o.RestaurantID = r.RestaurantID
            JOIN Meals m ON o.MealID = m.MealID
            LEFT JOIN MealPrices mp ON m.MealID = mp.MealID
            WHERE 1=1
        `;
        
        const queryParams = [];

        if (restaurantId) {
            query += ` AND o.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }
        
        if (year && month) {
            query += ` AND YEAR(o.OrderDate) = ? AND MONTH(o.OrderDate) = ?`;
            queryParams.push(year, month);
        }
        
        if (cityId) {
            query += ` AND o.CityID = ?`;
            queryParams.push(cityId);
        }
        
        query += ` ORDER BY o.OrderDate DESC, m.MealType`;

        const [orders] = await db.query(query, queryParams);

        const processedOrders = orders.map(order => ({
            ...order,
            ToplamSiparis: Number(order.ToplamSiparis),
            BirimFiyat: Number(order.BirimFiyat),
            GunlukCiro: Number(order.GunlukCiro),
            AylikToplam: Number(order.AylikToplam),
            AylikCiro: Number(order.AylikCiro) || 0
        }));

        let feedbackQuery = `
            SELECT 
                f.FeedbackID,
                f.FeedbackType as type,
                f.Rating as rating,
                f.FeedbackText as comment,
                f.FeedbackDate,
                r.RestaurantName as restaurantName,
                r.RestaurantID,
                c.CityName as city
            FROM Feedback f
            JOIN Restaurants r ON f.RestaurantID = r.RestaurantID
            JOIN Cities c ON r.CityID = c.CityID
            WHERE 1=1
        `;

        const feedbackParams = [];

        if (restaurantId) {
            feedbackQuery += ` AND f.RestaurantID = ?`;
            feedbackParams.push(restaurantId);
        }

        if (year && month) {
            feedbackQuery += ` AND YEAR(f.FeedbackDate) = ? AND MONTH(f.FeedbackDate) = ?`;
            feedbackParams.push(year, month);
        }

        const [feedback] = await db.query(feedbackQuery, feedbackParams);

        const processedFeedback = feedback.map(item => ({
            ...item,
            rating: Number(item.rating),
            date: new Date(item.FeedbackDate).toLocaleDateString('tr-TR')
        }));

        res.json({
            status: 'success',
            data: {
                orders: processedOrders,
                feedback: processedFeedback
            }
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Veriler yüklenirken bir sorun oluştu.',
            debug: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }
});
// Mevcut orders endpoint'inizden sonra ekleyin
// routes.js içine eklenecek - mevcut routes'ların yanına
router.get('/api/analysis/city-comparison', async (req, res) => {
    const { cityId } = req.query;
    
    try {
        const query = `
            SELECT 
                r.RestaurantName,
                SUM(o.TotalOrders) as TotalOrders,
                SUM(o.TotalOrders * mp.Price) as TotalRevenue
            FROM Orders o
            JOIN Restaurants r ON o.RestaurantID = r.RestaurantID
            JOIN MealPrices mp ON o.MealID = mp.MealID
            WHERE r.CityID = ?
            GROUP BY r.RestaurantID, r.RestaurantName
            ORDER BY TotalRevenue DESC
        `;
        
        const [results] = await db.query(query, [cityId]);
        
        res.json({
            status: 'success',
            data: results.map(row => ({
                ...row,
                TotalRevenue: Number(row.TotalRevenue),
                TotalOrders: Number(row.TotalOrders)
            }))
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Verileri alırken bir hata oluştu'
        });
    }
});

// Dashboard için aylık özet endpoint
router.get('/api/orders/monthly', async (req, res) => {
    try {
        const { year, month, restaurantId } = req.query;
        
        const query = `
            SELECT 
                o.OrderDate,
                SUM(o.TotalOrders) as TotalOrders,
                SUM(o.TotalOrders * mp.Price) as Revenue
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            WHERE YEAR(o.OrderDate) = ? 
            AND MONTH(o.OrderDate) = ?
            AND o.RestaurantID = ?
            GROUP BY DATE(o.OrderDate)
        `;

        const [results] = await db.query(query, [year, month, restaurantId]);

        res.json({
            status: 'success',
            data: results
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Aylık veriler yüklenirken bir sorun oluştu.',
            debug: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }
});



// Dashboard için yıllık özet endpoint
router.get('/api/orders/yearly', async (req, res) => {
    try {
        const { year, restaurantId } = req.query;
        
        const query = `
            SELECT 
                MONTH(o.OrderDate) as Month,
                SUM(o.TotalOrders) as Orders,
                SUM(o.TotalOrders * mp.Price) as Revenue,
                AVG(f.Rating) as Feedback
            FROM Orders o
            LEFT JOIN MealPrices mp ON o.MealID = mp.MealID
            LEFT JOIN Feedback f ON o.RestaurantID = f.RestaurantID 
                AND MONTH(o.OrderDate) = MONTH(f.FeedbackDate)
            WHERE YEAR(o.OrderDate) = ? 
            AND o.RestaurantID = ?
            GROUP BY MONTH(o.OrderDate)
        `;

        const [results] = await db.query(query, [year, restaurantId]);

        res.json({
            status: 'success',
            data: results
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Yıllık veriler yüklenirken bir sorun oluştu.',
            debug: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }
});
// Settings Routes
router.get('/api/settings/get', async (req, res) => {
    try {
        const [settings] = await db.query(
            'SELECT * FROM UserSettings'
        );

        if (settings.length > 0) {
            res.json({
                status: 'success',
                data: {
                    theme: settings[0].Theme,
                    language: settings[0].Language,
                    emailNotifications: !!settings[0].EmailNotifications,
                    appNotifications: !!settings[0].AppNotifications
                }
            });
        } else {
            // Varsayılan ayarları döndür
            res.json({
                status: 'success',
                data: {
                    theme: 'light',
                    language: 'tr',
                    emailNotifications: true,
                    appNotifications: true
                }
            });
        }
    } catch (err) {
        console.error('Settings fetch error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Ayarlar yüklenirken bir hata oluştu'
        });
    }
});

router.post('/api/settings/update', async (req, res) => {
    const { theme, language, emailNotifications, appNotifications } = req.body;
    
    try {
        const [existingSettings] = await db.query(
            'SELECT * FROM UserSettings'
        );

        if (existingSettings.length > 0) {
            await db.query(
                `UPDATE UserSettings SET 
                Theme = ?,
                Language = ?,
                EmailNotifications = ?,
                AppNotifications = ?`,
                [theme, language, emailNotifications, appNotifications]
            );
        } else {
            await db.query(
                `INSERT INTO UserSettings 
                (Theme, Language, EmailNotifications, AppNotifications) 
                VALUES (?, ?, ?, ?)`,
                [theme, language, emailNotifications, appNotifications]
            );
        }

        res.json({
            status: 'success',
            message: 'Ayarlar başarıyla güncellendi'
        });
    } catch (err) {
        console.error('Settings update error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Ayarlar güncellenirken bir hata oluştu'
        });
    }
});



// Profil bilgileri için endpoint
router.get('/api/settings/profile', async (req, res) => {
    try {
        const [profile] = await db.query(
            'SELECT YoneticiID, KullaniciAdi FROM Yoneticiler WHERE YoneticiID = ?',
            [1] // Şimdilik sabit bir yönetici ID'si kullanıyoruz
        );

        if (profile.length > 0) {
            res.json({
                status: 'success',
                data: profile[0]
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'Profil bulunamadı'
            });
        }
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Profil bilgileri yüklenirken bir hata oluştu'
        });
    }
});

// Şifre değiştirme endpoint'i
router.post('/api/settings/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
        // Mevcut şifreyi kontrol et
        const [user] = await db.query(
            'SELECT * FROM Yoneticiler WHERE YoneticiID = ? AND Sifre = ?',
            [1, currentPassword] // Şimdilik sabit bir yönetici ID'si kullanıyoruz
        );

        if (user.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Mevcut şifre yanlış'
            });
        }

        // Yeni şifreyi güncelle
        await db.query(
            'UPDATE Yoneticiler SET Sifre = ? WHERE YoneticiID = ?',
            [newPassword, 1]
        );

        res.json({
            status: 'success',
            message: 'Şifre başarıyla güncellendi'
        });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Şifre değiştirilirken bir hata oluştu'
        });
    }
});

// Cities endpoint
router.get('/api/cities', async (req, res) => {
    try {
        const query = 'SELECT CityID, CityName FROM Cities ORDER BY CityName';
        const [cities] = await db.query(query);
        
        res.json({
            status: 'success',
            data: cities
        });
    } catch (err) {
        console.error('Error loading cities:', err);
        res.status(500).json({
            status: 'error',
            message: 'Şehirler yüklenirken bir hata oluştu'
        });
    }
});

// Restaurants endpoint
router.get('/api/restaurants', async (req, res) => {
    const { cityId } = req.query;
    
    try {
        let query = `
            SELECT 
                r.RestaurantID, 
                r.RestaurantName, 
                r.CityID,
                c.CityName
            FROM Restaurants r
            JOIN Cities c ON r.CityID = c.CityID
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += ' WHERE r.CityID = ?';
            queryParams.push(cityId);
        }
        
        query += ' ORDER BY r.RestaurantName';
        
        const [restaurants] = await db.query(query, queryParams);
        
        res.json({
            status: 'success',
            data: restaurants
        });
    } catch (err) {
        console.error('Error loading restaurants:', err);
        res.status(500).json({
            status: 'error',
            message: 'Restoranlar yüklenirken bir hata oluştu'
        });
    }
});

// Analysis Endpoints
router.get('/api/analysis/revenue-comparison', async (req, res) => {
    const { year, month, cityId, restaurantId } = req.query;
    
    try {
        let query = `
            SELECT 
                DATE_FORMAT(o.OrderDate, '%Y-%m') as month,
                YEAR(o.OrderDate) as year,
                SUM(o.TotalOrders * mp.Price) as revenue
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += ` AND o.CityID = ?`;
            queryParams.push(cityId);
        }
        
        if (restaurantId) {
            query += ` AND o.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }
        
        query += `
            GROUP BY DATE_FORMAT(o.OrderDate, '%Y-%m')
            ORDER BY month DESC
            LIMIT 24
        `;
        
        const [results] = await db.query(query, queryParams);
        
        const processedData = results.reduce((acc, curr) => {
            const yearMonth = curr.month;
            const revenue = Number(curr.revenue);
            const currentYear = curr.year;
            
            acc.push({
                month: yearMonth,
                [currentYear === Number(year) ? 'currentYear' : 'previousYear']: revenue
            });
            
            return acc;
        }, []);
        
        res.json({
            status: 'success',
            data: processedData
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
// Analysis Dashboard Endpoint - Continued
router.get('/api/analysis/dashboard', async (req, res) => {
    const { year, month, cityId, restaurantId } = req.query;
    
    try {
        // Base WHERE clause and parameters
        const baseWhere = `WHERE YEAR(o.OrderDate) = ? AND MONTH(o.OrderDate) = ?
            ${cityId ? 'AND o.CityID = ?' : ''}
            ${restaurantId ? 'AND o.RestaurantID = ?' : ''}`;
        
        const baseParams = [year, month];
        if (cityId) baseParams.push(cityId);
        if (restaurantId) baseParams.push(restaurantId);

        // 1. Revenue Comparison Query
        const revenueQuery = `
            SELECT 
                DATE_FORMAT(o.OrderDate, '%Y-%m-%d') as date,
                YEAR(o.OrderDate) as year,
                SUM(o.TotalOrders * mp.Price) as revenue
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            WHERE (YEAR(o.OrderDate) = ? OR YEAR(o.OrderDate) = ?)
                ${cityId ? 'AND o.CityID = ?' : ''}
                ${restaurantId ? 'AND o.RestaurantID = ?' : ''}
            GROUP BY date, year
            ORDER BY date`;

        // 2. Category Analysis
        const categoryQuery = `
            SELECT 
                m.MealType as category,
                COUNT(DISTINCT o.OrderID) as totalOrders,
                SUM(o.TotalOrders) as totalQuantity,
                SUM(o.TotalOrders * mp.Price) as revenue
            FROM Orders o
            JOIN Meals m ON o.MealID = m.MealID
            JOIN MealPrices mp ON m.MealID = mp.MealID
            ${baseWhere}
            GROUP BY m.MealType`;

        // 3. Feedback Analysis
        const feedbackQuery = `
            SELECT 
                f.FeedbackType as type,
                ROUND(AVG(f.Rating), 2) as avgRating,
                COUNT(*) as count,
                COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
            FROM Feedback f
            WHERE YEAR(f.FeedbackDate) = ? AND MONTH(f.FeedbackDate) = ?
                ${restaurantId ? 'AND f.RestaurantID = ?' : ''}
            GROUP BY f.FeedbackType`;

        // 4. Peak Hours Analysis
        const peakHoursQuery = `
            SELECT 
                DATE_FORMAT(o.OrderDate, '%H:00') as hour,
                SUM(o.TotalOrders) as orders
            FROM Orders o
            ${baseWhere}
            GROUP BY hour
            ORDER BY hour`;

        // 5. Customer Satisfaction Trend
        const satisfactionQuery = `
            SELECT 
                DATE_FORMAT(f.FeedbackDate, '%Y-%m-%d') as date,
                ROUND(AVG(f.Rating), 2) as rating,
                COUNT(*) as feedbackCount
            FROM Feedback f
            WHERE YEAR(f.FeedbackDate) = ? AND MONTH(f.FeedbackDate) = ?
                ${restaurantId ? 'AND f.RestaurantID = ?' : ''}
            GROUP BY date
            ORDER BY date`;

        // 6. Average Order Value Trend
        const avgOrderQuery = `
            SELECT 
                DATE_FORMAT(o.OrderDate, '%Y-%m-%d') as date,
                ROUND(AVG(o.TotalOrders * mp.Price), 2) as avgValue,
                COUNT(DISTINCT o.OrderID) as orderCount
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            ${baseWhere}
            GROUP BY date
            ORDER BY date`;

        // Execute all queries
        const [revenueComparison] = await db.query(revenueQuery, [
            year - 1, year,
            ...(cityId ? [cityId] : []),
            ...(restaurantId ? [restaurantId] : [])
        ]);

        const [categoryAnalysis] = await db.query(categoryQuery, baseParams);
        const [feedbackAnalysis] = await db.query(feedbackQuery, [
            year, month,
            ...(restaurantId ? [restaurantId] : [])
        ]);
        const [peakHours] = await db.query(peakHoursQuery, baseParams);
        const [satisfactionTrend] = await db.query(satisfactionQuery, [
            year, month,
            ...(restaurantId ? [restaurantId] : [])
        ]);
        const [avgOrderTrend] = await db.query(avgOrderQuery, baseParams);

        // Process data for comparison
        const processedRevenue = revenueComparison.reduce((acc, curr) => {
            const month = curr.date.substring(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = {
                    date: month,
                    currentYear: 0,
                    previousYear: 0
                };
            }
            if (curr.year == year) {
                acc[month].currentYear = curr.revenue;
            } else {
                acc[month].previousYear = curr.revenue;
            }
            return acc;
        }, {});

        res.json({
            status: 'success',
            data: {
                revenueComparison: Object.values(processedRevenue),
                categoryAnalysis,
                feedbackAnalysis,
                peakHours,
                customerSatisfaction: satisfactionTrend,
                averageOrderValue: avgOrderTrend
            }
        });

    } catch (err) {
        console.error('Analysis dashboard error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
// Accounting Routes
router.get('/api/accounting/current-stats', async (req, res) => {
    const { year, month, cityId, restaurantId } = req.query;

    // Validation - year and month are required
    if (!year || !month) {
        return res.status(400).json({
            status: 'error',
            message: 'Year and month are required'
        });
    }
    
    try {
        let query = `
            SELECT 
                SUM(o.TotalOrders * mp.Price) as revenue,
                SUM(o.TotalOrders) as orders,
                AVG(o.TotalOrders * mp.Price) as averageOrderValue,
                COALESCE(AVG(f.Rating), 0) as rating
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            LEFT JOIN Feedback f ON o.RestaurantID = f.RestaurantID 
                AND DATE(o.OrderDate) = DATE(f.FeedbackDate)
            WHERE YEAR(o.OrderDate) = ? AND MONTH(o.OrderDate) = ?
        `;

        const queryParams = [year, month];

        if (cityId) {
            query += ` AND o.CityID = ?`;
            queryParams.push(cityId);
        }

        if (restaurantId) {
            query += ` AND o.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }

        // Historical comparison query
        let historicalQuery = `
            SELECT 
                DATE_FORMAT(o.OrderDate, '%Y-%m') as yearMonth,
                SUM(o.TotalOrders * mp.Price) as revenue,
                SUM(o.TotalOrders) as orders,
                AVG(o.TotalOrders * mp.Price) as averageOrderValue,
                COALESCE(AVG(f.Rating), 0) as rating
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            LEFT JOIN Feedback f ON o.RestaurantID = f.RestaurantID 
                AND DATE(o.OrderDate) = DATE(f.FeedbackDate)
            WHERE DATE_FORMAT(o.OrderDate, '%Y-%m') < ?
        `;

        const historicalParams = [
            `${year}-${month.toString().padStart(2, '0')}`
        ];

        if (cityId) {
            historicalQuery += ` AND o.CityID = ?`;
            historicalParams.push(cityId);
        }

        if (restaurantId) {
            historicalQuery += ` AND o.RestaurantID = ?`;
            historicalParams.push(restaurantId);
        }

        historicalQuery += `
            GROUP BY yearMonth
            ORDER BY yearMonth DESC
            LIMIT 12
        `;

        // Execute queries
        const [currentStats] = await db.query(query, queryParams);
        const [historicalData] = await db.query(historicalQuery, historicalParams);

        // Calculate growth rates
        const stats = currentStats[0] || {
            revenue: 0,
            orders: 0,
            averageOrderValue: 0,
            rating: 0
        };
        
        const previousMonth = historicalData[0] || {
            revenue: 0,
            orders: 0,
            averageOrderValue: 0,
            rating: 0
        };

        // Growth rates calculation with null checks
        const growthRates = {
            revenue: calculateGrowthRate(stats.revenue, previousMonth.revenue),
            orders: calculateGrowthRate(stats.orders, previousMonth.orders),
            averageOrderValue: calculateGrowthRate(stats.averageOrderValue, previousMonth.averageOrderValue),
            rating: calculateGrowthRate(stats.rating, previousMonth.rating)
        };

        res.json({
            status: 'success',
            data: {
                ...stats,
                growthRates,
                historicalData,
                previousMonth
            }
        });

    } catch (err) {
        console.error('Error fetching accounting stats:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
// Messages Routes (continued)
router.get('/api/messages/history', async (req, res) => {
    const { cityId, restaurantId } = req.query;
    
    try {
        let query = `
            SELECT 
                m.MessageID as id,
                m.Subject as subject,
                m.Content as content,
                m.Priority as priority,
                m.Status as status,
                m.SentAt as sentAt,
                r.RestaurantName as restaurantName,
                c.CityName as cityName
            FROM Messages m
            JOIN Restaurants r ON m.RestaurantID = r.RestaurantID
            JOIN Cities c ON r.CityID = c.CityID
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += ` AND r.CityID = ?`;
            queryParams.push(cityId);
        }
        
        if (restaurantId) {
            query += ` AND m.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }
        
        query += ` ORDER BY m.SentAt DESC`;
        
        const [messages] = await db.query(query, queryParams);
        
        res.json({
            status: 'success',
            data: messages.map(msg => ({
                ...msg,
                sentAt: new Date(msg.sentAt).toISOString(),
                priority: msg.priority.toLowerCase(),
                status: msg.status.toLowerCase()
            }))
        });
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({
            status: 'error',
            message: 'Mesaj geçmişi yüklenirken bir hata oluştu'
        });
    }
});

// Message Routes
router.post('/api/messages/send', async (req, res) => {
    const { restaurantId, subject, content, priority } = req.body;
    
    try {
        // Restoran bilgilerini kontrol et
        const [restaurantResults] = await db.query(
            'SELECT RestaurantName FROM Restaurants WHERE RestaurantID = ?',
            [restaurantId]
        );
        
        if (restaurantResults.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Restoran bulunamadı'
            });
        }

        // Mesajı veritabanına kaydet
        const [result] = await db.query(
            `INSERT INTO Messages (RestaurantID, Subject, Content, Priority, Status, SentAt) 
             VALUES (?, ?, ?, ?, 'delivered', NOW())`,
            [restaurantId, subject, content, priority]
        );
        
        res.json({
            status: 'success',
            data: {
                messageId: result.insertId
            },
            message: 'Mesaj başarıyla gönderildi'
        });

    } catch (err) {
        console.error('Mesaj gönderme hatası:', err);
        res.status(500).json({
            status: 'error',
            message: 'Mesaj gönderilirken bir hata oluştu'
        });
    }
});

router.get('/api/messages/history', async (req, res) => {
    const { cityId, restaurantId } = req.query;
    
    try {
        let query = `
            SELECT 
                m.MessageID as id,
                m.Subject as subject,
                m.Content as content,
                m.Priority as priority,
                m.Status as status,
                m.SentAt as sentAt,
                r.RestaurantName as restaurantName,
                c.CityName as cityName
            FROM Messages m
            JOIN Restaurants r ON m.RestaurantID = r.RestaurantID
            JOIN Cities c ON r.CityID = c.CityID
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += ` AND r.CityID = ?`;
            queryParams.push(cityId);
        }
        
        if (restaurantId) {
            query += ` AND m.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }
        
        query += ` ORDER BY m.SentAt DESC`;
        
        const [messages] = await db.query(query, queryParams);
        
        res.json({
            status: 'success',
            data: messages.map(msg => ({
                ...msg,
                sentAt: new Date(msg.sentAt).toISOString()
            }))
        });
    } catch (err) {
        console.error('Mesaj geçmişi yükleme hatası:', err);
        res.status(500).json({
            status: 'error',
            message: 'Mesaj geçmişi yüklenirken bir hata oluştu'
        });
    }
});

// Mesajı okundu olarak işaretle
router.put('/api/messages/:id/read', async (req, res) => {
    const { id } = req.params;
    
    try {
        await db.query(
            'UPDATE Messages SET Status = "read" WHERE MessageID = ?',
            [id]
        );
        
        res.json({
            status: 'success',
            message: 'Mesaj okundu olarak işaretlendi'
        });
    } catch (err) {
        console.error('Mesaj güncelleme hatası:', err);
        res.status(500).json({
            status: 'error',
            message: 'Mesaj güncellenirken bir hata oluştu'
        });
    }
});

// Projections endpoint
router.post('/api/accounting/projections', async (req, res) => {
    const { 
        baseStats, 
        growthRate, 
        months = 12,
        expectedRating = 5 
    } = req.body;

    try {
        const projections = {
            revenue: [],
            orders: [],
            rating: [],
            metrics: {}
        };

        let currentRevenue = baseStats.revenue;
        let currentOrders = baseStats.orders;
        let currentRating = baseStats.rating;

        // Monthly growth rate
        const monthlyGrowthRate = growthRate / 100;

        // Calculate projections for each month
        for (let i = 1; i <= months; i++) {
            // Revenue projection with compound growth
            currentRevenue *= (1 + monthlyGrowthRate);
            projections.revenue.push({
                month: i,
                value: Math.round(currentRevenue * 100) / 100,
                baseline: baseStats.revenue
            });

            // Orders projection
            currentOrders *= (1 + monthlyGrowthRate);
            projections.orders.push({
                month: i,
                value: Math.round(currentOrders),
                baseline: baseStats.orders
            });

            // Rating projection (linear progression towards target)
            const ratingDiff = expectedRating - baseStats.rating;
            const monthlyRatingIncrease = ratingDiff / months;
            currentRating = baseStats.rating + (monthlyRatingIncrease * i);
            projections.rating.push({
                month: i,
                value: Math.min(5, Math.round(currentRating * 10) / 10),
                baseline: baseStats.rating
            });
        }

        // Calculate summary metrics
        projections.metrics = {
            endOfPeriodRevenue: projections.revenue[months - 1].value,
            endOfPeriodOrders: projections.orders[months - 1].value,
            endOfPeriodRating: projections.rating[months - 1].value,
            totalGrowth: monthlyGrowthRate * months * 100,
            averageMonthlyGrowth: monthlyGrowthRate * 100
        };

        res.json({
            status: 'success',
            data: projections
        });

    } catch (err) {
        console.error('Error calculating projections:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// Utility function for growth rate calculation
function calculateGrowthRate(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
}

// Restaurant Performance Analysis
router.get('/analysis/restaurant-performance', async (req, res) => {
    const { year, month } = req.query;

    try {
        let query = `
            SELECT 
                r.RestaurantName,
                COUNT(o.OrderID) as TotalOrders,
                SUM(o.TotalOrders) as TotalMeals,
                AVG(o.TotalOrders) as AverageOrderSize,
                c.CityName
            FROM Orders o
            JOIN Restaurants r ON o.RestaurantID = r.RestaurantID
            JOIN Cities c ON r.CityID = c.CityID
            WHERE 1=1
        `;

        const queryParams = [];

        if (year && month) {
            query += ` AND YEAR(o.OrderDate) = ? AND MONTH(o.OrderDate) = ?`;
            queryParams.push(year, month);
        }

        query += `
            GROUP BY r.RestaurantID, r.RestaurantName, c.CityName
            ORDER BY TotalOrders DESC
        `;

        const [rows] = await db.query(query, queryParams);
        res.json({
            status: 'success',
            data: rows
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Database error'
        });
    }
});

// Accounting Endpoints
router.get('/api/accounting/current-stats', async (req, res) => {
    const { year, month, cityId, restaurantId } = req.query;
    
    try {
        let query = `
            SELECT 
                SUM(o.TotalOrders * mp.Price) as revenue,
                SUM(o.TotalOrders) as orders,
                AVG(o.TotalOrders * mp.Price) as averageOrderValue,
                COALESCE(AVG(f.Rating), 0) as rating
            FROM Orders o
            JOIN MealPrices mp ON o.MealID = mp.MealID
            LEFT JOIN Feedback f ON o.RestaurantID = f.RestaurantID 
                AND DATE(o.OrderDate) = DATE(f.FeedbackDate)
            WHERE YEAR(o.OrderDate) = ? AND MONTH(o.OrderDate) = ?
        `;
        
        const queryParams = [year, month];
        
        if (cityId) {
            query += ` AND o.CityID = ?`;
            queryParams.push(cityId);
        }
        
        if (restaurantId) {
            query += ` AND o.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }
        
        const [results] = await db.query(query, queryParams);
        
        if (results.length > 0) {
            const stats = {
                revenue: Number(results[0].revenue) || 0,
                orders: Number(results[0].orders) || 0,
                averageOrderValue: Number(results[0].averageOrderValue) || 0,
                rating: Number(results[0].rating) || 0
            };
            
            res.json({
                status: 'success',
                data: stats
            });
        } else {
            res.json({
                status: 'success',
                data: {
                    revenue: 0,
                    orders: 0,
                    averageOrderValue: 0,
                    rating: 0
                }
            });
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// Messages Endpoints
router.post('/api/messages/send', async (req, res) => {
    const { restaurantId, subject, content, priority } = req.body;
    
    try {
        // Restoran bilgilerini al
        const [restaurantResults] = await db.query(
            'SELECT r.RestaurantName, r.Email FROM Restaurants r WHERE r.RestaurantID = ?',
            [restaurantId]
        );
        
        if (restaurantResults.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Restaurant not found'
            });
        }const restaurant = restaurantResults[0];
        
        // Mesajı veritabanına kaydet
        const [result] = await db.query(
            `INSERT INTO Messages (RestaurantID, Subject, Content, Priority) 
             VALUES (?, ?, ?, ?)`,
            [restaurantId, subject, content, priority]
        );
        
        // Email gönderme işlemi
        try {
            await transporter.sendMail({
                from: '"FastEat Admin" <admin@fasteat.com>',
                to: restaurant.Email,
                subject: subject,
                text: content,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #f4a261;">${subject}</h2>
                        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                            ${content}
                        </div>
                        <div style="margin-top: 20px; color: #666;">
                            <p>Best regards,<br>FastEat Admin Team</p>
                        </div>
                    </div>
                `
            });
            
            await db.query(
                'UPDATE Messages SET Status = ? WHERE MessageID = ?',
                ['delivered', result.insertId]
            );
            
            res.json({
                status: 'success',
                message: 'Message sent successfully',
                data: {
                    messageId: result.insertId,
                    status: 'delivered'
                }
            });
        } catch (emailError) {
            await db.query(
                'UPDATE Messages SET Status = ? WHERE MessageID = ?',
                ['failed', result.insertId]
            );
            
            console.error('Email sending error:', emailError);
            
            res.status(500).json({
                status: 'error',
                message: 'Message saved but email delivery failed'
            });
        }
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

router.get('/api/messages/history', async (req, res) => {
    const { cityId, restaurantId } = req.query;
    
    try {
        let query = `
            SELECT 
                m.MessageID as id,
                m.Subject as subject,
                m.Content as content,
                m.Priority as priority,
                m.Status as status,
                m.SentAt as sentAt,
                r.RestaurantName,
                c.CityName
            FROM Messages m
            JOIN Restaurants r ON m.RestaurantID = r.RestaurantID
            JOIN Cities c ON r.CityID = c.CityID
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (cityId) {
            query += ` AND r.CityID = ?`;
            queryParams.push(cityId);
        }
        
        if (restaurantId) {
            query += ` AND m.RestaurantID = ?`;
            queryParams.push(restaurantId);
        }
        
        query += ` ORDER BY m.SentAt DESC`;
        
        const [messages] = await db.query(query, queryParams);
        
        res.json({
            status: 'success',
            data: messages
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});

// Settings Endpoints
router.get('/api/settings', async (req, res) => {
    const userId = req.user?.id;
    
    try {
        const [settings] = await db.query(
            'SELECT * FROM UserSettings WHERE UserID = ?',
            [userId]
        );

        if (settings.length > 0) {
            res.json({
                status: 'success',
                data: {
                    settings: {
                        notifications: JSON.parse(settings[0].NotificationSettings),
                        appearance: JSON.parse(settings[0].AppearanceSettings),
                        privacy: JSON.parse(settings[0].PrivacySettings),
                        security: JSON.parse(settings[0].SecuritySettings)
                    }
                }
            });
        } else {
            res.json({
                status: 'success',
                data: {
                    settings: {
                        notifications: {
                            email: true,
                            browser: true,
                            orderUpdates: true,
                            marketingEmails: false
                        },
                        appearance: {
                            theme: 'light',
                            language: 'en',
                            compactMode: false
                        },
                        privacy: {
                            shareAnalytics: true,
                            shareLocation: true
                        },
                        security: {
                            twoFactorAuth: false,
                            sessionTimeout: 30
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Settings fetch error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch settings'
        });
    }
});

// Settings Update Endpoint
router.post('/api/settings/:category', async (req, res) => {
    const userId = req.user?.id;
    const { category } = req.params;
    const settings = req.body;

    try {
        const [existingSettings] = await db.query(
            'SELECT * FROM UserSettings WHERE UserID = ?',
            [userId]
        );

        if (existingSettings.length > 0) {
            await db.query(
                `UPDATE UserSettings 
                 SET ${category}Settings = ?
                 WHERE UserID = ?`,
                [JSON.stringify(settings), userId]
            );
        } else {
            const defaultSettings = {
                notifications: {
                    email: true,
                    browser: true,
                    orderUpdates: true,
                    marketingEmails: false
                },
                appearance: {
                    theme: 'light',
                    language: 'en',
                    compactMode: false
                },
                privacy: {
                    shareAnalytics: true,
                    shareLocation: true
                },
                security: {
                    twoFactorAuth: false,
                    sessionTimeout: 30
                }
            };

            defaultSettings[category] = settings;

            await db.query(
                `INSERT INTO UserSettings (
                    UserID, 
                    NotificationSettings, 
                    AppearanceSettings, 
                    PrivacySettings, 
                    SecuritySettings
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    userId,
                    JSON.stringify(defaultSettings.notifications),
                    JSON.stringify(defaultSettings.appearance),
                    JSON.stringify(defaultSettings.privacy),
                    JSON.stringify(defaultSettings.security)
                ]
            );
        }

        res.json({
            status: 'success',
            message: 'Settings updated successfully'
        });
    } catch (err) {
        console.error('Settings update error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update settings'
        });
    }
});

export default router;