import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme as useMuiTheme } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { APP_CONFIG } from '../../utils/constants';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMini, setSidebarMini] = useState(false);
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSidebarToggle = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarMini(!sidebarMini);
    }
  };

  const sidebarWidth = sidebarMini ? APP_CONFIG.sidebar.miniWidth : APP_CONFIG.sidebar.width;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <Header 
        onSidebarToggle={handleSidebarToggle}
        sidebarOpen={sidebarOpen}
        sidebarMini={sidebarMini}
        isMobile={isMobile}
      />
      
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen}
        mini={sidebarMini}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8, // Space for fixed header
          pl: isMobile ? 0 : sidebarMini ? `${APP_CONFIG.sidebar.miniWidth}px` : `${APP_CONFIG.sidebar.width}px`,
          transition: theme.transitions.create(['margin', 'padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;