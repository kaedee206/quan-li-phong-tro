import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Description, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Contracts = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Hợp đồng
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/contracts/add')}
        >
          Tạo hợp đồng
        </Button>
      </Box>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Trang quản lý hợp đồng
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tính năng đang được phát triển...
        </Typography>
      </Paper>
    </Box>
  );
};

export default Contracts;