// Robust Goodreads CSV parser - bundled directly into the project

// Parse Goodreads CSV export with better error handling
export function parseGoodreadsCsv(csvText) {
  console.log('parseGoodreadsCsv called with text length:', csvText.length);
  
  if (!csvText || typeof csvText !== 'string') {
    console.error('Invalid CSV input:', typeof csvText, csvText);
    return [];
  }
  
  // Handle different line endings
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  console.log('CSV lines count:', lines.length);
  
  if (lines.length === 0) {
    console.warn('No lines found in CSV');
    return [];
  }
  
  if (lines.length === 1) {
    console.warn('Only header line found in CSV');
    return [];
  }
  
  // Parse headers more robustly
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  console.log('CSV headers:', headers);
  
  // Check for required headers
  const requiredHeaders = ['Title', 'Author', 'Exclusive Shelf', 'My Rating'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    console.error('Missing required headers:', missingHeaders);
    console.error('Available headers:', headers);
    return [];
  }
  
  const books = [];
  let processedLines = 0;
  let skippedLines = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // More robust CSV parsing that handles quoted fields
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add last value
      
      // Ensure we have enough values
      while (values.length < headers.length) {
        values.push('');
      }
      
      const book = {};
      headers.forEach((header, index) => {
        book[header] = values[index] || '';
      });
      
      processedLines++;
      
      // Debug logging for first few lines
      if (processedLines <= 3) {
        console.log(`Processing line ${i}:`, { 
          title: book['Title'], 
          author: book['Author'], 
          shelf: book['Exclusive Shelf'], 
          rating: book['My Rating'],
          dateRead: book['Date Read']
        });
      }
      
      // Only include books that are marked as read
      const exclusiveShelf = (book['Exclusive Shelf'] || '').toLowerCase().trim();
      const myRating = book['My Rating'];
      const dateRead = book['Date Read'];
      
      if (exclusiveShelf === 'read' && myRating && myRating !== '0' && myRating !== '0.0') {
        const readingStatus = exclusiveShelf;
        const isRead = true; // If we're here, it's definitely read
        
        const bookObj = {
          id: book['Book Id'] || `book_${i}`,
          title: book['Title'] || 'Untitled',
          author: book['Author'] || 'Unknown Author',
          rating: parseInt(myRating) || 0,
          dateRead: dateRead || null,
          shelves: book['Bookshelves'] ? book['Bookshelves'].split(/[,;]+/).map(s => s.trim()).filter(s => s && s !== 'read' && s !== 'to-read' && s !== 'currently-reading') : [],
          isFiction: book['Bookshelves']?.toLowerCase().includes('fiction') || false,
          readingStatus: readingStatus,
          isRead: isRead,
          source: 'goodreads'
        };
        
        if (processedLines <= 3) {
          console.log('Adding book:', bookObj);
        }
        books.push(bookObj);
      } else {
        skippedLines++;
        if (processedLines <= 3) {
          console.log(`Skipping book "${book['Title']}" - shelf: "${exclusiveShelf}", rating: "${myRating}"`);
        }
      }
    } catch (error) {
      console.error(`Error processing line ${i}:`, error, line);
      skippedLines++;
    }
  }
  
  console.log('Final parsed books:', books.length);
  console.log('Total lines processed:', processedLines);
  console.log('Total lines skipped:', skippedLines);
  console.log('Sample books:', books.slice(0, 3));
  
  return books;
}
