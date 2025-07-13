import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';

const PaymentForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        {isEdit ? 'Sửa thanh toán' : 'Tạo thanh toán mới'}
      </Typography>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Form tạo/sửa thanh toán
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tính năng đang được phát triển...
        </Typography>
      </Paper>
    </Box>
  );
};

export default PaymentForm;