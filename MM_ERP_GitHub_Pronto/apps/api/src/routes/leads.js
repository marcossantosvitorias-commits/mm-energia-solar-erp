import express from 'express';
import { google } from 'googleapis';
import logger from '../utils/logger.js';

const router = express.Router();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SHEET_NAME = 'Sheet1';

// Initialize Google Sheets API
const sheets = google.sheets({
  version: 'v4',
  auth: process.env.GOOGLE_SHEETS_API_KEY,
});

router.post('/', async (req, res) => {
  const { nome, email, estado, cidade, whatsapp, cpf, valor_conta, tipo_sistema } = req.body;

  // Input validation
  if (!nome || !email || !estado || !cidade || !whatsapp || !cpf || !valor_conta || !tipo_sistema) {
    return res.status(400).json({
      error: 'Missing required fields: nome, email, estado, cidade, whatsapp, cpf, valor_conta, tipo_sistema',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate CPF format (basic check - 11 digits)
  const cpfRegex = /^\d{11}$/;
  if (!cpfRegex.test(cpf.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Invalid CPF format' });
  }

  // Prepare row data
  const timestamp = new Date().toISOString();
  const values = [
    [timestamp, nome, email, estado, cidade, whatsapp, cpf, valor_conta, tipo_sistema],
  ];

  // Append to Google Sheets
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:I`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });

  if (!response.data.updates) {
    throw new Error('Failed to append data to Google Sheets');
  }

  logger.info(`Lead submitted: ${email}`);

  res.json({
    success: true,
    message: 'Lead submitted successfully',
  });
});

export default router;