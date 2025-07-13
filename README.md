# Quan Ly Phong Tro - Room Management System

Ứng dụng quản lý phòng trọ dành cho admin với giao diện React và backend Node.js.

## Tính năng chính

- **Quản lý phòng trọ**: Thêm, sửa, xóa phòng với trạng thái và hình ảnh
- **Quản lý khách thuê**: Quản lý thông tin khách thuê và liên kết phòng
- **Quản lý hợp đồng**: Tạo, gia hạn, kết thúc hợp đồng
- **Thu chi**: Tự động tính tiền điện, nước, phòng
- **Thông báo Discord**: Gửi thông báo hạn thanh toán
- **QR thanh toán**: Tạo mã QR thanh toán VietQR
- **Ghi chú cá nhân**: Ghi chú theo thời gian cho admin
- **Dark/Light mode**: Chuyển đổi giao diện sáng/tối
- **Responsive**: Tương thích mobile và desktop

## Công nghệ

- **Frontend**: React.js + Material UI
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **Deployment**: Docker support

## Cài đặt

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# Cấu hình .env file
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Cấu trúc dự án

```
/
├── frontend/          # React frontend
├── backend/           # Node.js backend
├── .env.example       # Environment variables mẫu
├── docker-compose.yml # Docker setup
└── README.md
```

## API Endpoints

- **Rooms**: `/api/rooms` - Quản lý phòng
- **Tenants**: `/api/tenants` - Quản lý khách thuê
- **Contracts**: `/api/contracts` - Quản lý hợp đồng
- **Payments**: `/api/payments` - Quản lý thanh toán
- **Notes**: `/api/notes` - Ghi chú cá nhân
- **Discord**: `/api/discord/notify` - Thông báo Discord
- **QR**: `/api/qr/generate` - Tạo QR thanh toán
- **Backup**: `/api/backup` - Sao lưu dữ liệu
- **Health**: `/api/health` - Kiểm tra trạng thái

## Tính năng đặc biệt

### Khóa truy cập theo giờ
Hệ thống tự động khóa truy cập từ 2h-5h sáng GMT+7 để bảo trì.

### Tích hợp Discord
Gửi thông báo tự động khi gần hạn thanh toán qua Discord webhook.

### QR Payment
Tích hợp VietQR API để tạo mã QR thanh toán tự động.

### Backup tự động
Sao lưu dữ liệu định kỳ dưới dạng file .zip.

## License

Private project - All rights reserved.