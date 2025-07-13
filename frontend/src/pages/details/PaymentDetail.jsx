import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';

const PaymentDetail = () => {
  const { id } = useParams();

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Chi tiết thanh toán #{id}
      </Typography>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Trang chi tiết thanh toán
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tính năng đang được phát triển...
        </Typography>
      </Paper>
    </Box>
  );
};

export default PaymentDetail;