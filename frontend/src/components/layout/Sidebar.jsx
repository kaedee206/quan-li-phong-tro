import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
  Tooltip,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  Room,
  People,
  Description,
  Payment,
  Notes,
  Settings,
  ExpandLess,
  ExpandMore,
  Add,
  Analytics,
  NotificationsActive,
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import { APP_CONFIG } from '../../utils/constants';

// Icon mapping
const iconMap = {
  Dashboard,
  Room,
  People,
  Description,
  Payment,
  Notes,
  Settings,
  Add,
  Analytics,
  NotificationsActive,
};

const Sidebar = ({ open, mini, onClose, isMobile }) => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = React.useState({});

  const handleItemClick = (item) => {
    if (item.children) {
      setExpandedItems(prev => ({
        ...prev,
        [item.id]: !prev[item.id],
      }));
    } else {
      navigate(item.path);
      if (isMobile) {
        onClose();
      }
    }
  };

  const isItemActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const menuItems = [
    ...APP_CONFIG.menuItems,
    {
      id: 'divider1',
      type: 'divider',
    },
    {
      id: 'quick-actions',
      title: 'Thao tác nhanh',
      icon: 'Add',
      children: APP_CONFIG.quickActions,
    },
    {
      id: 'divider2',
      type: 'divider',
    },
    {
      id: 'notifications',
      title: 'Thông báo',
      icon: 'NotificationsActive',
      path: '/notifications',
      badge: 3,
    },
    {
      id: 'analytics',
      title: 'Báo cáo',
      icon: 'Analytics',
      path: '/analytics',
    },
  ];

  const renderMenuItem = (item) => {
    if (item.type === 'divider') {
      return <Divider key={item.id} sx={{ my: 1 }} />;
    }

    const IconComponent = iconMap[item.icon];
    const isActive = isItemActive(item);
    const isExpanded = expandedItems[item.id];

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <Tooltip title={mini ? item.title : ''} placement="right">
            <ListItemButton
              onClick={() => handleItemClick(item)}
              selected={isActive}
              sx={{
                minHeight: 48,
                px: 2.5,
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: mini ? 0 : 3,
                  justifyContent: 'center',
                  color: isActive ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                }}
              >
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    <IconComponent />
                  </Badge>
                ) : (
                  <IconComponent />
                )}
              </ListItemIcon>
              {!mini && (
                <>
                  <ListItemText
                    primary={item.title}
                    sx={{ opacity: 1 }}
                  />
                  {item.children && (
                    isExpanded ? <ExpandLess /> : <ExpandMore />
                  )}
                </>
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
        
        {item.children && !mini && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child) => {
                const ChildIconComponent = iconMap[child.icon];
                return (
                  <ListItem key={child.id} disablePadding>
                    <ListItemButton
                      onClick={() => navigate(child.path)}
                      sx={{
                        pl: 4,
                        minHeight: 40,
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: 2,
                          justifyContent: 'center',
                        }}
                      >
                        <ChildIconComponent fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={child.title}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box>
      {/* Logo/Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: mini ? 'center' : 'flex-start',
          px: mini ? 1 : 2,
          py: 2,
          minHeight: 64,
        }}
      >
        <Avatar
          sx={{
            width: mini ? 32 : 40,
            height: mini ? 32 : 40,
            bgcolor: theme.palette.primary.main,
            mr: mini ? 0 : 2,
          }}
        >
          <Room />
        </Avatar>
        {!mini && (
          <Box>
            <Typography variant="h6" noWrap>
              {APP_CONFIG.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{APP_CONFIG.version}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ pt: 1 }}>
        {menuItems.map(renderMenuItem)}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={open}
      onClose={onClose}
      sx={{
        width: mini ? APP_CONFIG.sidebar.miniWidth : APP_CONFIG.sidebar.width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: mini ? APP_CONFIG.sidebar.miniWidth : APP_CONFIG.sidebar.width,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;