import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ сюда Render подставит твой OAuth-токен (y0_...)
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;

// ⚠️ кладём данные в папку приложения на Диске
const FILE_PATH = "app:/modules_data.json";

if (!YANDEX_TOKEN) {
  console.warn("ВНИМАНИЕ: переменная окружения YANDEX_TOKEN не задана!");
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function getDownloadUrl() {
  const resp = await axios.get(
    "https://cloud-api.yandex.net/v1/disk/resources/download",
    {
      params: { path: FILE_PATH },
      headers: { Authorization: `OAuth ${YANDEX_TOKEN}` }
    }
  );
  return resp.data.href;
}

async function getUploadUrl() {
  const resp = await axios.get(
    "https://cloud-api.yandex.net/v1/disk/resources/upload",
    {
      params: { path: FILE_PATH, overwrite: true },
      headers: { Authorization: `OAuth ${YANDEX_TOKEN}` }
    }
  );
  return resp.data.href;
}

// Загрузка данных
app.get("/load-modules", async (req, res) => {
  try {
    const downloadUrl = await getDownloadUrl();
    const fileResp = await axios.get(downloadUrl);
    res.json(fileResp.data);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      // файла ещё нет — вернём пустой объект
      return res.json({});
    }
    console.error("Ошибка загрузки с Яндекс.Диска:", err.message);
    res.status(500).json({ error: "load_error" });
  }
});

// Сохранение данных
app.post("/save-modules", async (req, res) => {
  try {
    const jsonData = JSON.stringify(req.body || {}, null, 2);
    const uploadUrl = await getUploadUrl();

    await axios.put(uploadUrl, jsonData, {
      headers: { "Content-Type": "application/json" }
    });

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Ошибка сохранения на Яндекс.Диск:", err.message);
    res.status(500).json({ error: "save_error" });
  }
});

// Проверка
app.get("/", (req, res) => {
  res.send("QC backend is running");
});

app.listen(PORT, () => {
  console.log(`QC backend listening on port ${PORT}`);
});
