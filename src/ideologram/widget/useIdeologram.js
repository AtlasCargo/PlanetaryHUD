// Simplified useIdeologram hook - bundled directly into the project
import { useState, useCallback } from 'react';
import { computeIdeologram, SAMPLE_ANCHORS } from '../core/index.js';

export default function useIdeologram() {
  const [books, setBooks] = useState([]);
  const [quizResponses, setQuizResponses] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async (input) => {
    setLoading(true);
    try {
      const computedResult = computeIdeologram({
        books: input.books || books,
        quizResponses: input.quizResponses || quizResponses,
        anchors: SAMPLE_ANCHORS
      });
      
      setResult(computedResult);
      return computedResult;
    } catch (error) {
      console.error('Computation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [books, quizResponses]);

  const addBook = useCallback((book) => {
    setBooks(prev => [...prev, book]);
  }, []);

  const addQuizResponse = useCallback((response) => {
    setQuizResponses(prev => [...prev, response]);
  }, []);

  const reset = useCallback(() => {
    setBooks([]);
    setQuizResponses([]);
    setResult(null);
  }, []);

  return {
    books,
    quizResponses,
    result,
    loading,
    compute,
    addBook,
    addQuizResponse,
    reset
  };
}
