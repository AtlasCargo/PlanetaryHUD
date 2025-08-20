// Simplified Goodreads CSV parser - bundled directly into the project

// Parse Goodreads CSV export
export function parseGoodreadsCsv(csvText) {
  console.log('parseGoodreadsCsv called with text length:', csvText.length);
  
  const lines = csvText.split('\n');
  console.log('CSV lines count:', lines.length);
  
  if (lines.length === 0) {
    console.warn('No lines found in CSV');
    return [];
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('CSV headers:', headers);
  
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
    
    console.log(`Processing line ${i}:`, { 
      title: book['Title'], 
      author: book['Author'], 
      shelf: book['Exclusive Shelf'], 
      rating: book['My Rating'] 
    });
    
    // Only include books that are marked as read
    if (book['Exclusive Shelf'] === 'read' && book['My Rating'] && book['My Rating'] !== '0') {
      const readingStatus = book['Exclusive Shelf']?.toLowerCase();
      const isRead = (readingStatus === 'read') || !!book['Date Read'];
      
      const bookObj = {
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
      };
      
      console.log('Adding book:', bookObj);
      books.push(bookObj);
    } else {
      console.log(`Skipping book "${book['Title']}" - shelf: "${book['Exclusive Shelf']}", rating: "${book['My Rating']}"`);
    }
  }
  
  console.log('Final parsed books:', books);
  console.log('Total books found:', books.length);
  
  return books;
}
