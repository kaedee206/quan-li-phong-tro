import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Payment, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Payments = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Thu chi
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/payments/add')}
        >
          Tạo thanh toán
        </Button>
      </Box>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Payment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Trang quản lý thu chi
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tính năng đang được phát triển...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Payments;