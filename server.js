import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : null;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!CLIENT_EMAIL || !PRIVATE_KEY || !FOLDER_ID) {
  console.warn(
    "⚠ Нет одной из переменных: GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY / GOOGLE_DRIVE_FOLDER_ID"
  );
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Авторизация в Google API
const auth = new google.auth.JWT(
  CLIENT_EMAIL,
  null,
  PRIVATE_KEY,
  ["https://www.googleapis.com/auth/drive"]
);

const drive = google.drive({ version: "v3", auth });

// Ищем файл modules_data.json в нашей папке
async function findDataFile() {
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name = 'modules_data.json' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive"
  });

  return res.data.files && res.data.files[0] ? res.data.files[0].id : null;
}

// Читаем JSON из файла
async function readDataFile() {
  const fileId = await findDataFile();
  if (!fileId) {
    // файла ещё нет
    return {};
  }

  const res = await drive.files.get({
    fileId,
    alt: "media"
  });

  return res.data || {};
}

// Пишем JSON в файл (создаём или обновляем)
async function writeDataFile(data) {
  const fileId = await findDataFile();
  const media = {
    mimeType: "application/json",
    body: Buffer.from(JSON.stringify(data, null, 2), "utf8")
  };

  if (!fileId) {
    // создаём новый файл в папке
    await drive.files.create({
      requestBody: {
        name: "modules_data.json",
        parents: [FOLDER_ID],
        mimeType: "application/json"
      },
      media
    });
  } else {
    // обновляем существующий файл
    await drive.files.update({
      fileId,
      media
    });
  }
}

// ====== API ======

app.get("/load-modules", async (req, res) => {
  try {
    const data = await readDataFile();
    if (data && typeof data === "object") {
      res.json(data);
    } else {
      res.json({});
    }
  } catch (err) {
    console.error("Ошибка чтения Google Drive:", err.response?.data || err.message);
    res.status(500).json({ error: "load_error" });
  }
});

app.post("/save-modules", async (req, res) => {
  try {
    const body = req.body || {};
    await writeDataFile(body);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Ошибка записи на Google Drive:", err.response?.data || err.message);
    res.status(500).json({ error: "save_error" });
  }
});

app.get("/", (req, res) => {
  res.send("QC backend (Google Drive) is running");
});

app.listen(PORT, () => {
  console.log(`QC backend (Google Drive) listening on port ${PORT}`);
});


