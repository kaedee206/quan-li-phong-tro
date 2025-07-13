import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Notifications,
  Settings,
  Person,
  ExitToApp,
  Health,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import { APP_CONFIG } from '../../utils/constants';

const Header = ({ onSidebarToggle, sidebarOpen, sidebarMini, isMobile }) => {
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notificationCount] = React.useState(0); // TODO: Implement notification system

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logout clicked');
    handleMenuClose();
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: APP_CONFIG.timezone,
    });
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
      elevation={1}
    >
      <Toolbar>
        {/* Menu Button */}
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          onClick={onSidebarToggle}
          edge="start"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Title */}
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {APP_CONFIG.name}
        </Typography>

        {/* Current Time */}
        <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
          {getCurrentTime()}
        </Typography>

        {/* Theme Toggle */}
        <Tooltip title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}>
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Thông báo">
          <IconButton color="inherit">
            <Badge badgeContent={notificationCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Health Status */}
        <Tooltip title="Trạng thái hệ thống">
          <IconButton color="inherit">
            <Health color="success" />
          </IconButton>
        </Tooltip>

        {/* User Menu */}
        <Box sx={{ ml: 2 }}>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              <Person />
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>
              <Person sx={{ mr: 2 }} />
              Thông tin cá nhân
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <Settings sx={{ mr: 2 }} />
              Cài đặt
            </MenuItem>
            <Divider />
            <MenuItem>
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={toggleDarkMode}
                    size="small"
                  />
                }
                label="Chế độ tối"
                sx={{ ml: 0 }}
              />
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 2 }} />
              Đăng xuất
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;