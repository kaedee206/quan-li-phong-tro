import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            textAlign="center"
            gap={3}
          >
            <ErrorOutline color="error" sx={{ fontSize: 64 }} />
            <Typography variant="h4" color="error" gutterBottom>
              Oops! Đã xảy ra lỗi
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Ứng dụng đã gặp phải một lỗi không mong muốn. Vui lòng thử tải lại trang.
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<Refresh />}
              onClick={this.handleReload}
              size="large"
            >
              Tải lại trang
            </Button>
            
            {import.meta.env.DEV && this.state.error && (
              <Box 
                mt={4} 
                p={2} 
                bgcolor="grey.100" 
                borderRadius={1}
                width="100%"
                sx={{ textAlign: 'left' }}
              >
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Error Details (Development Mode):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                </Typography>
                {this.state.errorInfo && (
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;