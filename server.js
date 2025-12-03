import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

// порт задаст хостинг (Render и т.п.)
const PORT = process.env.PORT || 3000;

// ⚠️ ВАЖНО: тут токен не пишем руками, он должен быть в переменной окружения YANDEX_TOKEN
const YANDEX_TOKEN = process.env.YANDEX_TOKEN;

// путь файла на Яндекс.Диске, где будут храниться данные приложения
// он окажется в "Приложения" → "qc_app" → "modules_data.json"
const FILE_PATH = "/apps/qc_app/modules_data.json";

if (!YANDEX_TOKEN) {
  console.warn("ВНИМАНИЕ: переменная окружения YANDEX_TOKEN не задана!");
}

app.use(cors()); // можно сузить до origin твоего фронта
app.use(express.json({ limit: "1mb" }));

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ РАБОТЫ С Я.ДИСКОМ =====

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

// ===== API ДЛЯ ТВОЕГО ПРИЛОЖЕНИЯ =====

// Загрузка всех данных по модулям
app.get("/load-modules", async (req, res) => {
  try {
    const downloadUrl = await getDownloadUrl();
    const fileResp = await axios.get(downloadUrl);

    // ожидаем, что внутри лежит JSON-объект { M1: {...}, M2: {...}, ... }
    res.json(fileResp.data);
  } catch (err) {
    // если файл ещё не создан — вернём пустой объект
    if (err.response && err.response.status === 404) {
      return res.json({});
    }
    console.error("Ошибка загрузки с Яндекс.Диска:", err.message);
    res.status(500).json({ error: "load_error" });
  }
});

// Сохранение данных по модулям
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

// Простой health-check, чтобы хостинг видел, что сервис живой
app.get("/", (req, res) => {
  res.send("QC backend is running");
});

app.listen(PORT, () => {
  console.log(`QC backend listening on port ${PORT}`);
});
