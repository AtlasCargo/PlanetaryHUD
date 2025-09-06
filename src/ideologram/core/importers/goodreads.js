// Improved Goodreads CSV parser with proper CSV handling

// Parse Goodreads CSV export
export function parseGoodreadsCsv(csvText) {
  console.log('🔍 CSV parsing started, text length:', csvText.length);
  console.log('🔍 First 500 characters:', csvText.substring(0, 500));
  
  const lines = csvText.split('\n');
  console.log('🔍 Total lines:', lines.length);
  
  if (lines.length < 2) {
    console.error('❌ CSV too short, need at least header + 1 data row');
    return [];
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('🔍 CSV headers:', headers);
  
  const books = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Better CSV parsing that handles quoted fields with commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const book = {};
    
    headers.forEach((header, index) => {
      book[header] = values[index] || '';
    });
    
    console.log(`🔍 Processing book ${i}:`, {
      title: book['Title'] || book['title'],
      author: book['Author'] || book['author'],
      shelf: book['Exclusive Shelf'] || book['exclusive shelf'] || book['Shelf'] || book['shelf'],
      rating: book['My Rating'] || book['my rating'] || book['Rating'] || book['rating'],
      dateRead: book['Date Read'] || book['date read'] || book['Date'] || book['date'],
      isExplicitlyRead: !!(book['Exclusive Shelf'] === 'read' || book['exclusive shelf'] === 'read' || 
                           book['Shelf'] === 'read' || book['shelf'] === 'read'),
      hasDateRead: !!(book['Date Read'] || book['date read'] || book['Date'] || book['date'])
    });
    
    // UPDATED LOGIC: Include ALL books, but mark which ones are read
    const isExplicitlyRead = (book['Exclusive Shelf'] === 'read' || book['exclusive shelf'] === 'read' || 
                              book['Shelf'] === 'read' || book['shelf'] === 'read');
    
    // Check if it has a Date Read (which indicates it was read)
    const hasDateRead = !!(book['Date Read'] || book['date read'] || book['Date'] || book['date']);
    
    // Determine if book is read
    const isRead = isExplicitlyRead || hasDateRead;
    
    // Include ALL books in the library
    books.push({
      id: book['Book Id'] || book['book id'] || book['Id'] || book['id'] || `book_${i}`,
      title: book['Title'] || book['title'] || 'Unknown Title',
      author: book['Author'] || book['author'] || 'Unknown Author',
      rating: parseInt((book['My Rating'] || book['my rating'] || book['Rating'] || book['rating'] || '0').replace(/=/g, '').replace(/"/g, '')) || 0,
      dateRead: book['Date Read'] || book['date read'] || book['Date'] || book['date'] || '',
      shelves: book['Bookshelves'] ? book['Bookshelves'].split(';').map(s => s.trim()) : [],
      isFiction: book['Bookshelves']?.toLowerCase().includes('fiction') || false,
      isRead: isRead,
      shelf: book['Exclusive Shelf'] || book['exclusive shelf'] || book['Shelf'] || book['shelf'] || 'unknown'
    });
    
    if (isRead) {
      console.log(`✅ Book ${i} added to library (READ: ${isExplicitlyRead ? 'explicitly marked' : 'has date'})`);
    } else {
      console.log(`📚 Book ${i} added to library (TO-READ: ${book['Exclusive Shelf'] || 'unknown shelf'})`);
    }
  }
  
  console.log('🔍 Final result:', books.length, 'books parsed');
  return books;
}
