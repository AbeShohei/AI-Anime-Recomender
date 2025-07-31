const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

contextBridge.exposeInMainWorld('api', {
  loadAnimeCSV: () => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(__dirname, 'anime-dataset-2023.csv');
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return reject(err);
        const results = Papa.parse(data, {
          header: true,
          skipEmptyLines: true
        });
        if (results.errors.length) {
          console.warn('CSV parse errors:', results.errors);
        }
        resolve(results);
      });
    });
  }
});
