// Simplified Goodreads CSV parser - bundled directly into the project

// Parse Goodreads CSV export
export function parseGoodreadsCsv(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const books = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (handles basic cases)
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const book = {};
    
    headers.forEach((header, index) => {
      book[header] = values[index] || '';
    });
    
    // Only include books that are marked as read
    if (book['Exclusive Shelf'] === 'read' && book['My Rating'] && book['My Rating'] !== '0') {
      const readingStatus = book['Exclusive Shelf']?.toLowerCase();
      const isRead = (readingStatus === 'read') || !!book['Date Read'];
      
      books.push({
        id: book['Book Id'],
        title: book['Title'],
        author: book['Author'],
        rating: parseInt(book['My Rating']) || 0,
        dateRead: book['Date Read'],
        shelves: book['Bookshelves'] ? book['Bookshelves'].split(';').map(s => s.trim()) : [],
        isFiction: book['Bookshelves']?.toLowerCase().includes('fiction') || false,
        // Add the missing properties that the read books filter needs
        readingStatus: readingStatus,
        isRead: isRead,
        source: 'goodreads'
      });
    }
  }
  
  return books;
}
