const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

// Service gửi webhook Discord
const sendDiscordWebhook = async (embed) => {
  try {
    if (!config.discord.webhookUrl) {
      throw new Error('Discord webhook URL chưa được cấu hình');
    }

    const response = await axios.post(config.discord.webhookUrl, {
      embeds: [embed],
    });

    logger.info('Gửi Discord webhook thành công');
    return response.data;
  } catch (error) {
    logger.error('Lỗi gửi Discord webhook:', error);
    throw error;
  }
};

// POST /api/discord/notify - Gửi thông báo Discord
router.post('/notify', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      color = 0x3498db, 
      fields = [], 
      footer = {},
      thumbnail = {},
      image = {}
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề và mô tả là bắt buộc',
      });
    }

    const embed = {
      title,
      description,
      color,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: footer.text || 'Quản lý phòng trọ',
        icon_url: footer.icon_url || '',
      },
    };

    if (thumbnail.url) embed.thumbnail = thumbnail;
    if (image.url) embed.image = image;

    await sendDiscordWebhook(embed);

    logger.info(`Gửi thông báo Discord: ${title}`);

    res.json({
      success: true,
      message: 'Gửi thông báo Discord thành công',
    });
  } catch (error) {
    logger.error('Lỗi gửi thông báo Discord:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi thông báo Discord',
      error: error.message,
    });
  }
});

// POST /api/discord/payment-reminder - Gửi nhắc nhở thanh toán
router.post('/payment-reminder', async (req, res) => {
  try {
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách thanh toán không hợp lệ',
      });
    }

    // Tạo embed cho nhắc nhở thanh toán
    const embed = {
      title: '🔔 Nhắc nhở thanh toán',
      description: `Có ${payments.length} phòng cần thanh toán`,
      color: 0xe74c3c, // Màu đỏ
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Hệ thống quản lý phòng trọ',
      },
    };

    // Thêm thông tin từng phòng
    payments.forEach((payment, index) => {
      if (index < 25) { // Discord giới hạn 25 fields
        const dueDate = moment(payment.dueDate).tz(config.timezone).format('DD/MM/YYYY');
        const formattedAmount = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(payment.totalAmount);

        embed.fields.push({
          name: `Phòng ${payment.room?.number || 'N/A'}`,
          value: `👤 ${payment.tenant?.name || 'N/A'}\n📅 Hạn: ${dueDate}\n💰 Số tiền: ${formattedAmount}`,
          inline: true,
        });
      }
    });

    // Nếu có nhiều hơn 25 phòng, thêm thông báo
    if (payments.length > 25) {
      embed.fields.push({
        name: '⚠️ Thông báo',
        value: `Và ${payments.length - 25} phòng khác...`,
        inline: false,
      });
    }

    await sendDiscordWebhook(embed);

    logger.info(`Gửi nhắc nhở thanh toán cho ${payments.length} phòng`);

    res.json({
      success: true,
      message: 'Gửi nhắc nhở thanh toán thành công',
    });
  } catch (error) {
    logger.error('Lỗi gửi nhắc nhở thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi nhắc nhở thanh toán',
      error: error.message,
    });
  }
});

// POST /api/discord/contract-expiry - Gửi thông báo hợp đồng sắp hết hạn
router.post('/contract-expiry', async (req, res) => {
  try {
    const { contracts } = req.body;

    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách hợp đồng không hợp lệ',
      });
    }

    // Tạo embed cho thông báo hợp đồng sắp hết hạn
    const embed = {
      title: '⏰ Hợp đồng sắp hết hạn',
      description: `Có ${contracts.length} hợp đồng sắp hết hạn`,
      color: 0xf39c12, // Màu vàng
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Hệ thống quản lý phòng trọ',
      },
    };

    // Thêm thông tin từng hợp đồng
    contracts.forEach((contract, index) => {
      if (index < 25) { // Discord giới hạn 25 fields
        const endDate = moment(contract.endDate).tz(config.timezone).format('DD/MM/YYYY');
        const daysLeft = moment(contract.endDate).diff(moment(), 'days');

        embed.fields.push({
          name: `Hợp đồng ${contract.contractNumber}`,
          value: `🏠 Phòng: ${contract.room?.number || 'N/A'}\n👤 Khách: ${contract.tenant?.name || 'N/A'}\n📅 Hết hạn: ${endDate}\n⏳ Còn: ${daysLeft} ngày`,
          inline: true,
        });
      }
    });

    // Nếu có nhiều hơn 25 hợp đồng, thêm thông báo
    if (contracts.length > 25) {
      embed.fields.push({
        name: '⚠️ Thông báo',
        value: `Và ${contracts.length - 25} hợp đồng khác...`,
        inline: false,
      });
    }

    await sendDiscordWebhook(embed);

    logger.info(`Gửi thông báo hợp đồng sắp hết hạn cho ${contracts.length} hợp đồng`);

    res.json({
      success: true,
      message: 'Gửi thông báo hợp đồng sắp hết hạn thành công',
    });
  } catch (error) {
    logger.error('Lỗi gửi thông báo hợp đồng sắp hết hạn:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi thông báo hợp đồng sắp hết hạn',
      error: error.message,
    });
  }
});

// POST /api/discord/system-status - Gửi trạng thái hệ thống
router.post('/system-status', async (req, res) => {
  try {
    const { 
      status = 'online', 
      message = 'Hệ thống hoạt động bình thường',
      details = {},
      color
    } = req.body;

    // Xác định màu dựa trên trạng thái
    let embedColor = color;
    if (!embedColor) {
      switch (status) {
        case 'online':
          embedColor = 0x2ecc71; // Màu xanh lá
          break;
        case 'warning':
          embedColor = 0xf39c12; // Màu vàng
          break;
        case 'error':
          embedColor = 0xe74c3c; // Màu đỏ
          break;
        case 'maintenance':
          embedColor = 0x9b59b6; // Màu tím
          break;
        default:
          embedColor = 0x3498db; // Màu xanh dương
      }
    }

    const embed = {
      title: '🖥️ Trạng thái hệ thống',
      description: message,
      color: embedColor,
      fields: [],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Hệ thống quản lý phòng trọ',
      },
    };

    // Thêm thông tin chi tiết
    if (details.uptime) {
      embed.fields.push({
        name: '⏱️ Uptime',
        value: details.uptime,
        inline: true,
      });
    }

    if (details.dbStatus) {
      embed.fields.push({
        name: '🗄️ Database',
        value: details.dbStatus,
        inline: true,
      });
    }

    if (details.memoryUsage) {
      embed.fields.push({
        name: '💾 Memory',
        value: details.memoryUsage,
        inline: true,
      });
    }

    if (details.activeConnections) {
      embed.fields.push({
        name: '👥 Connections',
        value: details.activeConnections.toString(),
        inline: true,
      });
    }

    await sendDiscordWebhook(embed);

    logger.info(`Gửi trạng thái hệ thống: ${status}`);

    res.json({
      success: true,
      message: 'Gửi trạng thái hệ thống thành công',
    });
  } catch (error) {
    logger.error('Lỗi gửi trạng thái hệ thống:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi trạng thái hệ thống',
      error: error.message,
    });
  }
});

// GET /api/discord/test - Test Discord webhook
router.get('/test', async (req, res) => {
  try {
    const embed = {
      title: '✅ Test Discord Webhook',
      description: 'Đây là tin nhắn test từ hệ thống quản lý phòng trọ',
      color: 0x00ff00, // Màu xanh lá
      fields: [
        {
          name: 'Thời gian',
          value: moment().tz(config.timezone).format('DD/MM/YYYY HH:mm:ss'),
          inline: true,
        },
        {
          name: 'Trạng thái',
          value: 'Hoạt động bình thường',
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Hệ thống quản lý phòng trọ',
      },
    };

    await sendDiscordWebhook(embed);

    logger.info('Test Discord webhook thành công');

    res.json({
      success: true,
      message: 'Test Discord webhook thành công',
    });
  } catch (error) {
    logger.error('Lỗi test Discord webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi test Discord webhook',
      error: error.message,
    });
  }
});

// GET /api/discord/webhook-info - Lấy thông tin webhook
router.get('/webhook-info', async (req, res) => {
  try {
    const hasWebhook = !!config.discord.webhookUrl;
    
    if (!hasWebhook) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'Discord webhook chưa được cấu hình',
        },
      });
    }

    // Kiểm tra webhook có hoạt động không
    try {
      const webhookUrl = config.discord.webhookUrl;
      const response = await axios.get(webhookUrl);
      
      res.json({
        success: true,
        data: {
          configured: true,
          status: 'active',
          webhookInfo: {
            name: response.data.name,
            avatar: response.data.avatar,
            channel_id: response.data.channel_id,
            guild_id: response.data.guild_id,
          },
        },
      });
    } catch (error) {
      res.json({
        success: true,
        data: {
          configured: true,
          status: 'inactive',
          error: error.message,
        },
      });
    }
  } catch (error) {
    logger.error('Lỗi lấy thông tin webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin webhook',
      error: error.message,
    });
  }
});

module.exports = router;