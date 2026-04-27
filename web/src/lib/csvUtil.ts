import { storage } from "./storage";

// Utility to convert an array of objects to CSV string
export function exportToCSV(data: any[], headers: string[], selectedOnly: boolean = false): string {
  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      // Escape double quotes by doubling them
      const escaped = typeof value === "string" ? value.replace(/"/g, "\"\"") : value;
      return `"${escaped ?? ""}"`;
    }).join(",");
  });
  const headerLine = headers.map(h => `"${h}"`).join(",");
  return [headerLine, ...rows].join("\n");
}

// Utility to parse CSV file content into objects using a mapper function
export async function importFromCSV(file: File, mapper: (row: string[]) => any): Promise<any[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map(h => h.replace(/^"|"$/g, ""));
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    // Simple CSV split – assumes no commas inside quoted fields for our simple use case
    const fields = raw.split(",").map(f => f.replace(/^"|"$/g, ""));
    const obj = mapper(fields);
    data.push(obj);
  }
  return data;
}
