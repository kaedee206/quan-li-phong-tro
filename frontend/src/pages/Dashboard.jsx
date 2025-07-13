import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  People,
  Room,
  Payment,
  Description,
  Warning,
  CheckCircle,
  Refresh,
  Analytics,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { APP_CONFIG } from '../utils/constants';

const Dashboard = () => {
  const { theme } = useTheme();

  // Mock data - sẽ được thay thế bằng real data từ API
  const stats = {
    totalRooms: 50,
    occupiedRooms: 42,
    availableRooms: 8,
    totalTenants: 42,
    totalContracts: 45,
    monthlyRevenue: 33600000,
    pendingPayments: 5,
    overduePayments: 2,
  };

  const quickStats = [
    {
      title: 'Tổng số phòng',
      value: stats.totalRooms,
      icon: <Room />,
      color: 'primary',
      trend: '+2 từ tháng trước',
    },
    {
      title: 'Phòng đã thuê',
      value: stats.occupiedRooms,
      icon: <CheckCircle />,
      color: 'success',
      trend: '+5 từ tháng trước',
    },
    {
      title: 'Khách thuê',
      value: stats.totalTenants,
      icon: <People />,
      color: 'info',
      trend: '+3 từ tháng trước',
    },
    {
      title: 'Doanh thu tháng',
      value: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(stats.monthlyRevenue),
      icon: <Payment />,
      color: 'warning',
      trend: '+12% từ tháng trước',
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'contract',
      title: 'Hợp đồng mới',
      description: 'Nguyễn Văn A đã ký hợp đồng thuê phòng 101',
      time: '2 giờ trước',
      icon: <Description />,
      color: 'success',
    },
    {
      id: 2,
      type: 'payment',
      title: 'Thanh toán',
      description: 'Trần Thị B đã thanh toán tiền phòng 203',
      time: '4 giờ trước',
      icon: <Payment />,
      color: 'primary',
    },
    {
      id: 3,
      type: 'warning',
      title: 'Cảnh báo',
      description: 'Phòng 105 cần bảo trì',
      time: '1 ngày trước',
      icon: <Warning />,
      color: 'warning',
    },
  ];

  const occupancyRate = Math.round((stats.occupiedRooms / stats.totalRooms) * 100);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Tổng quan
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Xin chào! Chào mừng bạn đến với hệ thống quản lý phòng trọ
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
        >
          Làm mới
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {quickStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: `${stat.color}.main`,
                      mr: 2,
                      width: 56,
                      height: 56,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="success.main">
                  <TrendingUp fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  {stat.trend}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Occupancy Rate */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tỷ lệ lấp đầy
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3" component="div" sx={{ mr: 1 }}>
                  {occupancyRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({stats.occupiedRooms}/{stats.totalRooms} phòng)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={occupancyRate}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                Phòng trống: {stats.availableRooms} phòng
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trạng thái thanh toán
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Chờ thanh toán</Typography>
                  <Chip label={stats.pendingPayments} color="warning" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Quá hạn</Typography>
                  <Chip label={stats.overduePayments} color="error" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Đã thanh toán</Typography>
                  <Chip label={stats.totalTenants - stats.pendingPayments - stats.overduePayments} color="success" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Hoạt động gần đây
                </Typography>
                <IconButton>
                  <Analytics />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivities.map((activity) => (
                  <Paper key={activity.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: `${activity.color}.main`, width: 40, height: 40 }}>
                        {activity.icon}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;