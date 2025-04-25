/**
 * Convert JSON data to CSV string
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} headers - Array of column headers [{ label: 'Label', key: 'propertyName' }]
 * @returns {string} CSV string
 */
export const convertToCSV = (data, headers) => {
  if (!data || !data.length || !headers || !headers.length) {
    return '';
  }

  // Create header row
  const headerRow = headers.map(header => `"${header.label}"`).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return headers
      .map(header => {
        const value = item[header.key];
        // Handle different types of values
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'boolean') {
          return value ? '"Yes"' : '"No"';
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // Combine header and data rows
  return [headerRow, ...rows].join('\n');
};

/**
 * Download data as a CSV file
 * @param {string} csvString - CSV string to download
 * @param {string} fileName - Name of the file to download
 */
export const downloadCSV = (csvString, fileName) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Helper function to combine conversion and download
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} headers - Array of column headers [{ label: 'Label', key: 'propertyName' }]
 * @param {string} fileName - Name of the file to download
 */
export const exportToCSV = (data, headers, fileName) => {
  const csvString = convertToCSV(data, headers);
  if (csvString) {
    downloadCSV(csvString, fileName);
  }
}; 