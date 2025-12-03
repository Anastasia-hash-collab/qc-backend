async function writeDataFile(data) {
  const fileId = await findDataFile();

  const media = {
    mimeType: "application/json",
    // важный момент: отдаём строку, а не Buffer/поток
    body: JSON.stringify(data, null, 2)
  };

  if (!fileId) {
    // создаём новый файл
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

