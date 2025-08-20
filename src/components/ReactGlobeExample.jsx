/**
 * ReactGlobeExample.jsx
 *
 * Renders an interactive 3D globe with a futuristic HUD.
 */
import React, { useEffect, useState, useRef, useMemo, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { motion } from 'framer-motion';
import ParticlesBackground from './Effects/ParticlesBackground';
import ScannerEffect from './Effects/ScannerEffect';
import GlowOverlay from './Effects/GlowOverlay';
import Portal from './Portal';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import GraphComponent from './GraphComponent';
import Globe from './Globe';
import { scaleSequentialSqrt } from 'd3-scale';
import { interpolateYlOrRd, interpolateRdYlGn, interpolateGreys } from 'd3-scale-chromatic';
import { csvParse } from 'd3-dsv';
import { loadDataset, getAvailableDatasets } from '../utils/loadDataset';
import ChatWindow from './ChatWindow';
import Settings from '../pages/Settings';
import { getCountries, getIndicators, getIndicatorData } from '../services/worldBankApi';
import { sendMessage, setApiKey } from '../services/openaiClient';
import { AuthContext } from '../contexts/AuthContext';
import FinancialDashboard from './FinancialDashboard'; // Import FinancialDashboard
import { IdeologramWidget } from '../ideologram';
import { SAMPLE_ANCHORS, parseGoodreadsCsv, analyzeTextLexical, computeIdeologram, enrichBook, enrichBookWikidata } from '../ideologram';

export default function ReactGlobeExample() {
  // -------------------------------
  // REFS & STATE
  // -------------------------------
  const navigate = useNavigate();
  const globeRef = useRef(null);
  const isUserInteracting = useRef(false);
  const autoRotateAnimationId = useRef(null);
  const initialLoadRef = useRef(true);

  const [countries, setCountries] = useState({ features: [] });
  const [hoverD, setHoverD] = useState(null);

  // Normalize country names for consistent matching
  const normalizeCountryName = (name) =>
    name.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();

  const initialPanelHeight = typeof window !== 'undefined'
    ? (60 / window.innerHeight) * 100
    : 10;

  // Basic layout & resizing
  const [dimensions, setDimensions] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
    return {
      left: isMobile ? (isLandscape ? 15 : 0) : 20,
      right: isMobile ? (isLandscape ? 15 : 0) : 20,
      top: isMobile ? 10 : initialPanelHeight,
      bottom: isMobile ? 8 : initialPanelHeight
    };
  });
  const [isResizing, setIsResizing] = useState({
    left: false,
    right: false,
    top: false,
    bottom: false
  });
  const [sidebarWidths, setSidebarWidths] = useState({
    left: window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20,
    right: window.innerWidth <= 768 ? (window.innerWidth > window.innerHeight ? 15 : 80) : 20
  });
  // Mode: 'home' = globe & mini-chat; 'chat' = full chat view; 'settings' = settings view; 'financial' = financial mode
  const [mode, setMode] = useState('home'); // modes: home, chat, settings, financial
  const [showFinancial, setShowFinancial] = useState(false); // Add showFinancial state
  // Chat history & current conversation
  const [chatHistory, setChatHistory] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [model] = useState('gpt-5');
  // Sample inputs for Ideologram integration
  const ideoQuiz = useMemo(() => ([
    { id: 'q1', answer: 4 },
    { id: 'q2', answer: 2 },
    { id: 'q3', answer: 3 },
  ]), []);
  
  // Comprehensive Worldview Assessment System
  const worldviewQuiz = useMemo(() => [
    // Economic Literacy & Philosophy
    {
      id: 'econ_1',
      category: 'economic_literacy',
      question: 'How would you describe your understanding of free market economics?',
      type: 'scale',
      options: ['No understanding', 'Basic', 'Intermediate', 'Advanced', 'Expert'],
      weight: 1.2
    },
    {
      id: 'econ_2', 
      category: 'economic_literacy',
      question: 'Do you believe in the efficiency of central planning vs. market mechanisms?',
      type: 'scale',
      options: ['Strongly prefer central planning', 'Somewhat prefer central planning', 'Neutral', 'Somewhat prefer markets', 'Strongly prefer markets'],
      weight: 1.0
    },
    
    // Philosophical Sophistication
    {
      id: 'phil_1',
      category: 'philosophical_sophistication', 
      question: 'Have you studied formal philosophy or ethics?',
      type: 'scale',
      options: ['Never studied', 'Basic courses', 'Undergraduate level', 'Graduate level', 'Academic research'],
      weight: 1.5
    },
    {
      id: 'phil_2',
      category: 'philosophical_sophistication',
      question: 'How would you describe your epistemological position?',
      type: 'text',
      placeholder: 'e.g., "Empiricist", "Rationalist", "Pragmatist", "Skeptic"...',
      weight: 1.3
    },
    
    // Scientific Literacy
    {
      id: 'sci_1',
      category: 'scientific_literacy',
      question: 'How would you rate your understanding of basic physics?',
      type: 'scale',
      options: ['No understanding', 'High school level', 'Undergraduate level', 'Graduate level', 'Research level'],
      weight: 1.1
    },
    {
      id: 'sci_2',
      category: 'scientific_literacy',
      question: 'What is your view on climate change science?',
      type: 'scale',
      options: ['Deny the science', 'Skeptical', 'Accept with reservations', 'Accept the consensus', 'Expert understanding'],
      weight: 1.4
    },
    
    // Psychological Insight
    {
      id: 'psych_1',
      category: 'psychological_insight',
      question: 'How well do you understand human motivation and behavior?',
      type: 'scale',
      options: ['No understanding', 'Basic intuition', 'Some study', 'Formal training', 'Expert level'],
      weight: 1.0
    },
    
    // Historical Perspective
    {
      id: 'hist_1',
      category: 'historical_perspective',
      question: 'How would you rate your historical knowledge?',
      type: 'scale',
      options: ['Minimal', 'Basic', 'Good', 'Excellent', 'Academic level'],
      weight: 1.0
    }
  ], []);
  
  const [worldviewResponses, setWorldviewResponses] = useState({});
  const [worldviewQuizOpen, setWorldviewQuizOpen] = useState(false);
  const [userCredentials, setUserCredentials] = useState({});
  const [selfAssessment, setSelfAssessment] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [ideoChatHistory, setIdeoChatHistory] = useState([]);
  const [ideoBooks, setIdeoBooks] = useState([]);
  const [ideoFreeText, setIdeoFreeText] = useState('');
  const [ideoTextResult, setIdeoTextResult] = useState(null);
  const [epubName, setEpubName] = useState('');
  const [epubMeta, setEpubMeta] = useState({ title: '', author: '', isbn: '' });
  const [ideoLoading, setIdeoLoading] = useState(false);
  const [ideoError, setIdeoError] = useState('');
  const [ideoSelectedFile, setIdeoSelectedFile] = useState(null);
  const [ideoScores, setIdeoScores] = useState([]);
  const [fileTree, setFileTree] = useState(null);
  const [ideoEnrichedMap, setIdeoEnrichedMap] = useState({}); // { key: { meta, axes } }
  const [ideoEnriching, setIdeoEnriching] = useState({}); // { key: boolean }
  const [filePreviews, setFilePreviews] = useState({}); // { [name: string]: any }
  const [fileOpen, setFileOpen] = useState({}); // { [name: string]: boolean }
  const [enrichmentDetail, setEnrichmentDetail] = useState(null); // { key: string, openLibrary: {...}, wikidata: {...} }

  // Save assessment results with metadata
  const saveAssessment = useCallback(async (scores, quizResponses, books, chatHistory = []) => {
    const assessment = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      scores,
      quizResponses,
      booksCount: books?.length || 0,
      enrichedBooksCount: books?.filter(b => b.enriched)?.length || 0,
      chatHistoryCount: chatHistory?.length || 0,
      metadata: {
        vectorResolution: Object.keys(scores).length, // 5 dimensions
        totalDataPoints: Object.values(scores).reduce((sum, dim) => sum + dim.sources.length, 0),
        averageConfidence: Object.values(scores).reduce((sum, dim) => sum + dim.overallConfidence, 0) / Object.keys(scores).length,
        assessmentQuality: chatHistory?.length > 0 ? 'comprehensive' : 'basic', // Enhanced with chat history
        reliabilityScore: Math.min(1, Object.values(scores).reduce((sum, dim) => sum + dim.overallConfidence, 0) / Object.keys(scores).length),
        dataSources: [
          ...(books?.length > 0 ? ['books'] : []),
          ...(Object.keys(quizResponses).length > 0 ? ['quiz'] : []),
          ...(chatHistory?.length > 0 ? ['chat_history'] : [])
        ]
      }
    };
    
    // Save to backend if authenticated, otherwise localStorage
    try {
      await API.post('/api/ideologram/assessments', assessment);
    } catch (err) {
      // Fallback to localStorage
      const existing = JSON.parse(localStorage.getItem('ideologram:assessments') || '[]');
      existing.push(assessment);
      localStorage.setItem('ideologram:assessments', JSON.stringify(existing));
    }
    
    // Update local state
    setAssessmentHistory(prev => [assessment, ...prev]);
    setCurrentAssessment(assessment);
    
    return assessment;
  }, []);
  
  // Compute weighted average of assessment history (recent assessments weighted higher)
  const computeWeightedAverage = useCallback((history) => {
    if (!history || history.length === 0) return null;
    
    const dimensions = ['economic_literacy', 'philosophical_sophistication', 'scientific_literacy', 'psychological_insight', 'historical_perspective'];
    const weightedScores = {};
    
    dimensions.forEach(dimension => {
      let weightedSum = 0;
      let totalWeight = 0;
      
      history.forEach((assessment, index) => {
        // Exponential decay: most recent gets weight 1, older ones get weight 0.8^age
        const age = index;
        const weight = Math.pow(0.8, age);
        
        if (assessment.scores[dimension]) {
          weightedSum += assessment.scores[dimension].score * weight;
          totalWeight += weight;
        }
      });
      
      if (totalWeight > 0) {
        weightedScores[dimension] = {
          score: weightedSum / totalWeight,
          confidence: history[0]?.scores[dimension]?.overallConfidence || 0,
          lastAssessment: history[0]?.timestamp,
          assessmentCount: history.length
        };
      }
    });
    
    return weightedScores;
  }, []);
  
  // Comprehensive Worldview Scoring Algorithm
  const computeWorldviewScore = useCallback((books, quizResponses, credentials, selfAssessment, chatHistory = []) => {
    const dimensions = {
      economic_literacy: { score: 0, confidence: 0, sources: [] },
      philosophical_sophistication: { score: 0, confidence: 0, sources: [] },
      scientific_literacy: { score: 0, confidence: 0, sources: [] },
      psychological_insight: { score: 0, confidence: 0, sources: [] },
      historical_perspective: { score: 0, confidence: 0, sources: [] }
    };
    
    // Process book data with topic mapping
    if (books && books.length > 0) {
      books.forEach(book => {
        const enriched = book.enriched;
        if (enriched && enriched.topics) {
          enriched.topics.forEach(topic => {
            const lowerTopic = topic.toLowerCase();
            
            // Economic topics
            if (lowerTopic.includes('economics') || lowerTopic.includes('capitalism') || lowerTopic.includes('socialism')) {
              dimensions.economic_literacy.score += 0.3;
              dimensions.economic_literacy.confidence += 0.2;
              dimensions.economic_literacy.sources.push(`Book: ${book.title}`);
            }
            
            // Philosophical topics
            if (lowerTopic.includes('philosophy') || lowerTopic.includes('ethics') || lowerTopic.includes('epistemology')) {
              dimensions.philosophical_sophistication.score += 0.4;
              dimensions.philosophical_sophistication.confidence += 0.3;
              dimensions.philosophical_sophistication.sources.push(`Book: ${book.title}`);
            }
            
            // Scientific topics
            if (lowerTopic.includes('physics') || lowerTopic.includes('science') || lowerTopic.includes('biology')) {
              dimensions.scientific_literacy.score += 0.3;
              dimensions.scientific_literacy.confidence += 0.2;
              dimensions.scientific_literacy.sources.push(`Book: ${book.title}`);
            }
            
            // Psychological topics
            if (lowerTopic.includes('psychology') || lowerTopic.includes('behavior') || lowerTopic.includes('motivation')) {
              dimensions.psychological_insight.score += 0.3;
              dimensions.psychological_insight.confidence += 0.2;
              dimensions.psychological_insight.sources.push(`Book: ${book.title}`);
            }
            
            // Historical topics
            if (lowerTopic.includes('history') || lowerTopic.includes('historical') || lowerTopic.includes('civilization')) {
              dimensions.historical_perspective.score += 0.3;
              dimensions.historical_perspective.confidence += 0.2;
              dimensions.historical_perspective.sources.push(`Book: ${book.title}`);
            }
          });
        }
      });
    }
    
    // Process quiz responses
    if (quizResponses) {
      Object.entries(quizResponses).forEach(([questionId, response]) => {
        const question = worldviewQuiz.find(q => q.id === questionId);
        if (question) {
          const dimension = question.category;
          let score = 0;
          let confidence = 0;
          
          if (question.type === 'scale' && typeof response === 'number') {
            // Scale questions: 0-4 mapped to -1 to 1
            score = (response - 2) / 2; // -1 to 1
            confidence = question.weight;
          } else if (question.type === 'text' && response && response.trim()) {
            // Text questions: presence indicates sophistication
            score = 0.5; // Neutral positive
            confidence = question.weight * 0.8;
          }
          
          dimensions[dimension].score += score;
          dimensions[dimension].confidence += confidence;
          dimensions[dimension].sources.push(`Quiz: ${question.question}`);
        }
      });
    }
    
    // Process credentials (degrees, certifications)
    if (credentials) {
      Object.entries(credentials).forEach(([field, level]) => {
        if (field === 'economics' && level) {
          dimensions.economic_literacy.score += 0.5;
          dimensions.economic_literacy.confidence += 0.4;
          dimensions.economic_literacy.sources.push(`Credential: ${field} - ${level}`);
        }
        if (field === 'philosophy' && level) {
          dimensions.philosophical_sophistication.score += 0.6;
          dimensions.philosophical_sophistication.confidence += 0.5;
          dimensions.philosophical_sophistication.sources.push(`Credential: ${field} - ${level}`);
        }
        if (field === 'science' && level) {
          dimensions.scientific_literacy.score += 0.5;
          dimensions.scientific_literacy.confidence += 0.4;
          dimensions.scientific_literacy.sources.push(`Credential: ${field} - ${level}`);
        }
        if (field === 'psychology' && level) {
          dimensions.psychological_insight.score += 0.5;
          dimensions.psychological_insight.confidence += 0.4;
          dimensions.psychological_insight.sources.push(`Credential: ${field} - ${level}`);
        }
        if (field === 'history' && level) {
          dimensions.historical_perspective.score += 0.5;
          dimensions.historical_perspective.confidence += 0.4;
          dimensions.historical_perspective.sources.push(`Credential: ${field} - ${level}`);
        }
      });
    }

    // Process chat history for worldview insights
    if (chatHistory && chatHistory.length > 0) {
      const userMessages = chatHistory.filter(msg => msg.role === 'user');
      const assistantMessages = chatHistory.filter(msg => msg.role === 'assistant');
      
      // Analyze user messages for worldview indicators
      userMessages.forEach(msg => {
        const content = msg.content.toLowerCase();
        
        // Economic literacy indicators
        const economicTerms = ['gdp', 'inflation', 'monetary policy', 'fiscal policy', 'supply and demand', 'market', 'economics', 'trade', 'tariff', 'capitalism', 'socialism', 'market economy'];
        economicTerms.forEach(term => {
          if (content.includes(term)) {
            dimensions.economic_literacy.score += 0.1;
            dimensions.economic_literacy.confidence += 0.05;
            dimensions.economic_literacy.sources.push(`Chat: Economic discussion`);
          }
        });
        
        // Philosophical sophistication indicators
        const philosophicalTerms = ['philosophy', 'ethics', 'morality', 'existence', 'consciousness', 'free will', 'determinism', 'epistemology', 'ontology', 'metaphysics', 'logic', 'reasoning'];
        philosophicalTerms.forEach(term => {
          if (content.includes(term)) {
            dimensions.philosophical_sophistication.score += 0.1;
            dimensions.philosophical_sophistication.confidence += 0.05;
            dimensions.philosophical_sophistication.sources.push(`Chat: Philosophical discussion`);
          }
        });
        
        // Scientific literacy indicators
        const scientificTerms = ['scientific method', 'hypothesis', 'experiment', 'research', 'peer review', 'evidence', 'theory', 'data', 'analysis', 'physics', 'biology', 'chemistry', 'mathematics'];
        scientificTerms.forEach(term => {
          if (content.includes(term)) {
            dimensions.scientific_literacy.score += 0.1;
            dimensions.scientific_literacy.confidence += 0.05;
            dimensions.scientific_literacy.sources.push(`Chat: Scientific discussion`);
          }
        });
        
        // Psychological insight indicators
        const psychologicalTerms = ['psychology', 'behavior', 'cognitive', 'emotion', 'mental health', 'therapy', 'mind', 'personality', 'development', 'motivation', 'learning', 'memory'];
        psychologicalTerms.forEach(term => {
          if (content.includes(term)) {
            dimensions.psychological_insight.score += 0.1;
            dimensions.psychological_insight.confidence += 0.05;
            dimensions.psychological_insight.sources.push(`Chat: Psychological discussion`);
          }
        });
        
        // Historical perspective indicators
        const historicalTerms = ['history', 'historical', 'century', 'era', 'period', 'ancient', 'medieval', 'modern', 'timeline', 'chronology', 'civilization', 'culture', 'tradition'];
        historicalTerms.forEach(term => {
          if (content.includes(term)) {
            dimensions.historical_perspective.score += 0.1;
            dimensions.historical_perspective.confidence += 0.05;
            dimensions.historical_perspective.sources.push(`Chat: Historical discussion`);
          }
        });
      });
      
      // Limit chat-based scores to prevent over-inflation
      Object.keys(dimensions).forEach(dimension => {
        const chatSources = dimensions[dimension].sources.filter(source => source.startsWith('Chat:'));
        if (chatSources.length > 0) {
          dimensions[dimension].score = Math.min(dimensions[dimension].score, 0.8); // Cap at 0.8
          dimensions[dimension].confidence = Math.min(dimensions[dimension].confidence, 0.6); // Cap confidence
        }
      });
    }
    
    // Normalize scores to [-1, 1] range and calculate final confidence
    Object.keys(dimensions).forEach(dimension => {
      dimensions[dimension].score = Math.max(-1, Math.min(1, dimensions[dimension].score));
      dimensions[dimension].confidence = Math.min(1, dimensions[dimension].confidence);
      
      // Calculate overall confidence based on data density
      const dataPoints = dimensions[dimension].sources.length;
      dimensions[dimension].overallConfidence = Math.min(1, dimensions[dimension].confidence * (1 + dataPoints * 0.1));
    });
    
    return dimensions;
  }, [worldviewQuiz]);
  
  // Parse ChatGPT history from various formats
  const parseChatGPTHistory = useCallback((text) => {
    try {
      // Try to parse as JSON first (ChatGPT export format)
      const jsonData = JSON.parse(text);
      
      // Handle different ChatGPT export formats
      if (jsonData.conversations) {
        // ChatGPT web export format
        return jsonData.conversations.flatMap(conv => 
          conv.mapping ? Object.values(conv.mapping).filter(msg => msg.message) : []
        ).map(msg => ({
          role: msg.message.author.role === 'user' ? 'user' : 'assistant',
          content: msg.message.content.parts?.[0]?.text || msg.message.content || '',
          timestamp: msg.message.create_time || Date.now()
        }));
      } else if (jsonData.messages) {
        // Direct messages format
        return jsonData.messages.map(msg => ({
          role: msg.role || 'user',
          content: msg.content || msg.text || '',
          timestamp: msg.timestamp || msg.created_at || Date.now()
        }));
      } else if (Array.isArray(jsonData)) {
        // Array of messages
        return jsonData.map(msg => ({
          role: msg.role || 'user',
          content: msg.content || msg.text || '',
          timestamp: msg.timestamp || msg.created_at || Date.now()
        }));
      }
      
      throw new Error('Unsupported ChatGPT export format');
    } catch (jsonError) {
      // Try to parse as plain text (conversation format)
      const lines = text.split('\n').filter(line => line.trim());
      const messages = [];
      let currentRole = 'user';
      let currentContent = '';
      
      for (const line of lines) {
        if (line.toLowerCase().includes('user:') || line.toLowerCase().includes('you:')) {
          if (currentContent.trim()) {
            messages.push({ role: currentRole, content: currentContent.trim(), timestamp: Date.now() });
          }
          currentRole = 'user';
          currentContent = line.replace(/^(user|you):\s*/i, '').trim();
        } else if (line.toLowerCase().includes('assistant:') || line.toLowerCase().includes('chatgpt:') || line.toLowerCase().includes('ai:')) {
          if (currentContent.trim()) {
            messages.push({ role: currentRole, content: currentContent.trim(), timestamp: Date.now() });
          }
          currentRole = 'assistant';
          currentContent = line.replace(/^(assistant|chatgpt|ai):\s*/i, '').trim();
        } else {
          currentContent += (currentContent ? ' ' : '') + line.trim();
        }
      }
      
      // Add the last message
      if (currentContent.trim()) {
        messages.push({ role: currentRole, content: currentContent.trim(), timestamp: Date.now() });
      }
      
      return messages;
    }
  }, []);
  
  // Enhanced enrichment function that tries multiple strategies and combines data
  const enhancedEnrichBook = useCallback(async (book) => {
    const title = (book.title || '').trim();
    const author = (book.author || '').trim();
    if (!title) return null;

    console.log('Enhanced enrichment for:', title, 'by', author);

    // Clean title by removing series info, numbers, etc.
    const cleanTitle = title
      .replace(/\([^)]*\)/g, '') // Remove parentheses content
      .replace(/[#\d]+/g, '') // Remove numbers and hash
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Multiple search strategies for both Open Library and Wikidata
    const searchStrategies = [
      { title: cleanTitle, author, desc: 'clean title + author' },
      { title: cleanTitle, author: '', desc: 'clean title only' },
      { title: title, author, desc: 'original title + author' },
      { title: title, author: '', desc: 'original title only' },
      { title: cleanTitle.split(' ').slice(0, 3).join(' '), author, desc: 'first 3 words + author' },
      { title: cleanTitle.split(' ').slice(0, 2).join(' '), author, desc: 'first 2 words + author' }
    ];

    let openLibraryData = null;
    let wikidataData = null;

    // Try Open Library enrichment with multiple strategies
    for (const strategy of searchStrategies) {
      if (!strategy.title.trim()) continue;
      
      try {
        console.log('Trying Open Library with:', strategy.desc, 'Title:', strategy.title);
        const result = await enrichBook({ 
          title: strategy.title, 
          author: strategy.author || undefined,
          isbn: book.isbn 
        });
        
        if (result && result.metadata && result.metadata.subjects && result.metadata.subjects.length > 0) {
          console.log('Open Library success with:', strategy.desc, 'Subjects:', result.metadata.subjects.length);
          openLibraryData = result;
          break;
        }
      } catch (err) {
        console.log('Open Library failed with:', strategy.desc, err.message);
      }
      
      await new Promise(r => setTimeout(r, 200)); // Rate limiting
    }

    // Try Wikidata enrichment with multiple strategies
    for (const strategy of searchStrategies) {
      if (!strategy.title.trim()) continue;
      
      try {
        console.log('Trying Wikidata with:', strategy.desc, 'Title:', strategy.title);
        const result = await enrichBookWikidata({ 
          title: strategy.title, 
          author: strategy.author || undefined,
          isbn: book.isbn 
        });
        
        if (result && result.metadata && result.metadata.mainSubjects && result.metadata.mainSubjects.length > 0) {
          console.log('Wikidata success with:', strategy.desc, 'Subjects:', result.metadata.mainSubjects.length);
          wikidataData = result;
          break;
        }
      } catch (err) {
        console.log('Wikidata failed with:', strategy.desc, err.message);
      }
      
      await new Promise(r => setTimeout(r, 200)); // Rate limiting
    }

    // Combine data from both sources
    const combinedMetadata = {
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      openLibrary: openLibraryData?.metadata || null,
      wikidata: wikidataData?.metadata || null,
      sources: {
        openLibrary: openLibraryData?.metadata?.sources?.openLibrary || null,
        wikidata: wikidataData?.metadata?.sources?.wikidata || null
      }
    };

    // Combine and deduplicate topics/subjects
    const allTopics = new Set();
    if (openLibraryData?.metadata?.subjects) {
      openLibraryData.metadata.subjects.forEach(s => allTopics.add(s.toLowerCase()));
    }
    if (wikidataData?.metadata?.mainSubjects) {
      wikidataData.metadata.mainSubjects.forEach(s => allTopics.add(s.toLowerCase()));
    }
    if (wikidataData?.metadata?.genres) {
      wikidataData.metadata.genres.forEach(s => allTopics.add(s.toLowerCase()));
    }

    // Combine axes from both sources
    const combinedAxes = { ...openLibraryData?.inferredAxes, ...wikidataData?.inferredAxes };
    
    // Normalize axes to [-1, 1] range
    for (const [key, value] of Object.entries(combinedAxes)) {
      combinedAxes[key] = Math.max(-1, Math.min(1, value));
    }

    const result = {
      metadata: combinedMetadata,
      inferredAxes: combinedAxes,
      topics: Array.from(allTopics),
      enrichmentQuality: {
        openLibrary: !!openLibraryData,
        wikidata: !!wikidataData,
        totalTopics: allTopics.size
      }
    };

    console.log('Enhanced enrichment result:', {
      title: book.title,
      openLibrarySuccess: !!openLibraryData,
      wikidataSuccess: !!wikidataData,
      totalTopics: allTopics.size,
      axes: Object.keys(combinedAxes)
    });

    return result;
  }, []);

  const handleFileClick = useCallback(async (name) => {
    // Toggle open state; if not loaded, try to load first
    const open = !!fileOpen[name];
    if (open) {
      setFileOpen(prev => ({ ...prev, [name]: false }));
      return;
    }
    // If already loaded, just open
    if (filePreviews[name]) {
      setFileOpen(prev => ({ ...prev, [name]: true }));
      return;
    }
    // Load content (server if logged-in; else localStorage)
    try {
      const token = localStorage.getItem('token');
      if (token && token !== 'DUMMY_TOKEN') {
        if (name === 'library.json') {
          const res = await API.get('/api/ideologram/library');
          setFilePreviews(prev => ({ ...prev, [name]: Array.isArray(res.data?.books) ? res.data.books : [] }));
        } else if (name === 'enriched.json') {
          const res = await API.get('/api/ideologram/enriched');
          setFilePreviews(prev => ({ ...prev, [name]: Array.isArray(res.data?.items) ? res.data.items : [] }));
        } else if (name === 'scores.json') {
          const res = await API.get('/api/ideologram/scores');
          setFilePreviews(prev => ({ ...prev, [name]: Array.isArray(res.data?.entries) ? res.data.entries : [] }));
        }
      } else {
        if (name === 'library.json') {
          const raw = localStorage.getItem('ideologram:library');
          const json = raw ? JSON.parse(raw) : {};
          setFilePreviews(prev => ({ ...prev, [name]: Array.isArray(json?.books) ? json.books : [] }));
        } else if (name === 'enriched.json') {
          const raw = localStorage.getItem('ideologram:enriched');
          const json = raw ? JSON.parse(raw) : {};
          setFilePreviews(prev => ({ ...prev, [name]: Array.isArray(json?.items) ? json.items : [] }));
        } else if (name === 'scores.json') {
          const raw = localStorage.getItem('ideologram:scores:v1');
          const json = raw ? JSON.parse(raw) : { entries: [] };
          setFilePreviews(prev => ({ ...prev, [name]: Array.isArray(json?.entries) ? json.entries : [] }));
        }
      }
    } catch {}
    setFileOpen(prev => ({ ...prev, [name]: true }));
  }, [fileOpen, filePreviews]);
  const renderFileTreeList = useCallback(() => {
    if (!fileTree) return (<div className="text-gray-500 text-xs">No files</div>);
    function renderNode(node) {
      if (!node) return null;
      if (node.type === 'dir') {
        const children = Array.isArray(node.children) ? node.children : [];
        return (
          <div>
            <div className="text-xs">📁 {node.name}{node.owner ? ` (${node.owner})` : ''}</div>
            <ul className="list-none m-0 p-0 pl-4">
              {children.length === 0 && (
                <li className="text-gray-500 text-[11px]">(empty)</li>
              )}
              {children.map((c, idx) => (
                <li key={node.name + '::' + (c.name || idx)} className="py-0.5">
                  {renderNode(c)}
                </li>
              ))}
            </ul>
          </div>
        );
      }
      // file
      const updated = node.updatedAt ? new Date(node.updatedAt).toLocaleString() : '—';
      const size = typeof node.size === 'number' ? `${node.size}B` : '';
      const countStr = node.meta && typeof node.meta.count === 'number' ? `${node.meta.count} ${node.meta.label || ''}` : '';
      return (
        <div className="text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <button className="underline text-left" onClick={() => handleFileClick(node.name)}>📄 {node.name} {countStr ? `(${countStr})` : ''}</button>
            <span className="text-gray-400 text-[10px]">{updated}{size ? ` · ${size}` : ''}</span>
          </div>
          {fileOpen[node.name] && (
            <div className="mt-1 pl-4">
              {node.name === 'library.json' && Array.isArray(filePreviews['library.json']) && (
                <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                  {filePreviews['library.json'].slice(0, 100).map((b, i) => (
                    <li key={i} className="py-0.5 border-b border-gray-800">
                      <span className="font-semibold">{b.title || 'Untitled'}</span> {b.author ? <span className="text-gray-400">by {b.author}</span> : null}
                      {b.rating != null && <span className="ml-2">⭐ {b.rating}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {node.name === 'enriched.json' && Array.isArray(filePreviews['enriched.json']) && (
                <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                  {filePreviews['enriched.json'].slice(0, 100).map((it, i) => (
                    <li key={i} className="py-0.5 border-b border-gray-800">
                      <span className="font-semibold">{it?.key || 'Item'}</span>
                      {Array.isArray(it?.meta?.topics) && it.meta.topics.length > 0 && (
                        <span className="text-gray-400"> · topics: {it.meta.topics.slice(0,5).join(', ')}{it.meta.topics.length>5?'…':''}</span>
                      )}
                      {Array.isArray(it?.meta?.mainSubjects) && it.meta.mainSubjects.length > 0 && (
                        <span className="text-gray-400"> · subjects: {it.meta.mainSubjects.slice(0,3).join(', ')}{it.meta.mainSubjects.length>3?'…':''}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {node.name === 'scores.json' && Array.isArray(filePreviews['scores.json']) && (
                <ul className="list-none m-0 p-0 max-h-40 overflow-auto">
                  {filePreviews['scores.json'].slice(0, 100).map((e, i) => (
                    <li key={i} className="py-0.5 border-b border-gray-800">
                      <span className="font-semibold">{e.title || 'Untitled'}</span>
                      <span className="text-gray-400"> · {e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
                      {e.metrics?.politicalness != null && <span className="ml-2">Politicalness: {Math.round((e.metrics.politicalness||0)*100)}%</span>}
                      {e.axes?.econ_lr != null && <span className="ml-2">econ_lr: {Math.round((e.axes.econ_lr||0)*100)}%</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      );
    }
    return (
      <ul className="list-none m-0 p-0">
        <li>{renderNode(fileTree)}</li>
      </ul>
    );
  }, [fileTree]);

  // Helpers: persist/load Ideologram data with server fallback to localStorage
  const persistLibrary = useCallback(async (books) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
      await API.post('/api/ideologram/library', { books });
    } catch (err) {
      try {
        localStorage.setItem('ideologram:library', JSON.stringify({ books, updatedAt: new Date().toISOString() }));
      } catch {}
      if (err?.response?.status && err.response.status !== 0) {
        setIdeoError(`Library save failed (${err.response.status})`);
      }
    }
  }, []);

  const persistEnriched = useCallback(async (newItems) => {
    const byKey = (arr) => {
      const m = {}; (arr || []).forEach(it => { if (it && it.key) m[it.key] = it; }); return m;
    };
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
      // Fetch existing server items and merge
      let existing = [];
      try {
        const res = await API.get('/api/ideologram/enriched');
        existing = Array.isArray(res.data?.items) ? res.data.items : [];
      } catch {}
      const mergedMap = { ...byKey(existing), ...byKey(newItems) };
      const merged = Object.values(mergedMap);
      await API.post('/api/ideologram/enriched', { items: merged });
    } catch (err) {
      try {
        const raw = localStorage.getItem('ideologram:enriched') || JSON.stringify({ items: [], updatedAt: null });
        const prev = JSON.parse(raw);
        const mergedMap = { ...byKey(prev.items), ...byKey(newItems) };
        const store = { items: Object.values(mergedMap), updatedAt: new Date().toISOString() };
        localStorage.setItem('ideologram:enriched', JSON.stringify(store));
      } catch {}
      if (err?.response?.status && err.response.status !== 0) {
        setIdeoError(`Enriched save failed (${err.response.status})`);
      }
    }
  }, []);

  const persistScore = useCallback(async (entry) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
      await API.post('/api/ideologram/scores', entry);
    } catch (err) {
      try {
        const raw = localStorage.getItem('ideologram:scores:v1') || JSON.stringify({ entries: [] });
        const db = JSON.parse(raw);
        db.entries.push(entry);
        localStorage.setItem('ideologram:scores:v1', JSON.stringify(db));
      } catch {}
    }
  }, []);
  // Load per-user ideologram data on entering ideologram mode
  useEffect(() => {
    // Always try to load persisted library when entering Ideologram mode
    if (mode !== 'ideologram') return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
        const lib = await API.get('/api/ideologram/library');
        if (Array.isArray(lib.data?.books)) setIdeoBooks(lib.data.books);
      } catch {
        try {
          const raw = localStorage.getItem('ideologram:library');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.books)) setIdeoBooks(parsed.books);
          }
        } catch {}
      }
      // Load enriched map
      try {
        const token = localStorage.getItem('token');
        let items = [];
        if (token && token !== 'DUMMY_TOKEN') {
          const res = await API.get('/api/ideologram/enriched');
          items = Array.isArray(res.data?.items) ? res.data.items : [];
        } else {
          const raw = localStorage.getItem('ideologram:enriched');
          const json = raw ? JSON.parse(raw) : {};
          items = Array.isArray(json?.items) ? json.items : [];
        }
        const map = {};
        items.forEach(it => { if (it?.key) map[it.key] = { meta: it.meta, axes: it.axes }; });
        setIdeoEnrichedMap(map);
      } catch {}
      // Load saved scores
      try {
        const token = localStorage.getItem('token');
        if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
        const res = await API.get('/api/ideologram/scores');
        const entries = Array.isArray(res.data?.entries) ? res.data.entries : [];
        setIdeoScores(entries);
      } catch {
        try {
          const raw = localStorage.getItem('ideologram:scores:v1');
          const db = raw ? JSON.parse(raw) : { entries: [] };
          setIdeoScores(Array.isArray(db.entries) ? db.entries : []);
        } catch {}
      }
      // Load assessment history
      try {
        const token = localStorage.getItem('token');
        if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
        const res = await API.get('/api/ideologram/assessments');
        if (res.data?.assessments) {
          setAssessmentHistory(res.data.assessments);
          if (res.data.assessments.length > 0) {
            setCurrentAssessment(res.data.assessments[0]); // Most recent
          }
        }
      } catch {
        try {
          const raw = localStorage.getItem('ideologram:assessments');
          if (raw) {
            const data = JSON.parse(raw);
            setAssessmentHistory(data);
            if (data.length > 0) {
              setCurrentAssessment(data[0]);
            }
          }
        } catch {}
      }
      
      // Build file tree (server or local fallback)
      try {
        const token = localStorage.getItem('token');
        if (!token || token === 'DUMMY_TOKEN') throw new Error('local-only');
        const res = await API.get('/api/ideologram/fs');
        setFileTree(res.data || null);
      } catch {
        try {
          const lib = localStorage.getItem('ideologram:library');
          const enr = localStorage.getItem('ideologram:enriched');
          const sc = localStorage.getItem('ideologram:scores:v1');
          const assessments = localStorage.getItem('ideologram:assessments');
          function sz(s) { return s ? s.length : 0; }
          const now = new Date().toISOString();
          const tree = {
            name: (user && user.email) || 'local',
            type: 'dir',
            children: [
              { name: 'library.json', type: 'file', updatedAt: JSON.parse(lib||'{}').updatedAt || null, size: sz(lib) },
              { name: 'enriched.json', type: 'file', updatedAt: JSON.parse(enr||'{}').updatedAt || null, size: sz(enr) },
              { name: 'scores.json', type: 'file', updatedAt: JSON.parse(sc||'{}').updatedAt || null, size: sz(sc) },
              { name: 'assessments.json', type: 'file', updatedAt: assessments ? new Date().toISOString() : null, size: sz(assessments) },
            ]
          };
          setFileTree(tree);
        } catch {}
      }
    })();
  }, [mode]);
  // Mini chat input
  const [miniInput, setMiniInput] = useState('');
  const [miniKeyInput, setMiniKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(!!(localStorage.getItem('openai_api_key') || process.env.REACT_APP_OPENAI_API_KEY));
  const saveMiniKey = () => { setApiKey(miniKeyInput); setHasKey(true); };
  const [datasetQuery, setDatasetQuery] = useState('');
  const [datasetResults, setDatasetResults] = useState([]);
  const [countryQuery, setCountryQuery] = useState('');
  const [countryList, setCountryList] = useState([]);
  const [datasetSearchResults, setDatasetSearchResults] = useState([]);
  // Mini Chat dragging within left sidebar content
  const leftSidebarContentRef = useRef(null);
  const miniChatRef = useRef(null);
  const [miniDrag, setMiniDrag] = useState({ dragging: false, floating: false, x: 0, y: 0, startX: 0, startY: 0 });

  const startMiniDrag = useCallback((e) => {
    if (!leftSidebarContentRef.current || !miniChatRef.current) return;
    const parentRect = leftSidebarContentRef.current.getBoundingClientRect();
    const elRect = miniChatRef.current.getBoundingClientRect();
    // If not floating yet, initialize position from current layout
    const initX = miniDrag.floating ? miniDrag.x : elRect.left - parentRect.left;
    const initY = miniDrag.floating ? miniDrag.y : elRect.top - parentRect.top + leftSidebarContentRef.current.scrollTop;
    setMiniDrag({ dragging: true, floating: true, x: initX, y: initY, startX: e.clientX - initX, startY: e.clientY - initY });
    e.preventDefault();
  }, [miniDrag.floating, miniDrag.x, miniDrag.y]);

  useEffect(() => {
    if (!miniDrag.dragging) return;
    const onMove = (ev) => {
      if (!leftSidebarContentRef.current) return;
      const parent = leftSidebarContentRef.current;
      const el = miniChatRef.current;
      const elRect = el ? el.getBoundingClientRect() : { width: 240, height: 120 };
      // Desired position relative to parent
      let nx = ev.clientX - miniDrag.startX;
      let ny = ev.clientY - miniDrag.startY + parent.scrollTop; // account for scroll
      // Clamp within bounds
      const margin = 8; // bounds padding for left/right/top/bottom
      const maxX = Math.max(margin, parent.clientWidth - elRect.width - margin);
      const maxY = Math.max(margin, parent.scrollHeight - elRect.height - margin);
      nx = Math.min(Math.max(margin, nx), maxX);
      ny = Math.min(Math.max(margin, ny), maxY);
      setMiniDrag((s) => ({ ...s, x: nx, y: ny }));
    };
    const onUp = () => setMiniDrag((s) => ({ ...s, dragging: false }));
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [miniDrag.dragging, miniDrag.startX, miniDrag.startY]);

  useEffect(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) setChatHistory(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Handlers for chat
  const handleNewChat = () => {
    const id = Date.now().toString();
    const newConv = { id, messages: [] };
    setChatHistory(prev => [newConv, ...prev]);
    setCurrentConvId(id);
    setCurrentConversation([]);
    setApiError(null);
  };
  const openConversation = id => {
    const conv = chatHistory.find(c => c.id === id);
    if (conv) {
      setCurrentConvId(id);
      setCurrentConversation(conv.messages);
      setApiError(null);
    }
  };

  // Fetch chat history when entering chat mode
  useEffect(() => {
    if (mode === 'chat') {
      API.get('/api/chat')
        .then(res => setChatHistory(res.data.conversations || []))
        .catch(err => console.error('Failed to load chat history:', err));
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'chat') {
      if (chatHistory.length === 0) {
        handleNewChat();
      } else if (!currentConvId) {
        openConversation(chatHistory[0].id);
      }
    }
  }, [mode, chatHistory]);

  // Fetch specific conversation when selected
  useEffect(() => {
    if (currentConvId) {
      API.get(`/api/chat/${currentConvId}`)
        .then(res => setCurrentConversation(res.data.messages || []))
        .catch(err => console.error('Failed to load conversation:', err));
    }
  }, [currentConvId]);
  // Hamburger toggle in left sidebar
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  // UI toggles
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [particlesOpacity, setParticlesOpacity] = useState(1);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [enableCpuMonitor, setEnableCpuMonitor] = useState(false);
  const [cpuUsage, setCpuUsage] = useState(0);

  // Sidebar state
  const [leftHidden, setLeftHidden] = useState(false);
  const [rightHidden, setRightHidden] = useState(false);

  // Globe dataset & controls
  const [activeDataset, setActiveDataset] = useState(null);
  const [activeGlobeDataset, setActiveGlobeDataset] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Globe UI toggles
  const [showGraph, setShowGraph] = useState(false);
  const [showGlobe, setShowGlobe] = useState(true);
  const [showGraticules, setShowGraticules] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [materialType, setMaterialType] = useState('basic');
  const [updateFPS, setUpdateFPS] = useState(() => {
    const saved = parseInt(localStorage.getItem('updateFPS'), 10);
    return isNaN(saved) ? 24 : saved;
  });
  const [globeTextureType, setGlobeTextureType] = useState('night');
  const [globeOpacity, setGlobeOpacity] = useState(1);
  const [showGlobeTexture, setShowGlobeTexture] = useState(true);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(1);

  // Persist FPS setting
  useEffect(() => { localStorage.setItem('updateFPS', updateFPS); }, [updateFPS]);

  // Tooltip hover count for settings button
  const [settingsHoverCount, setSettingsHoverCount] = useState(() => {
    const saved = parseInt(localStorage.getItem('settingsHoverCount'), 10);
    return isNaN(saved) ? 0 : saved;
  });
  useEffect(() => { localStorage.setItem('settingsHoverCount', settingsHoverCount); }, [settingsHoverCount]);

  // Data states for population or life expectancy
  const [populationData, setPopulationData] = useState(null);
  const [lifeExpData, setLifeExpData] = useState([]);
  const [gdpData, setGdpData] = useState([]);
  const [gdpYears, setGdpYears] = useState([]);
  const [selectedGdpYear, setSelectedGdpYear] = useState(null);
  const [populationYears, setPopulationYears] = useState([]);
  const [selectedPopulationYear, setSelectedPopulationYear] = useState(null);
  const [lifeExpYears, setLifeExpYears] = useState([]);
  const [selectedLifeExpYear, setSelectedLifeExpYear] = useState(null);

  // Region states
  const [availableRegions, setAvailableRegions] = useState(['World']);
  const [selectedRegion, setSelectedRegion] = useState('World');

  // UI states for loading & tooltips
  const [isLoadingGlobeData, setIsLoadingGlobeData] = useState(false);
  const [globeDataError, setGlobeDataError] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isGlobeReset, setIsGlobeReset] = useState(true);

  // Manual search handler for datasets and countries
  const handleSearch = async () => {
    const q = datasetQuery.trim();
    if (!q) return;
    const inds = await getIndicators(q);
    if (inds.length > 0) {
      setDatasetSearchResults(inds.slice(0, 10));
      setCountryList([]);
    } else {
      const countriesRes = await getCountries(q);
      setCountryList(countriesRes);
      setDatasetSearchResults([]);
    }
  };

  // Dataset search handler
  const handleDatasetSearch = () => {
    if (!datasetQuery.trim()) return;
    const q = datasetQuery.toLowerCase();
    const results = availableDatasets.filter(d =>
      d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
    );
    setDatasetResults(results.slice(0, 10));
  };

  // Chat send handler
  const handleChatSend = async (content) => {
    // Ensure there is an active conversation ID (supports mini chat in non-chat modes)
    let convId = currentConvId;
    let createdNew = false;
    if (!convId) {
      convId = Date.now().toString();
      const newConv = { id: convId, messages: [] };
      setChatHistory(prev => [newConv, ...prev]);
      setCurrentConvId(convId);
      setCurrentConversation([]);
      setApiError(null);
      createdNew = true;
    }

    // append user message
    const userMsg = { role: 'user', content, createdAt: Date.now() };
    const baseMessages = createdNew ? [] : currentConversation;
    const updated = [...baseMessages, userMsg];
    setCurrentConversation(updated);
    // persist to history
    setChatHistory(hist => (
      hist.map(c => c.id === convId ? { ...c, messages: updated } : c)
    ));
    try {
      const ai = await sendMessage(updated, model);
      const aiMsg = { role: ai.role, content: ai.content, createdAt: Date.now() };
      const updated2 = [...updated, aiMsg];
      setCurrentConversation(updated2);
      setChatHistory(hist => (
        hist.map(c => c.id === convId ? { ...c, messages: updated2 } : c)
      ));
    } catch (err) {
      setApiError(err.message);
    }
  };

  // Process dataset placeholder: use chat agent to process and display
  // Friendly slug ➜ World-Bank indicator mapping
  const INDICATOR_ALIASES = {
    '6.0.GDP_usd': 'NY.GDP.MKTP.KD',          // GDP (constant 2005 $)
    'GDP_pc_PPP_2011': 'NY.GDP.PCAP.PP.KD',  // GDP per capita, PPP (constant 2011)
    // add more aliases as needed …
  };

  const handleProcessDataset = (datasetId) => {
    const realId = INDICATOR_ALIASES[datasetId] || datasetId;
    handleDatasetSelect(realId, 'graph');
  };

  // -------------------------------
  // AUTO-ROTATION & INTERACTION
  // -------------------------------
  const startAutoRotate = () => {
    if (autoRotateAnimationId.current != null) return;
    let lastTime = performance.now();
    const BASE_SPEED = 0.0008;
    const animate = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      if (rotationEnabled && globeRef.current) {
        const currentPOV = globeRef.current.pointOfView();
        globeRef.current.pointOfView({ ...currentPOV, lng: currentPOV.lng - BASE_SPEED * deltaTime });
      }
      autoRotateAnimationId.current = requestAnimationFrame(animate);
    };
    autoRotateAnimationId.current = requestAnimationFrame(animate);
  };

  const stopAutoRotate = () => {
    if (autoRotateAnimationId.current !== null) {
      cancelAnimationFrame(autoRotateAnimationId.current);
      autoRotateAnimationId.current = null;
    }
  };

  useEffect(() => {
    if (!globeRef.current) return;
    if (rotationEnabled) {
      startAutoRotate();
    } else if (!isUserInteracting.current && autoRotateAnimationId.current !== null) {
      cancelAnimationFrame(autoRotateAnimationId.current);
      autoRotateAnimationId.current = null;
    }
  }, [rotationEnabled]);

  // -------------------------------
  // MISC. EFFECTS & DATA FETCHING
  // -------------------------------
  // Refresh globe on user interaction
  const refreshGlobe = () => {
    if (globeRef.current) {
      globeRef.current.pointOfView(globeRef.current.pointOfView(), 33);
    }
  };

  // Fetch GeoJSON countries
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error('Error loading GeoJSON:', err));
  }, []);

  // Detect maximum value for some example usage
  const maxVal = useMemo(() => {
    const getVal = (f) =>
      f.properties?.GDP_MD_EST / Math.max(1e5, f.properties?.POP_EST || 1) || 0;
    return Math.max(...countries.features.map(getVal));
  }, [countries]);

  // Setup globeMaterial
  const computedGlobeMaterial = useMemo(() => ({
    isNightTexture: globeTextureType === 'night',
    color: 0xffffff,
    opacity: globeOpacity,
    transparent: true,
    bumpScale: 0.3,
    shininess: materialType === 'phong' ? 1 : undefined,
    emissive: (materialType === 'phong' || materialType === 'lambert')
      ? new THREE.Color(0xffffff)
      : undefined,
    emissiveIntensity: (materialType === 'phong' || materialType === 'lambert')
      ? 0.3
      : undefined
  }), [materialType, globeTextureType, globeOpacity]);

  // Power saver mode effect
  useEffect(() => {
    if (lowPowerMode) {
      setGlowEnabled(false);
      setShowAtmosphere(false);
      setGlobeOpacity(0.5);
      setShowGlobeTexture(false);
    }
  }, [lowPowerMode]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing.left) {
        const newWidth = Math.max(15, Math.min((e.clientX / window.innerWidth) * 100, 40));
        setSidebarWidths((prev) => ({ ...prev, left: newWidth }));
      }
      if (isResizing.right) {
        const newWidth = Math.max(15, Math.min(((window.innerWidth - e.clientX) / window.innerWidth) * 100, 40));
        setSidebarWidths((prev) => ({ ...prev, right: newWidth }));
      }
      if (isResizing.top) {
        const newTop = (e.clientY / window.innerHeight) * 100;
        setDimensions((d) => ({ ...d, top: Math.max(5, Math.min(newTop, 30)) }));
      }
      if (isResizing.bottom) {
        const newBottom = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
        setDimensions((d) => ({ ...d, bottom: Math.max(5, Math.min(newBottom, 20)) }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing({ left: false, right: false, top: false, bottom: false });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };

    if (Object.values(isResizing).some(Boolean)) {
      document.body.classList.add('resizing');
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isResizing]);

  // OrbitControls for user interaction
  useEffect(() => {
    if (!isGlobeReady || !globeRef.current) return;
    const controls = new OrbitControls(
      globeRef.current.camera(),
      globeRef.current.renderer().domElement
    );
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.rotateSpeed = 0.8;
    controls.autoRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;

    controls.addEventListener('start', () => { isUserInteracting.current = true; });
    controls.addEventListener('end', () => { isUserInteracting.current = false; });
    return () => controls.dispose();
  }, [isGlobeReady, rotationEnabled]);

  // Globe ready callback
  const onGlobeReady = () => {
    setIsGlobeReady(true);
    setTimeout(() => {
      if (globeRef.current) {
        const pov = globeRef.current.pointOfView();
        globeRef.current.pointOfView({ ...pov }, 10);
      }
    }, 100);
    
    // Switch to 1 FPS after 2 seconds to trigger hover effect (only initial)
    setTimeout(() => {
      if (initialLoadRef.current) {
        // Only apply low-FPS initial hover if no saved FPS exists
        if (localStorage.getItem('updateFPS') === null) {
          setUpdateFPS(1);
        }
        initialLoadRef.current = false;
      }
    }, 2000);
    
    if (globeRef.current && typeof globeRef.current.debug === 'function') {
      globeRef.current.debug(true); // Enable debug in underlying library if needed
    }
  };

  // CPU load monitoring (if enabled)
  useEffect(() => {
    if (!enableCpuMonitor) return;
    let lastTime = performance.now();
    let frameCount = 0;
    let rafId;
    const checkLoad = () => {
      const now = performance.now();
      frameCount++;
      if (now >= lastTime + 1000) {
        const targetFPS = 30;
        const actualFPS = frameCount / ((now - lastTime) / 1000);
        const load = 100 - Math.min((actualFPS / targetFPS) * 100, 100);
        setCpuUsage(load);
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(checkLoad);
    };
    rafId = requestAnimationFrame(checkLoad);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      setCpuUsage(0);
    };
  }, [enableCpuMonitor]);

  // Hover handler
  const handleHover = useCallback((hoveredCountry, event) => {
    setHoverD(hoveredCountry);
    if (event) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  }, []);

  // -------------------------------
  // DATA FETCHING & MERGING
  // -------------------------------
  // Fetch life expectancy CSV
  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/life-expectancy.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const lifeExpKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('life expectancy')
        );
        if (!lifeExpKey) return;

        // Get all entities
        const allEntities = [...new Set(parsed.map(d => d.Entity.trim()))];
        const regions = [
          "World","Africa","Asia","Europe","Americas","North America","South America","Oceania",
          "European Union","High income","Low income","Upper middle income","Lower middle income"
        ].filter(r => allEntities.includes(r));

        setAvailableRegions(['World', ...regions.filter(r => r !== 'World'), ...allEntities.sort()]);

        const availableYears = [...new Set(parsed.map(d => +d.Year).filter(year => !isNaN(year)))].sort((a,b)=>a-b);
        setLifeExpYears(availableYears);

        const defaultYear = availableYears.find(y => y >= 1950) || availableYears[0];
        setSelectedLifeExpYear(defaultYear);

        const yearFiltered = parsed.filter(d => +d.Year === defaultYear);
        const result = yearFiltered
          .filter(d => !regions.includes(d.Entity.trim()))
          .map(d => ({
            entity: d.Entity.trim(),
            year: +d.Year,
            value: +d[lifeExpKey],
            isCountry: true
          }))
          .filter(d => !isNaN(d.value));

        setLifeExpData(result);
      })
      .catch(() => {});
  }, []);

  // Fetch population CSV
  useEffect(() => {
    fetch('https://ourworldindata.org/grapher/population.csv')
      .then(res => res.text())
      .then(csvText => {
        const parsed = csvParse(csvText);
        if (!parsed.length) return;
        const popKey = Object.keys(parsed[0]).find(key =>
          key.toLowerCase().includes('population') && !key.toLowerCase().includes('density')
        );
        if (!popKey) return;
        const aggregates = new Set([
          "World", "Africa", "Asia", "Europe", "Americas", "Oceania",
          "European Union", "High income", "Low income", "Upper middle income", "Lower middle income"
        ]);
        let filteredPop = parsed.filter(d => !aggregates.has(d.Entity.trim()));
        const availableYears = [...new Set(filteredPop.map(d => +d.Year).filter(y => !isNaN(y)))].sort((a,b)=>a-b);
        setPopulationYears(availableYears);
        const defaultYear = Math.max(...availableYears);
        setSelectedPopulationYear(defaultYear);

        filteredPop = filteredPop.filter(d => +d.Year === defaultYear);
        const result = filteredPop.map(d => ({
          entity: d.Entity.trim(),
          year: +d.Year,
          population: +d[popKey],
          value: +d[popKey]
        })).filter(d => !isNaN(d.population));

        setPopulationData(result);
      })
      .catch(() => {});
  }, []);

  // Fetch available datasets (example utility function)
  const fetchDatasets = async () => {
    setIsLoadingDatasets(true);
    try {
      const remote = await getAvailableDatasets();
      console.log('Datasets from server:', remote.map(d => d.id));
      // Use server-provided static + custom datasets (includes GDP per Capita)
      setAvailableDatasets(remote);
    } catch (error) {
      console.error('Error fetching datasets', error);
    }
    setIsLoadingDatasets(false);
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Load dataset for globe
  const loadGlobeData = async () => {
    try {
      setIsLoadingGlobeData(true);
      const data = await loadDataset(activeGlobeDataset);
      if (activeGlobeDataset === 'population') {
        setPopulationData(data);
        const yrs = [...new Set(data.map(d => d.year))];
        setPopulationYears(yrs);
        setSelectedPopulationYear(Math.max(...yrs));
      } else if (activeGlobeDataset === 'life-expectancy') {
        setLifeExpData(data);
        const yrsLE = [...new Set(data.map(item => item.year))];
        setLifeExpYears(yrsLE);
        setSelectedLifeExpYear(Math.max(...yrsLE));
      } else if (activeGlobeDataset === 'NY.GDP.PCAP.PP.KD') {
        // Use all fetched GDP data (ISO3 codes should match globe features)
        console.log('Loaded GDP data count:', data.length);
        setGdpData(data);
        const yrsGdp = Array.from(new Set(data.map(item => item.year))).sort((a,b)=>a-b);
        setGdpYears(yrsGdp);
        setSelectedGdpYear(Math.max(...yrsGdp));
      }
    } catch (error) {
      setGlobeDataError(error.message);
    } finally {
      setIsLoadingGlobeData(false);
    }
  };

  useEffect(() => {
    if (activeGlobeDataset) {
      loadGlobeData();
    }
  }, [activeGlobeDataset, selectedPopulationYear, selectedLifeExpYear, selectedGdpYear]);

  // Debug GDP state
  useEffect(() => {
    console.log('=== GDP STATE ===', {
      activeGlobeDataset,
      gdpDataCount: gdpData.length,
      gdpYears,
      selectedGdpYear
    });
  }, [activeGlobeDataset, gdpData, gdpYears, selectedGdpYear]);

  // Dataset selection
  const handleDatasetSelect = async (datasetId, displayType = 'graph') => {
    setSelectedDataset(datasetId);
    // Ensure dataset object exists
    let ds = availableDatasets.find(d => d.id === datasetId);
    if (!ds) {
      // find in search results
      const fromSearch = datasetSearchResults.find(r => r.id === datasetId);
      ds = fromSearch ? { id: fromSearch.id, title: fromSearch.name } : { id: datasetId, title: datasetId }; 
      setAvailableDatasets(prev => [...prev, ds]);
    }
    if (displayType === 'globe') {
      setIsGlobeReset(false);
      setActiveGlobeDataset(datasetId);
      setShowGlobe(true);
      setShowGraph(false);
      setActiveDataset(null);
    } else {
      setActiveDataset(ds);
      setShowGraph(true);
      setShowGlobe(true);
      setActiveGlobeDataset(null);
    }
  };

  // Debug dataset selection
  useEffect(() => {
    console.log('Selected dataset:', selectedDataset, 'Active globe dataset:', activeGlobeDataset);
  }, [selectedDataset, activeGlobeDataset]);

  const renderDatasetSelector = () => (
    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
      <h3 className="text-sm font-bold text-neon-blue mb-2">Available Datasets</h3>
      {isLoadingDatasets ? (
        <div className="text-neon-blue">Loading datasets...</div>
      ) : (
        <>
          <select
            className="w-full p-2 rounded bg-gray-800 text-white"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
          >
            <option value="">Select a dataset</option>
            {availableDatasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.title}
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 p-2 bg-neon-blue rounded text-black hover:bg-neon-blue/80 transition-colors"
              onClick={() => selectedDataset && handleDatasetSelect(selectedDataset, 'graph')}
              disabled={!selectedDataset}
            >
              Show Graph
            </button>
            <button
              className="flex-1 p-2 bg-neon-purple text-black rounded hover:bg-neon-purple/80 transition-colors"
              onClick={() => selectedDataset && handleDatasetSelect(selectedDataset, 'globe')}
              disabled={!selectedDataset}
            >
              Show on Globe
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Reset globe
  const handleResetGlobe = () => {
    setActiveGlobeDataset(null);
    setPopulationData([]);
    setLifeExpData([]);
    setGdpData([]);
    setSelectedRegion('World');
    setSelectedPopulationYear(null);
    setSelectedLifeExpYear(null);
    setSelectedGdpYear(null);
    setIsGlobeReset(true);
    setGlobeDataError(null);
    const popControls = document.querySelector('#population-controls');
    const lifeControls = document.querySelector('#life-expectancy-controls');
    const gdpControls = document.querySelector('#gdp-controls');
    if (popControls) popControls.style.display = 'none';
    if (lifeControls) lifeControls.style.display = 'none';
    if (gdpControls) gdpControls.style.display = 'none';
  };

  // -------------------------------
  // RENDER
  // -------------------------------
  const sidebarBaseWidth = window.innerWidth <= 768 ? '80' : '20';
  const leftPanelWidth = leftHidden ? '0' : `${sidebarBaseWidth}%`;
  const rightPanelWidth = rightHidden ? '0' : `${sidebarBaseWidth}%`;

  // Auth state and avatars for mini chat
  const { user, logout, loginWithGoogle } = useContext(AuthContext);
  const defaultAssistantAvatar = '/default-assistant-avatar.png';
  // Load assistant and user avatars from storage or defaults
  const assistantAvatarUrl = localStorage.getItem('assistantAvatarUrl') || defaultAssistantAvatar;
  const userAvatarUrl = localStorage.getItem('avatarUrl') || user?.avatarUrl || '';
  const [expandedAvatarUrl, setExpandedAvatarUrl] = useState(null);

  const [warRoomMode, setWarRoomMode] = useState(false);
  const [civAge, setCivAge] = useState(12000);
  const { isLoggedIn } = useContext(AuthContext);

  const [deepStateFeatures, setDeepStateFeatures] = useState([]);
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/deepstate-map-data@latest/data/world.geo.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setDeepStateFeatures(data.features))
      .catch(err => console.error('DeepState fetch error:', err));
  }, []);

  return (
    <div className="relative flex w-screen h-screen text-gray-100 overflow-hidden font-sciFi bg-black">
      <ParticlesBackground show={showParticles} opacity={particlesOpacity} />

      {/* TOP HUD PANEL */}
      {mode !== 'chat' && mode !== 'settings' && mode !== 'ideologram' && (
        <div
          style={{
            height: `${Math.min(dimensions.top, 30)}vh`,
            minHeight: warRoomMode ? '80px' : '40px',
            left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
            right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
            margin: '0 5px'
          }}
          className={`absolute top-0 ${
            glowEnabled
              ? 'bg-gradient-to-b from-neon-blue/10 to-transparent border-b border-neon-blue/50'
              : 'bg-gray-900/50 border-b border-gray-600'
          } flex flex-col items-center justify-center ${warRoomMode ? 'z-50' : 'z-10'} backdrop-blur-lg rounded-lg transition-all duration-300`}
        >
          <h1
            onClick={() => { setMode('home'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
            className={`text-2xl sm:text-4xl md:text-6xl font-bold tracking-widest ${
              glowEnabled
                ? 'bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent'
                : 'text-green-700'
            } relative px-2 text-center`}
          >
            PLANETARY HUD
          </h1>
          {isLoggedIn && warRoomMode && (
            <button
              onClick={() => setWarRoomMode(false)}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-full animate-pulse"
            >
              War Room
            </button>
          )}
          {/* Resize handle for top bar */}
          <div
            className="resize-handle-vertical"
            style={{ bottom: '-6px' }}
            onMouseDown={() => setIsResizing({ ...isResizing, top: true })}
          />
        </div>
      )}
      <div
        className={`hidden`}
        style={{
          width: `${sidebarWidths.left}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.left ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full flex flex-col" style={{ userSelect: isResizing.left ? 'none' : 'auto' }}>
          {!leftHidden && (
            <>
              {/* Left Sidebar Header */}
              <div
                className="flex justify-between items-center p-2"
                style={{
                  background: glowEnabled
                    ? 'linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent)'
                    : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled
                    ? '1px solid rgba(0, 230, 255, 0.3)'
                    : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setHamburgerOpen(open => !open)}
                    className="p-1 text-white hover:text-neon-blue"
                    aria-label="Menu"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {(warRoomMode || showFinancial || mode === 'financial') && (
                    <button
                      onClick={() => { setMode('home'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
                      className="p-1 text-white hover:text-neon-blue"
                      aria-label="Home"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9z" />
                      </svg>
                    </button>
                  )}
                  {mode === 'home' ? (
                    <button
                      onClick={() => setMode('chat')}
                      className="p-1 text-white hover:text-neon-blue"
                      aria-label="Chat"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.8-4.2A8.963 8.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => setMode('home')}
                      className="p-1 text-white hover:text-neon-blue"
                      aria-label="Home"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a 1 1 0 01-1-1V9z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setLeftHidden(true)}
                    className="p-1 text-gray-400 hover:text-white"
                    aria-label="Collapse sidebar"
                  >
                    <span className="text-xl">‹</span>
                  </button>
                </div>
                <button
                  onClick={() => setLeftHidden(true)}
                  className="p-1 text-gray-400 hover:text-white"
                  aria-label="Collapse sidebar"
                >
                  <span className="text-xl">‹</span>
                </button>
              </div>
              {/* Hamburger Dropdown */}
              {hamburgerOpen && (
                <div className="absolute top-12 left-2 bg-gray-800 rounded shadow-lg z-40 w-36">
                  <button
                    onClick={() => { setHamburgerOpen(false); setMode('settings'); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Account
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setMode('chat'); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setShowSettings(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Other Settings
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setMode('ideologram'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Ideologram
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setShowFinancial(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Financial Mode
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setWarRoomMode(v => !v); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    {warRoomMode ? 'Exit War Room' : 'War Room'}
                  </button>
                </div>
              )}
              {/* Sidebar content */}
              {mode === 'chat' ? (
                <div className="flex-1 overflow-y-auto">
                  <h3 className="text-sm font-bold text-neon-blue mb-2">Past Conversations</h3>
                  <button onClick={handleNewChat} className="mb-2 p-2 bg-neon-blue rounded text-black">New Chat</button>
                  <ul className="overflow-y-auto flex-1">
                    {chatHistory.map(c => (
                      <li key={c.id}>
                        <button
                          className="w-full text-left text-white hover:text-neon-blue py-1"
                          onClick={() => openConversation(c.id)}
                        >{c.id}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div ref={leftSidebarContentRef} className="flex-1 overflow-y-auto relative flex flex-col">
                  {mode !== 'ideologram' && renderDatasetSelector()}
                  {/* Unified Dataset/Country Search */}
                  {mode !== 'ideologram' && (
                  <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
                    <h3 className="text-sm font-bold text-neon-blue mb-2">Dataset Search</h3>
                    <div className="flex mb-2">
                      <input
                        className="flex-1 p-2 rounded bg-gray-800 text-white"
                        placeholder="Type category like GDP or Country/Region"
                        value={datasetQuery}
                        onChange={e => setDatasetQuery(e.target.value)}
                      />
                      <button
                        onClick={handleSearch}
                        className="ml-2 px-3 py-1 bg-neon-blue rounded text-black"
                      >Go</button>
                    </div>
                    {datasetSearchResults.length > 0 ? (
                      <ul className="max-h-32 overflow-auto text-sm text-white">
                        {datasetSearchResults.map(ind => (
                          <li key={ind.id} className="flex justify-between items-center py-1 border-b border-gray-700">
                            <span>{ind.name}</span>
                            <button className="ml-2 px-2 py-1 bg-neon-blue rounded text-black text-xs" onClick={() => handleProcessDataset(ind.id)}>
                              Process Dataset
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : countryList.length > 0 ? (
                      <ul className="max-h-32 overflow-auto text-sm text-white">
                        {countryList.map(c => (
                          <li key={c.id} className="flex justify-between items-center py-1 border-b border-gray-700">
                            <span>{c.name}</span>
                            <button className="ml-2 px-2 py-1 bg-neon-purple rounded text-black text-xs" onClick={() => setSelectedRegion(c.id)}>
                              Select
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  )}
                  {mode === 'ideologram' && (
                    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Ideologram Files</h3>
                      <button className="mb-2 px-2 py-1 bg-gray-700 rounded" onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          if (token && token !== 'DUMMY_TOKEN') {
                            const res = await API.get('/api/ideologram/fs');
                            setFileTree(res.data || null);
                          } else {
                            const lib = localStorage.getItem('ideologram:library');
                            const enr = localStorage.getItem('ideologram:enriched');
                            const sc = localStorage.getItem('ideologram:scores:v1');
                            function sz(s){return s? s.length:0}
                            const tree = { name: (user && user.email) || 'local', type: 'dir', children: [
                              { name: 'library.json', type: 'file', updatedAt: JSON.parse(lib||'{}').updatedAt || null, size: sz(lib) },
                              { name: 'enriched.json', type: 'file', updatedAt: JSON.parse(enr||'{}').updatedAt || null, size: sz(enr) },
                              { name: 'scores.json', type: 'file', updatedAt: JSON.parse(sc||'{}').updatedAt || null, size: sz(sc) },
                            ]};
                            setFileTree(tree);
                          }
                        } catch {}
                      }}>Refresh</button>
                      <div className="text-gray-300" style={{ maxHeight: 160, overflow: 'auto' }}>
                        {renderFileTreeList()}
                      </div>
                    </div>
                  )}
                  {mode === 'ideologram' && (
                    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Saved Scores</h3>
                      <button className="mb-2 px-2 py-1 bg-gray-700 rounded" onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          if (token && token !== 'DUMMY_TOKEN') {
                            const res = await API.get('/api/ideologram/scores');
                            setIdeoScores(Array.isArray(res.data?.entries) ? res.data.entries : []);
                          } else {
                            const raw = localStorage.getItem('ideologram:scores:v1');
                            const db = raw ? JSON.parse(raw) : { entries: [] };
                            setIdeoScores(Array.isArray(db.entries) ? db.entries : []);
                          }
                        } catch {}
                      }}>Reload</button>
                      <div className="text-xs text-gray-300" style={{ maxHeight: 160, overflow: 'auto' }}>
                        {ideoScores.length === 0 ? (
                          <div className="text-gray-500">No saved entries</div>
                        ) : (
                          <ul className="list-none m-0 p-0">
                            {ideoScores.slice().reverse().map((e, i) => (
                              <li key={i} className="py-1 border-b border-gray-800">
                                <div className="flex gap-2 items-baseline flex-wrap">
                                  <strong>{e.title || 'Untitled'}</strong>
                                  {e.author && <span className="text-gray-400">by {e.author}</span>}
                                  {e.isbn && <span className="text-gray-400"> · ISBN: {e.isbn}</span>}
                                  {e.fileName && <span className="text-gray-500"> · {e.fileName}</span>}
                                  <span className="ml-auto text-gray-400 text-[10px]">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <div className="text-[11px] text-gray-300">
                                  Politicalness: {Math.round((e.metrics?.politicalness||0)*100)}% · econ_lr: {Math.round((e.axes?.econ_lr||0)*100)}%
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Year slider for globe data */}
                  {activeGlobeDataset === 'population' && populationYears.length > 0 && (
                    <div id="population-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Population Year</h3>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={Math.min(...populationYears)}
                          max={Math.max(...populationYears)}
                          value={selectedPopulationYear}
                          onChange={(e) => setSelectedPopulationYear(+e.target.value)}
                        />
                        <span className="ml-2 text-neon-blue">{selectedPopulationYear}</span>
                      </div>
                    </div>
                  )}
                  {activeGlobeDataset === 'life-expectancy' && lifeExpYears.length > 0 && (
                    <div id="life-expectancy-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Life Exp. Year</h3>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={Math.min(...lifeExpYears)}
                          max={Math.max(...lifeExpYears)}
                          value={selectedLifeExpYear}
                          onChange={(e) => setSelectedLifeExpYear(+e.target.value)}
                        />
                        <span className="ml-2 text-neon-blue">{selectedLifeExpYear}</span>
                      </div>
                    </div>
                  )}
                  {activeGlobeDataset === 'NY.GDP.PCAP.PP.KD' && gdpYears.length > 0 && (
                    <div id="gdp-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">GDP Year</h3>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={Math.min(...gdpYears)}
                          max={Math.max(...gdpYears)}
                          value={selectedGdpYear}
                          onChange={(e) => setSelectedGdpYear(+e.target.value)}
                        />
                        <span className="ml-2 text-neon-blue">{selectedGdpYear}</span>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 transition-all">
                    <p className="text-lg">
                      Dominant Species: <br />
                      <span className="text-2xl font-bold text-blue-900">Homo Sapiens</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-gray-400">System Stats</h4>
                    <p className="text-lg">Age of Civilization: <span className="font-bold">{civAge}×10³y</span></p>
                    <p className="text-lg">Population: <span className="font-bold">8×10⁹</span></p>
                    <input
                      type="range"
                      min={0}
                      max={20000}
                      value={civAge}
                      onChange={(e) => setCivAge(+e.target.value)}
                      className="w-full h-2 bg-gray-700 rounded-lg mt-2"
                    />
                    <span className="text-sm text-neon-blue">Year: {civAge}</span>
                  </div>
                  {isLoggedIn && (
                    <button
                      onClick={() => setWarRoomMode(v => !v)}
                      className="w-full mt-4 p-2 bg-red-600 text-white rounded hover:bg-red-500"
                    >
                      {warRoomMode ? 'Exit War Room' : 'War Room'}
                    </button>
                  )}
                  {isLoggedIn && (
                    <button
                      onClick={() => { setShowFinancial(true); setHamburgerOpen(false); }}
                      className="w-full mt-2 p-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80"
                    >
                      Financial Mode
                    </button>
                  )}
                  {/* Push content up so Mini Chat sits at the bottom by default */}
                  <div className="flex-1" />
                  {/* Mini Chat (visible for all modes except 'chat') - at bottom by default, draggable when grabbed */}
                  <div
                    ref={miniChatRef}
                    className={`${miniDrag.floating ? 'z-50' : ''} w-full p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 box-border overflow-hidden`}
                    style={miniDrag.floating ? { position: 'absolute', left: miniDrag.x, top: miniDrag.y, right: 8 } : undefined}
                  >
                    <div className="flex items-center justify-between mb-2 cursor-move select-none" onMouseDown={startMiniDrag}>
                      <h3 className="text-sm font-bold text-neon-blue">Mini Chat</h3>
                      <button
                        onClick={() => setMode('chat')}
                        className="text-xs text-neon-blue hover:underline"
                      >Open</button>
                    </div>
                    {!hasKey ? (
                      <div className="space-y-2">
                        <input
                          type="password"
                          className="w-full p-2 rounded bg-gray-800 text-white"
                          placeholder="Enter OpenAI API Key"
                          value={miniKeyInput}
                          onChange={(e) => setMiniKeyInput(e.target.value)}
                        />
                        <button
                          onClick={saveMiniKey}
                          className="w-full px-3 py-1 bg-neon-blue text-black rounded"
                        >Save Key</button>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-1 mb-2 max-h-24 overflow-auto text-xs">
                          {currentConversation.slice(-3).map((m, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="shrink-0 text-gray-400">{m.role === 'assistant' ? 'AI:' : 'You:'}</span>
                              <span className="flex-1 min-w-0 break-words overflow-hidden">{m.content}</span>
                            </li>
                          ))}
                          {currentConversation.length === 0 && (
                            <li className="text-gray-400 text-xs">Start the conversation...</li>
                          )}
                        </ul>
                        
                        {/* Worldview Assessment Prompts */}
                        {mode === 'ideologram' && currentConversation.length === 0 && (
                          <div className="mb-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs">
                            <div className="text-blue-200 mb-1">💡 Worldview Assessment Prompts:</div>
                            <div className="space-y-1 text-gray-300">
                              <button 
                                onClick={() => setMiniInput('What are your thoughts on economic systems like capitalism vs socialism?')}
                                className="block w-full text-left hover:bg-blue-800/30 p-1 rounded"
                              >
                                💰 Economic systems discussion
                              </button>
                              <button 
                                onClick={() => setMiniInput('How do you approach philosophical questions about ethics and morality?')}
                                className="block w-full text-left hover:bg-blue-800/30 p-1 rounded"
                              >
                                🧠 Philosophical thinking
                              </button>
                              <button 
                                onClick={() => setMiniInput('What is your understanding of the scientific method and evidence-based reasoning?')}
                                className="block w-full text-left hover:bg-blue-800/30 p-1 rounded"
                              >
                                🔬 Scientific literacy
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex">
                          <input
                            className="flex-1 p-1 rounded-l bg-gray-800 text-white border border-gray-700"
                            value={miniInput}
                            onChange={(e) => setMiniInput(e.target.value)}
                            placeholder="Ask..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && miniInput.trim()) {
                                handleChatSend(miniInput.trim());
                                setMiniInput('');
                              }
                            }}
                          />
                          <button
                            className="px-2 bg-neon-blue text-black rounded-r disabled:opacity-50"
                            disabled={!miniInput.trim()}
                            onClick={() => {
                              if (!miniInput.trim()) return;
                              handleChatSend(miniInput.trim());
                              setMiniInput('');
                            }}
                          >Send</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Resize handle for left sidebar */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{ transform: 'translateX(50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing((prev) => ({ ...prev, left: true }));
                }}
              />
            </>
          )}
          {/* Resize handle for left sidebar */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
            style={{ transform: 'translateX(50%)' }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing((prev) => ({ ...prev, left: true }));
            }}
          />
        </div>
      </div>
      {leftHidden && false && (
        <button
          onClick={() => setLeftHidden(false)}
          className="fixed left-1 top-1/2 -translate-y-1/2 bg-gray-800/90 p-2 sm:p-3
            rounded-r-md shadow-lg hover:bg-gray-700 transition-colors z-40
            border border-neon-blue/30"
        >
          &gt;
        </button>
      )}

      {/* CENTER CONTAINER */}
      <div
        className="absolute top-0 bottom-0 flex items-center justify-center z-20"
        style={{
          left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
          right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
          transition: 'left 0.3s ease-in-out, right 0.3s ease-in-out'
        }}
      >
        {mode === 'chat' && (
          <>
            {apiError && <div className="text-neon-red p-2">Error: {apiError}</div>}
            <ChatWindow
              messages={currentConversation}
              onSend={handleChatSend}
              leftMargin={!leftHidden ? `${sidebarWidths.left}vw` : '0'}
              rightMargin={!rightHidden ? `${sidebarWidths.right}vw` : '0'}
            />
          </>
        )}
        {mode === 'settings' && (
          <Settings />
        )}
        {mode !== 'chat' && mode !== 'settings' && mode !== 'ideologram' && showGraph && activeDataset && (
          <GraphComponent
            dataset={activeDataset}
            onClose={() => {
              setShowGraph(false);
              setActiveDataset(null);
              setSelectedDataset('');
              setShowGlobe(true);
            }}
            leftMargin={!leftHidden ? `${sidebarWidths.left}vw` : '0'}
            rightMargin={!rightHidden ? `${sidebarWidths.right}vw` : '0'}
          />
        )}
        {mode !== 'chat' && mode !== 'settings' && mode !== 'ideologram' && !showGraph && !showFinancial && (
          <div
            className="relative w-full h-full"
            style={{
              opacity: globeOpacity,
              transition: 'opacity 0.3s ease'
            }}
          >
            {showGlobe && (
              <Globe
                key={`globe-${warRoomMode}-${deepStateFeatures.length}-${showGlobeTexture}-${updateFPS}-${activeGlobeDataset}-${selectedPopulationYear || ''}-${selectedLifeExpYear || ''}-${selectedGdpYear || ''}-${isGlobeReset ? 'reset' : 'active'}`}
                width={800}
                height={800}
                globeMaterial={computedGlobeMaterial}
                backgroundColor="rgba(0,0,0,0)"
                fpsLimit={updateFPS}
                polygonsData={warRoomMode ? deepStateFeatures : countries.features.filter((feat) => feat.properties.ISO_A2 !== 'AQ')}
                polygonAltitude={(d) => (d === hoverD ? 0.15 : 0.1)}
                onContextMenu={(e) => e.preventDefault()}
                polygonCapColor={(d) => {
                  if (warRoomMode) return 'rgba(255,255,0,0.2)';
                  const name = normalizeCountryName(d.properties.ADMIN);
                  if (activeGlobeDataset === 'life-expectancy' && lifeExpData) {
                    const rec = lifeExpData.find(item => normalizeCountryName(item.entity) === name && item.year === selectedLifeExpYear);
                    if (rec) {
                      const yearData = lifeExpData.filter(item => item.year === selectedLifeExpYear);
                      const max = Math.max(...yearData.map(item => item.value));
                      const t = rec.value / max;
                      return interpolateYlOrRd(t);
                    }
                  }
                  if (activeGlobeDataset === 'population' && populationData) {
                    const rec = populationData.find(item => normalizeCountryName(item.entity) === name && item.year === selectedPopulationYear);
                    if (rec) {
                      const yearData = populationData.filter(item => item.year === selectedPopulationYear);
                      const max = Math.max(...yearData.map(item => item.value));
                      const t = rec.value / max;
                      return interpolateYlOrRd(t);
                    }
                  }
                  if (activeGlobeDataset === 'NY.GDP.PCAP.PP.KD' && gdpData) {
                    let rec = gdpData.find(item => item.iso === d.properties.ISO_A3 && item.year === selectedGdpYear);
                    if (!rec) rec = gdpData.find(item => normalizeCountryName(item.entity) === name && item.year === selectedGdpYear);
                    if (rec) {
                      const yearData = gdpData.filter(item => item.year === selectedGdpYear);
                      const max = Math.max(...yearData.map(item => item.value));
                      const t = rec.value / max;
                      return interpolateYlOrRd(t);
                    }
                  }
                  return 'rgba(200,200,200,0.01)';
                }}
                polygonSideColor={(d) => (d === hoverD ? 'rgba(57,255,20,0.15)' : 'rgba(150,150,150,0.01)')}
                polygonStrokeColor={(d) => (d === hoverD ? 'rgba(57,255,20,0.6)' : 'rgba(57,255,20,0.3)')}
                showGraticules={showGraticules}
                showAtmosphere={showAtmosphere}
                onGlobeReady={onGlobeReady}
                showTexture={showGlobeTexture}
              />
            )}
            {isLoadingGlobeData && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="text-neon-blue">Loading data...</div>
              </div>
            )}
            {globeDataError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="text-neon-red">Error: {globeDataError}</div>
              </div>
            )}
          </div>
        )}
        {(mode === 'financial' || showFinancial) && mode !== 'chat' && mode !== 'settings' && !showGraph && (
          <div className="relative w-full h-full overflow-auto">
            <FinancialDashboard onExit={() => setShowFinancial(false)} />
          </div>
        )}
        {mode === 'ideologram' && (
          <div className="relative w-full h-full p-4" style={{ overflowY: 'auto' }}>
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {/* CSV Upload - Only show when no data exists */}
              {(!ideoBooks || ideoBooks.length === 0) && (!ideoScores || ideoScores.length === 0) && (
                <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                  <h2 className="text-lg font-semibold mb-2">Upload Goodreads CSV</h2>
                  <p className="text-sm text-gray-400 mb-2">Upload your exported CSV of "Read" books.</p>
                  <div className="flex items-center space-x-3 mb-3">
                    <input 
                      type="file" 
                      accept=".csv,text/csv" 
                      onChange={(e) => {
                        const f = e.target.files?.[0]; 
                        if (!f) return;
                        setIdeoSelectedFile(f);
                        setIdeoError('');
                      }} 
                      className="flex-1"
                    />
                    {ideoSelectedFile && (
                      <button
                        onClick={() => {
                          if (!ideoSelectedFile) return;
                          setIdeoLoading(true);
                          setIdeoError('');
                          const reader = new FileReader();
                          reader.onload = () => {
                            try {
                              const text = String(reader.result || '');
                              const parsed = parseGoodreadsCsv(text);
                              setIdeoBooks(parsed);
                              // Persist library (server if logged-in, else local)
                              persistLibrary(parsed);
                              setIdeoSelectedFile(null);
                            } catch (err) { 
                              setIdeoError('Failed to parse CSV'); 
                            } finally { 
                              setIdeoLoading(false); 
                            }
                          };
                          reader.readAsText(ideoSelectedFile);
                        }}
                        disabled={ideoLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ideoLoading ? 'Processing...' : 'Process CSV'}
                      </button>
                    )}
                  </div>
                  {ideoSelectedFile && (
                    <div className="text-sm text-gray-400 mb-2">
                      Selected: {ideoSelectedFile.name}
                    </div>
                  )}
                  {ideoLoading && <span className="text-xs text-gray-400">Processing CSV…</span>}
                  {!!ideoError && <div className="text-xs text-neon-red mt-1">{ideoError}</div>}
                </div>
              )}

              {/* ChatGPT History Upload */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                <h2 className="text-lg font-semibold mb-2">Upload ChatGPT History</h2>
                <p className="text-sm text-gray-400 mb-2">Upload your ChatGPT conversation history to enhance worldview assessment</p>
                <input type="file" accept=".json,.txt" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setIdeoLoading(true); setIdeoError('');
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const text = String(reader.result || '');
                      const parsed = parseChatGPTHistory(text);
                      setIdeoChatHistory(parsed);
                      // Store chat history for worldview assessment
                      if (user) {
                        API.post('/api/ideologram/chat-history', { chatHistory: parsed })
                          .then(() => console.log('Chat history saved to server'))
                          .catch(err => {
                            console.error('Failed to save chat history to server:', err);
                            localStorage.setItem('ideoChatHistory', JSON.stringify(parsed));
                          });
                      } else {
                        localStorage.setItem('ideoChatHistory', JSON.stringify(parsed));
                      }
                      setIdeoLoading(false);
                    } catch (err) { 
                      setIdeoError('Failed to parse ChatGPT history: ' + err.message); 
                      setIdeoLoading(false);
                    }
                  };
                  reader.readAsText(f);
                }} />
                {ideoLoading && <span className="ml-2 text-xs text-gray-400">Processing…</span>}
                {!!ideoError && <div className="text-xs text-neon-red mt-1">{ideoError}</div>}
              </div>

              {/* Chat History Display */}
              {ideoChatHistory.length > 0 && (
                <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                  <h2 className="text-lg font-semibold mb-2">Chat History Analysis</h2>
                  <p className="text-sm text-gray-400 mb-2">
                    {ideoChatHistory.length} messages loaded • 
                    {ideoChatHistory.filter(m => m.role === 'user').length} user messages • 
                    {ideoChatHistory.filter(m => m.role === 'assistant').length} AI responses
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {ideoChatHistory.slice(-5).map((msg, idx) => (
                      <div key={idx} className={`p-2 rounded text-sm ${
                        msg.role === 'user' ? 'bg-blue-900/30 border-l-2 border-blue-500' : 'bg-gray-800/30 border-l-2 border-gray-500'
                      }`}>
                        <div className="text-xs text-gray-400 mb-1">
                          {msg.role === 'user' ? 'You' : 'AI'} • {new Date(msg.timestamp).toLocaleString()}
                        </div>
                        <div className="text-gray-200">
                          {msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Chat history will be analyzed during worldview assessment to enhance accuracy
                  </div>
                </div>
              )}

              {/* Chat Integration for Worldview Assessment */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                <h2 className="text-lg font-semibold mb-2">💬 Chat Integration</h2>
                <p className="text-sm text-gray-400 mb-2">
                  Use the Mini Chat (bottom of left sidebar) to discuss worldview topics and enhance your assessment
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h3 className="font-medium text-blue-400">Suggested Chat Topics:</h3>
                    <ul className="text-gray-300 space-y-1">
                      <li>• Economic systems and policies</li>
                      <li>• Philosophical questions and ethics</li>
                      <li>• Scientific concepts and methods</li>
                      <li>• Psychological insights and behavior</li>
                      <li>• Historical events and perspectives</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-green-400">Chat Analysis Benefits:</h3>
                    <ul className="text-gray-300 space-y-1">
                      <li>• Enhanced assessment accuracy</li>
                      <li>• Real-time worldview insights</li>
                      <li>• Continuous learning tracking</li>
                      <li>• Personalized recommendations</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
                  💡 <strong>Tip:</strong> The more you chat about worldview topics, the more accurate your assessment becomes. 
                  Chat conversations are automatically analyzed and integrated into your worldview profile.
                </div>
              </div>

              {/* Avatar and Worldview Assessment Score Display */}
              {user && (
                <div className="p-4 rounded-lg border border-neon-blue/50 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-lg font-medium text-white">{user.email}</div>
                        <div className="text-sm text-gray-400">Worldview Assessment</div>
                      </div>
                    </div>
                    {assessmentHistory.length > 0 && (
                      <div className="text-right">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm px-3 py-2 rounded-full border border-white shadow-sm">
                          {(() => {
                            const weightedScores = computeWeightedAverage(assessmentHistory);
                            if (weightedScores && Object.keys(weightedScores).length > 0) {
                              const avgScore = Object.values(weightedScores).reduce((sum, data) => sum + data.score, 0) / Object.keys(weightedScores).length;
                              return `${Math.round(avgScore * 100)}%`;
                            }
                            return 'N/A';
                          })()}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Overall Score</div>
                      </div>
                    )}
                  </div>
                  {assessmentHistory.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {(() => {
                        const weightedScores = computeWeightedAverage(assessmentHistory);
                        if (weightedScores && Object.keys(weightedScores).length > 0) {
                          return Object.entries(weightedScores).map(([dimension, data]) => (
                            <div key={dimension} className="text-center p-2 bg-gray-800/50 rounded border border-gray-700">
                              <div className="text-sm font-medium text-gray-300 capitalize">{dimension.replace(/_/g, ' ')}</div>
                              <div className="text-lg font-bold text-neon-blue">{Math.round(data.score * 100)}%</div>
                              <div className="text-xs text-gray-400">Confidence: {Math.round(data.confidence * 100)}%</div>
                            </div>
                          ));
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {assessmentHistory.length === 0 && (
                    <div className="text-center py-4">
                      <div className="text-gray-400 mb-2">No worldview assessment completed yet</div>
                      <button 
                        onClick={() => setWorldviewQuizOpen(true)}
                        className="px-4 py-2 bg-neon-blue text-black rounded hover:bg-blue-400 transition-colors"
                      >
                        Take Worldview Assessment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Worldview Assessment Score Display */}
              <div className="p-4 rounded-lg border border-neon-blue/50 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-neon-blue">🌍 Worldview Assessment</h2>
                  <button 
                    onClick={() => setWorldviewQuizOpen(true)}
                    className="px-3 py-1 bg-neon-blue text-black rounded text-sm hover:bg-blue-400 transition-colors"
                  >
                    {assessmentHistory.length > 0 ? 'Take Assessment' : 'Start Assessment'}
                  </button>
                </div>
                
                {/* Large Avatar Display */}
                {user && (
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <img 
                        src={user.avatarUrl || `https://api.dicebear.com/5.x/pixel-art/svg?seed=${encodeURIComponent(user.email)}`}
                        alt="User Avatar" 
                        className="w-24 h-24 rounded-full border-4 border-neon-blue/50 shadow-lg"
                      />
                      {/* Worldview Assessment Score Badge on Large Avatar */}
                      {assessmentHistory.length > 0 && (
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm px-3 py-1 rounded-full border-2 border-white shadow-lg">
                          {(() => {
                            const weightedScores = computeWeightedAverage(assessmentHistory);
                            if (weightedScores && Object.keys(weightedScores).length > 0) {
                              const avgScore = Object.values(weightedScores).reduce((sum, data) => sum + data.score, 0) / Object.keys(weightedScores).length;
                              return `${Math.round(avgScore * 100)}%`;
                            }
                            return 'N/A';
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {assessmentHistory.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(() => {
                        const weightedScores = computeWeightedAverage(assessmentHistory);
                        if (weightedScores && Object.keys(weightedScores).length > 0) {
                          return Object.entries(weightedScores).map(([dimension, data]) => (
                            <div key={dimension} className="p-3 bg-gray-800/60 rounded border border-gray-600">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold capitalize text-gray-200">
                                  {dimension.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {Math.round(data.score * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                                <div 
                                  className={`h-2 rounded-full ${data.score >= 0 ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}
                                  style={{ width: `${Math.abs(data.score) * 100}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {data.assessmentCount} assessments • Last: {new Date(data.lastAssessment).toLocaleDateString()}
                              </div>
                            </div>
                          ));
                        }
                        return null;
                      })()}
                    </div>
                    {(() => {
                      const weightedScores = computeWeightedAverage(assessmentHistory);
                      if (weightedScores && Object.keys(weightedScores).length > 0) {
                        const avgScore = Object.values(weightedScores).reduce((sum, data) => sum + data.score, 0) / Object.keys(weightedScores).length;
                        const totalAssessments = Object.values(weightedScores).reduce((sum, data) => sum + data.assessmentCount, 0);
                        return (
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-300">Overall Score:</span>
                              <span className="text-neon-blue font-semibold">{Math.round(avgScore * 100)}%</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400">
                              <span>Total Assessments: {totalAssessments}</span>
                              <span>Dimensions: {Object.keys(weightedScores).length}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-6">
                    <div className="text-4xl mb-2">🧠</div>
                    <p className="text-sm mb-3">Take your first worldview assessment to discover your intellectual profile</p>
                    <p className="text-xs text-gray-500">Assess your knowledge across multiple dimensions including economics, philosophy, science, psychology, and history</p>
                  </div>
                )}
              </div>

              {/* Read books list + enrichment */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                <h2 className="text-lg font-semibold mb-2">Read books</h2>
                <p className="text-sm text-gray-400">Showing books detected as read. Only read and rated books are used by default in the compute.</p>
                <div className="mt-2 flex gap-4 flex-wrap text-sm">
                  <span>Total loaded: {ideoBooks.length}</span>
                  <span>Read: {ideoBooks.filter(b => (b.isRead ?? (b.readingStatus === 'read' || !!b.dateRead))).length}</span>
                  <span>Rated (read): {ideoBooks.filter(b => (b.isRead ?? (b.readingStatus === 'read' || !!b.dateRead)) && b.rating != null).length}</span>
                </div>
                <div className="mt-2 max-h-64 overflow-auto border border-gray-700 rounded p-2">
                  {ideoBooks.filter(b => (b.isRead ?? (b.readingStatus === 'read' || !!b.dateRead))).length === 0 ? (
                    <div className="text-gray-400 text-sm">No read books detected yet. Upload a CSV above.</div>
                  ) : (
                    <ul className="list-none m-0 p-0 text-sm">
                      {ideoBooks.filter(b => (b.isRead ?? (b.readingStatus === 'read' || !!b.dateRead))).slice(0, 200).map((b, i) => {
                        const key = `${b.title}::${b.author || ''}`;
                        const info = ideoEnrichedMap[key];
                        const isEnriching = !!ideoEnriching[key];
                        return (
                        <li key={`${b.title}-${i}`} className="py-1 border-b border-gray-800">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <strong className="mr-2">{b.title}</strong>
                            {b.author && <span className="text-gray-400">by {b.author}</span>}
                            {b.rating != null && <span className="ml-auto">⭐ {b.rating}</span>}
                          </div>
                          <div className="text-xs text-gray-400 flex gap-3 flex-wrap">
                            {b.dateRead && <span>Date read: {b.dateRead}</span>}
                            {!!(b.shelves?.length) && <span>Shelves: {b.shelves.slice(0,4).join(', ')}{b.shelves.length>4?'…':''}</span>}
                          </div>
                          {!info && (
                            <div className="mt-1">
                              <button className="px-2 py-0.5 bg-gray-700 rounded text-[11px] disabled:opacity-50" disabled={isEnriching} onClick={async () => {
                                setIdeoEnriching(prev => ({ ...prev, [key]: true })); setIdeoError('');
                                try {
                                  const r = await enhancedEnrichBook(b);
                                  if (r) {
                                    const item = { 
                                      key, 
                                      meta: r.metadata, 
                                      axes: r.inferredAxes || {},
                                      topics: r.topics || [],
                                      enrichmentQuality: r.enrichmentQuality
                                    };
                                    setIdeoEnrichedMap(prev => ({ ...prev, [key]: item }));
                                    await persistEnriched([item]);
                                  }
                                } catch { setIdeoError('Enhanced enrichment failed'); }
                                finally { setIdeoEnriching(prev => ({ ...prev, [key]: false })); }
                              }}>{isEnriching ? 'Enriching…' : 'Enrich this'}</button>
                            </div>
                          )}
                          {info && (
                            <div className="text-[11px] text-gray-300 mt-1">
                              {(() => {
                                const topics = Array.isArray(info.meta?.topics)
                                  ? info.meta.topics
                                  : (Array.isArray(info.meta?.mainSubjects)
                                      ? info.meta.mainSubjects
                                      : (Array.isArray(info.meta?.subjects) ? info.meta.subjects : []));
                                return topics.length > 0 ? (
                                  <div>Topics: {topics.slice(0,6).join(', ')}{topics.length>6?'…':''}</div>
                                ) : null;
                              })()}
                              <div>
                                econ_lr: {Math.round(((info.axes?.econ_lr||0)*100))}% · cult_libcon: {Math.round(((info.axes?.cult_libcon||0)*100))}% · auth_lib: {Math.round(((info.axes?.auth_lib||0)*100))}% · global_local: {Math.round(((info.axes?.global_local||0)*100))}% · tech_prog: {Math.round(((info.axes?.tech_prog||0)*100))}% · epistemic_rat: {Math.round(((info.axes?.epistemic_rat||0)*100))}%
                              </div>
                              <button 
                                className="mt-1 px-2 py-0.5 bg-blue-600 rounded text-[10px] hover:bg-blue-700"
                                onClick={() => setEnrichmentDetail({ key, book: b, currentInfo: info })}
                              >
                                View Details
                              </button>
                            </div>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  <button className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50" disabled={ideoLoading} onClick={async () => {
                    const read = ideoBooks.filter(b => (b.isRead ?? (b.readingStatus === 'read' || !!b.dateRead))).slice(0,20);
                    setIdeoLoading(true); setIdeoError('');
                    try {
                      const items = [];
                      for (const b of read) {
                        try {
                          const r = await enhancedEnrichBook(b);
                          const key = `${b.title}::${b.author || ''}`;
                          if (r) {
                            const item = { 
                              key, 
                              meta: r.metadata, 
                              axes: r.inferredAxes || {},
                              topics: r.topics || [],
                              enrichmentQuality: r.enrichmentQuality
                            };
                            items.push(item);
                            setIdeoEnrichedMap(prev => ({ ...prev, [key]: item }));
                          }
                          await new Promise(r => setTimeout(r, 250));
                        } catch {}
                      }
                      if (items.length) await persistEnriched(items);
                    } catch (err) { setIdeoError('Enrichment failed'); }
                    finally { setIdeoLoading(false); }
                  }}>Enrich top 20 via Open Library</button>
                  
                  <button className="px-3 py-1 bg-purple-700 rounded disabled:opacity-50" disabled={ideoLoading} onClick={() => setWorldviewQuizOpen(true)}>
                    🌍 Worldview Assessment
                  </button>
                  
                  {/* Current Worldview Scores Display */}
                  <div className="ml-4 p-2 bg-gray-800 rounded border border-gray-600">
                    <div className="text-xs text-gray-400 mb-1">Weighted Worldview Scores</div>
                    <div className="flex gap-2">
                      {(() => {
                        const weightedScores = computeWeightedAverage(assessmentHistory) || 
                          computeWorldviewScore(ideoBooks, worldviewResponses, userCredentials, selfAssessment);
                        return Object.entries(weightedScores).map(([dimension, data]) => (
                          <div key={dimension} className="text-center">
                            <div className="text-xs font-semibold capitalize">{dimension.split('_')[0]}</div>
                            <div className="text-xs text-gray-300">
                              {Math.round((data.score || data.score) * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {assessmentHistory.length > 0 ? 
                                `${assessmentHistory.length} assessments` : 
                                `${Math.round((data.overallConfidence || data.overallConfidence) * 100)}% conf`
                              }
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  
                  <button className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50" disabled={ideoLoading} onClick={async () => {
                    const read = ideoBooks.filter(b => (b.isRead ?? (b.readingStatus === 'read' || !!b.dateRead))).slice(0,20);
                    setIdeoLoading(true); setIdeoError('');
                    try {
                      const items = [];
                      for (const b of read) {
                        try {
                          console.log('Attempting Wikidata enrichment for:', b.title, b.author);
                          
                          // Try multiple search strategies for better Wikidata matching
                          let r = null;
                          const searchStrategies = [
                            // Strategy 1: Full title + author
                            `${b.title} ${b.author || ''}`,
                            // Strategy 2: Just title
                            b.title,
                            // Strategy 3: Clean title (remove series info)
                            b.title.replace(/\([^)]*\)/g, '').replace(/[#\d]+/g, '').trim(),
                            // Strategy 4: Title + author without series
                            `${b.title.replace(/\([^)]*\)/g, '').replace(/[#\d]+/g, '').trim()} ${b.author || ''}`.trim()
                          ];
                          
                          // Use our enhanced enrichment function
                          r = await enhancedEnrichBook(b);
                          if (r) {
                            console.log('Enhanced enrichment successful for:', b.title, 'Topics:', r.topics.length, 'Axes:', Object.keys(r.inferredAxes));
                          }
                          
                          const key = `${b.title}::${b.author || ''}`;
                          if (r) {
                            // Add source metadata to indicate this came from Wikidata
                            const enrichedMeta = {
                              ...r.metadata,
                              sources: {
                                wikidata: { qid: r.metadata.qid }
                              }
                            };
                            items.push({ key, meta: enrichedMeta, axes: r.inferredAxes || {} });
                            setIdeoEnrichedMap(prev => ({ ...prev, [key]: { meta: enrichedMeta, axes: r.inferredAxes || {} } }));
                          } else {
                            console.log('Wikidata enrichment failed for all strategies:', b.title);
                            // Wikidata enrichment failed, try Open Library as fallback
                            const fallback = await enrichBook(b);
                            if (fallback) {
                              items.push({ key, meta: fallback.metadata, axes: fallback.inferredAxes || {} });
                              setIdeoEnrichedMap(prev => ({ ...prev, [key]: { meta: fallback.metadata, axes: fallback.inferredAxes || {} } }));
                            }
                          }
                          await new Promise(r => setTimeout(r, 250));
                        } catch (err) {
                          console.warn('Wikidata enrichment failed for:', b.title, err);
                          // Try Open Library as fallback on error
                          try {
                            const fallback = await enrichBook(b);
                            if (fallback) {
                              const key = `${b.title}::${b.author || ''}`;
                              items.push({ key, meta: fallback.metadata, axes: fallback.inferredAxes || {} });
                              setIdeoEnrichedMap(prev => ({ ...prev, [key]: { meta: fallback.metadata, axes: fallback.inferredAxes || {} } }));
                            }
                          } catch (fallbackErr) {
                            console.warn('Fallback enrichment also failed for:', b.title, fallbackErr);
                          }
                        }
                      }
                      if (items.length) await persistEnriched(items);
                    } catch (err) { setIdeoError('Wikidata enrichment failed'); }
                    finally { setIdeoLoading(false); }
                  }}>Enrich via Wikidata</button>
                  <button className="px-2 py-1 bg-green-600 rounded text-xs disabled:opacity-50" disabled={ideoLoading} onClick={async () => {
                    setIdeoError('');
                    try {
                      // Test Wikidata connectivity step by step
                      const testBook = { title: 'The Communist Manifesto', author: 'Karl Marx' };
                      console.log('Testing Wikidata connectivity with:', testBook);
                      
                      // Test the search API directly with different search strategies
                      const searchStrategies = [
                        'The Communist Manifesto Karl Marx',
                        'The Communist Manifesto',
                        'Communist Manifesto Marx',
                        'Communist Manifesto'
                      ];
                      
                      for (const searchTerm of searchStrategies) {
                        console.log('Trying search term:', searchTerm);
                        const searchUrl = new URL('https://www.wikidata.org/w/api.php');
                        searchUrl.searchParams.set('action', 'wbsearchentities');
                        searchUrl.searchParams.set('search', searchTerm);
                        searchUrl.searchParams.set('language', 'en');
                        searchUrl.searchParams.set('format', 'json');
                        searchUrl.searchParams.set('origin', '*');
                        searchUrl.searchParams.set('type', 'item');
                        searchUrl.searchParams.set('limit', '5');
                        
                        const searchRes = await fetch(searchUrl.toString());
                        if (searchRes.ok) {
                          const searchData = await searchRes.json();
                          console.log('Search results for "' + searchTerm + '":', searchData);
                          
                          if (searchData?.search?.[0]?.id) {
                            const qid = searchData.search[0].id;
                            console.log('Found QID:', qid, 'with search term:', searchTerm);
                            setIdeoError('Wikidata test: SUCCESS - QID: ' + qid + ' (term: ' + searchTerm + ')');
                            return;
                          }
                        }
                        await new Promise(r => setTimeout(r, 100)); // Small delay between searches
                      }
                      
                      setIdeoError('Wikidata test: NO SEARCH RESULTS with any strategy');
                    } catch (err) {
                      console.error('Wikidata test error:', err);
                      setIdeoError('Wikidata test: ERROR - ' + err.message);
                    }
                  }}>Test Wikidata</button>
                  <button className="px-2 py-1 bg-blue-600 rounded text-xs disabled:opacity-50" disabled={ideoLoading} onClick={async () => {
                    setIdeoError('');
                    try {
                      // Test with a book from your library
                      const testBook = { title: 'Diaspora', author: 'Greg Egan' };
                      console.log('Testing custom Wikidata search with:', testBook);
                      
                      // Custom Wikidata search implementation
                      const searchTerm = 'Diaspora Greg Egan';
                      const searchUrl = new URL('https://www.wikidata.org/w/api.php');
                      searchUrl.searchParams.set('action', 'wbsearchentities');
                      searchUrl.searchParams.set('search', searchTerm);
                      searchUrl.searchParams.set('language', 'en');
                      searchUrl.searchParams.set('format', 'json');
                      searchUrl.searchParams.set('origin', '*');
                      searchUrl.searchParams.set('type', 'item');
                      searchUrl.searchParams.set('limit', '10');
                      
                      console.log('Testing custom search URL:', searchUrl.toString());
                      const searchRes = await fetch(searchUrl.toString());
                      console.log('Custom search response status:', searchRes.status);
                      
                      if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        console.log('Custom search response data:', searchData);
                        
                        if (searchData?.search && searchData.search.length > 0) {
                          const results = searchData.search.map(item => ({
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            url: item.url
                          }));
                          console.log('Custom search found results:', results);
                          setIdeoError('Custom test: FOUND ' + results.length + ' results - ' + results[0].id);
                        } else {
                          setIdeoError('Custom test: NO RESULTS in response');
                        }
                      } else {
                        setIdeoError('Custom test: HTTP FAILED - Status: ' + searchRes.status);
                      }
                    } catch (err) {
                      console.error('Custom test error:', err);
                      setIdeoError('Custom test: ERROR - ' + err.message);
                    }
                  }}>Test Custom Search</button>
                  <button className="px-2 py-1 bg-purple-600 rounded text-xs disabled:opacity-50" disabled={ideoLoading} onClick={async () => {
                    setIdeoError('');
                    try {
                      // Test enhanced enrichment with a book from your library
                      const testBook = { title: 'Diaspora', author: 'Greg Egan' };
                      console.log('Testing enhanced enrichment with:', testBook);
                      
                      const result = await enhancedEnrichBook(testBook);
                      if (result) {
                        console.log('Enhanced enrichment result:', result);
                        setIdeoError(`Enhanced test: SUCCESS - OL: ${result.enrichmentQuality.openLibrary}, WD: ${result.enrichmentQuality.wikidata}, Topics: ${result.topics.length}`);
                      } else {
                        setIdeoError('Enhanced test: FAILED - returned null');
                      }
                    } catch (err) {
                      console.error('Enhanced test error:', err);
                      setIdeoError('Enhanced test: ERROR - ' + err.message);
                    }
                  }}>Test Enhanced</button>
                  {ideoLoading && <span className="text-xs text-gray-400">Parsing…</span>}
                  {!!ideoError && <span className="text-xs text-neon-red">{ideoError}</span>}
                </div>
              </div>

              {/* EPUB/Text Analyze */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                <h2 className="text-lg font-semibold mb-2">Analyze text or EPUB</h2>
                <input type="file" accept=".txt,text/plain" className="mb-2" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => setIdeoFreeText(String(reader.result || ''));
                  reader.readAsText(f);
                }} />
                <input type="file" accept=".epub,application/epub+zip" className="mb-2" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  try {
                    const JSZip = (await import('jszip')).default;
                    const buf = await f.arrayBuffer();
                    const zip = await JSZip.loadAsync(buf);
                    setEpubName(f.name);
                    const textFiles = Object.keys(zip.files).filter((p) => /(x?html|htm)$/i.test(p));
                    let combined = '';
                    for (const p of textFiles) {
                      const file = zip.file(p); if (!file) continue;
                      const html = await file.async('string');
                      const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
                      combined += ' ' + stripped;
                    }
                    setIdeoFreeText(combined);
                    // attempt to parse simple meta
                    try {
                      let opfPath;
                      const containerXml = await zip.file('META-INF/container.xml')?.async('string');
                      if (containerXml) {
                        const m = containerXml.match(/full-path="([^"]+)"/);
                        if (m) opfPath = m[1];
                      }
                      if (!opfPath) opfPath = Object.keys(zip.files).find((p) => /\.opf$/i.test(p));
                      const meta = { title: '', author: '', isbn: '' };
                      if (opfPath) {
                        const opf = await zip.file(opfPath)?.async('string');
                        if (opf) {
                          const titleMatch = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
                          const creatorMatch = opf.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
                          meta.title = titleMatch ? titleMatch[1].trim() : '';
                          meta.author = creatorMatch ? creatorMatch[1].trim() : '';
                          const ids = Array.from(opf.matchAll(/<dc:identifier[^>]*>([\s\S]*?)<\/dc:identifier>/gi)).map(m => m[1]);
                          const textBlob = ids.join(' ') + ' ' + opf;
                          const isbnCandidates = Array.from(textBlob.matchAll(/\b(?:97[89][-\s]?)?[0-9][-0-9\s]{8,}[0-9Xx]\b/g)).map(m => m[0]);
                          const normalized = isbnCandidates.map(s => s.replace(/[^0-9Xx]/g, ''));
                          const isbn13 = normalized.find(s => /^97[89][0-9]{10}$/.test(s));
                          const isbn10 = normalized.find(s => /^[0-9]{9}[0-9Xx]$/.test(s));
                          meta.isbn = isbn13 || isbn10 || '';
                        }
                      }
                      // Fallback title from file name if OPF missing
                      if (!meta.title && f.name) {
                        meta.title = f.name.replace(/\.[^.]+$/, '');
                      }
                      setEpubMeta(meta);
                    } catch {}
                  } catch {}
                }} />
                <textarea className="w-full min-h-[120px] p-2 bg-gray-800 text-white rounded" placeholder="Paste text here" value={ideoFreeText} onChange={(e) => setIdeoFreeText(e.target.value)} />
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 bg-neon-blue text-black rounded" onClick={() => setIdeoTextResult(analyzeTextLexical(ideoFreeText))} disabled={!ideoFreeText.trim()}>Analyze text</button>
                  {ideoTextResult && (
                    <button className="px-3 py-1 bg-gray-700 rounded" onClick={async () => {
                      const entry = {
                        id: (epubMeta?.isbn && epubMeta.isbn.trim()) || `${(epubMeta?.title || 'Untitled').trim()}|${(epubMeta?.author || '').trim()}`,
                        isbn: (epubMeta?.isbn || '').trim() || undefined,
                        title: (epubMeta?.title || 'EPUB/Text').trim(),
                        author: (epubMeta?.author || '').trim(),
                        source: 'text', method: 'lexical-v1', reliability: 0.4,
                        fileName: epubName || undefined,
                        createdAt: new Date().toISOString(),
                        metrics: ideoTextResult.metrics, axes: ideoTextResult.axes,
                        termHits: ideoTextResult.termHits, axisTermContribs: ideoTextResult.axisTermContribs,
                        metricTermContribs: ideoTextResult.metricTermContribs,
                      };
                      await persistScore(entry);
                      setIdeoScores(prev => [entry, ...prev]);
                    }}>Save score</button>
                  )}
                </div>
                {ideoTextResult && (
                  <div className="mt-2 border border-gray-700 rounded p-2 text-sm">
                    <div className="flex gap-3 flex-wrap mb-2">
                      <span>Politicalness: {(ideoTextResult.metrics.politicalness*100|0)}%</span>
                      <span>Ideologicalness: {(ideoTextResult.metrics.ideologicalness*100|0)}%</span>
                      <span>Educatedness: {(ideoTextResult.metrics.educatedness*100|0)}%</span>
                      <span>Religiousness: {(ideoTextResult.metrics.religiousness*100|0)}%</span>
                      <span>Romanticalness: {(ideoTextResult.metrics.romanticalness*100|0)}%</span>
                      <span>Sentiment: {(ideoTextResult.metrics.positivity*100|0)}%</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      econ_lr: {(ideoTextResult.axes.econ_lr*100|0)}% · cult_libcon: {(ideoTextResult.axes.cult_libcon*100|0)}% · auth_lib: {(ideoTextResult.axes.auth_lib*100|0)}% · global_local: {(ideoTextResult.axes.global_local*100|0)}% · tech_prog: {(ideoTextResult.axes.tech_prog*100|0)}% · epistemic_rat: {(ideoTextResult.axes.epistemic_rat*100|0)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Widget */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900/40">
                <h2 className="text-lg font-semibold mb-2">Widget</h2>
                <p className="text-sm text-gray-400 mb-2">Loaded books: {ideoBooks.length}</p>
                <IdeologramWidget
                  mode="both"
                  books={ideoBooks}
                  quizResponses={ideoQuiz}
                  anchors={SAMPLE_ANCHORS}
                  autoCompute={false}
                  onComplete={async (r) => {
                    try {
                      const axes = (r?.dimensions || []).reduce((acc, d) => { acc[d.key] = d.value; return acc; }, {});
                      const entry = {
                        id: Date.now().toString(),
                        title: 'Aggregate (books+quiz)',
                        author: '',
                        source: 'library', method: 'books+quiz', reliability: r?.confidence ?? 0.5,
                        createdAt: new Date().toISOString(),
                        metrics: { amplitude: r?.amplitude ?? 0, confidence: r?.confidence ?? 0 },
                        axes,
                      };
                      await persistScore(entry);
                      setIdeoScores(prev => [entry, ...prev]);
                    } catch {}
                  }}
                />
                <div className="mt-2">
                  <button className="px-3 py-1 bg-gray-700 rounded" onClick={async () => {
                    const r = computeIdeologram({ books: ideoBooks, anchors: SAMPLE_ANCHORS, quizResponses: ideoQuiz });
                    const axes = (r?.dimensions || []).reduce((acc, d) => { acc[d.key] = d.value; return acc; }, {});
                    const entry = {
                      id: Date.now().toString(),
                      title: 'Aggregate (headless)',
                      author: '',
                      source: 'library', method: 'books+quiz', reliability: r?.confidence ?? 0.5,
                      createdAt: new Date().toISOString(),
                      metrics: { amplitude: r?.amplitude ?? 0, confidence: r?.confidence ?? 0 },
                      axes,
                    };
                    await persistScore(entry);
                    setIdeoScores(prev => [entry, ...prev]);
                  }}>Compute (headless)</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      

      {/* Tooltip */}
      {hoverD && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPosition.x + 20}px`,
            top: `${tooltipPosition.y - 20}px`,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            zIndex: 9999,
            borderLeft: '3px solid rgba(57,255,20,0.8)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
            minWidth: '200px'
          }}
        >
          <div className="font-bold text-lg">{hoverD.properties.ADMIN}</div>
          {activeGlobeDataset === 'life-expectancy' && (
            <div className="text-sm text-gray-300">
              Life Expectancy:{' '}
              {lifeExpData
                .find(
                  (item) =>
                    item.entity.toLowerCase() ===
                    normalizeCountryName(hoverD.properties.ADMIN.toLowerCase())
                )
                ?.value?.toFixed(1) || 'N/A'}{' '}
              years
            </div>
          )}
          {activeGlobeDataset === 'population' && (
            <div className="text-sm text-gray-300">
              Population:{' '}
              {new Intl.NumberFormat().format(
                populationData?.find(
                  (item) =>
                    item.entity.toLowerCase() ===
                      normalizeCountryName(hoverD.properties.ADMIN.toLowerCase()) &&
                    item.year === selectedPopulationYear
                )?.value || 'N/A'
              )}
            </div>
          )}
          {activeGlobeDataset === 'NY.GDP.PCAP.PP.KD' && (
            <div className="text-sm text-gray-300">
              GDP per Capita:{' '}
              {(() => {
                let rec = gdpData?.find(
                  item => item.iso === hoverD.properties.ISO_A3 && item.year === selectedGdpYear
                );
                if (!rec) {
                  // fallback by normalized name
                  rec = gdpData?.find(
                    item => normalizeCountryName(item.entity) === normalizeCountryName(hoverD.properties.ADMIN) && item.year === selectedGdpYear
                  );
                }
                const val = rec?.value;
                return val != null
                  ? new Intl.NumberFormat().format(val)
                  : 'N/A';
              })()}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            Region: {hoverD.properties.REGION_WB || hoverD.properties.CONTINENT || 'N/A'}
          </div>
        </div>
      )}

      {/* Life Expectancy Controls */}
      {!showGraph && activeGlobeDataset === 'life-expectancy' && lifeExpYears.length > 0 && (
        <div
          id="life-expectancy-controls"
          className="fixed bottom-[25vh] left-1/2 transform -translate-x-1/2 z-50
            bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const onMouseMove = (moveEvent) => {
              const x = moveEvent.clientX - offsetX;
              const y = moveEvent.clientY - offsetY;
              el.style.position = 'fixed';
              el.style.top = `${y}px`;
              el.style.left = `${x}px`;
              el.style.bottom = 'auto';
              el.style.transform = 'none';
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          <button
            className="absolute top-1 right-1 text-neon-blue/50 hover:text-neon-blue"
            onClick={() => {
              const panel = document.querySelector('#life-expectancy-controls');
              if (panel) panel.style.display = 'none';
            }}
          >
            ✕
          </button>
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
            >
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neon-blue text-xs">
              Year: {selectedLifeExpYear}
            </span>
            <span className="text-neon-blue text-xs">Life Expectancy</span>
          </div>
          <input
            type="range"
            min={Math.min(...lifeExpYears)}
            max={Math.max(...lifeExpYears)}
            value={selectedLifeExpYear}
            onChange={(e) => setSelectedLifeExpYear(+e.target.value)}
            step="1"
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{Math.min(...lifeExpYears)}</span>
            <span>{Math.max(...lifeExpYears)}</span>
          </div>
        </div>
      )}

      {/* Population Controls */}
      {!showGraph && activeGlobeDataset === 'population' && populationYears.length > 0 && (
        <div
          id="population-controls"
          className="fixed bottom-[25vh] left-1/2 transform -translate-x-1/2 z-50
            bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const onMouseMove = (moveEvent) => {
              const x = moveEvent.clientX - offsetX;
              const y = moveEvent.clientY - offsetY;
              el.style.position = 'fixed';
              el.style.top = `${y}px`;
              el.style.left = `${x}px`;
              el.style.bottom = 'auto';
              el.style.transform = 'none';
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          <button
            className="absolute top-1 right-1 text-neon-blue/50 hover:text-neon-blue"
            onClick={() => {
              const panel = document.querySelector('#population-controls');
              if (panel) panel.style.display = 'none';
            }}
          >
            ✕
          </button>
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
            >
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neon-blue text-xs">Year: {selectedPopulationYear}</span>
            <span className="text-neon-blue text-xs">Population</span>
          </div>
          <input
            type="range"
            min={Math.min(...populationYears)}
            max={Math.max(...populationYears)}
            value={selectedPopulationYear}
            onChange={(e) => setSelectedPopulationYear(+e.target.value)}
            step="1"
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{Math.min(...populationYears)}</span>
            <span>{Math.max(...populationYears)}</span>
          </div>
        </div>
      )}

      {/* GDP per Capita Controls */}
      {!showGraph && activeGlobeDataset === 'NY.GDP.PCAP.PP.KD' && gdpYears.length > 0 && (
        <div
          id="gdp-controls"
          className="fixed bottom-[25vh] left-1/2 transform -translate-x-1/2 z-50
            bg-gray-900/80 backdrop-blur-md p-3 rounded-lg border border-neon-blue/30"
          style={{ width: '350px' }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const onMouseMove = (moveEvent) => {
              const x = moveEvent.clientX - offsetX;
              const y = moveEvent.clientY - offsetY;
              el.style.position = 'fixed';
              el.style.top = `${y}px`;
              el.style.left = `${x}px`;
              el.style.bottom = 'auto';
              el.style.transform = 'none';
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        >
          <button
            className="absolute top-1 right-1 text-neon-blue/50 hover:text-neon-blue"
            onClick={() => {
              const panel = document.querySelector('#gdp-controls');
              if (panel) panel.style.display = 'none';
            }}
          >
            ✕
          </button>
          <div className="mb-2">
            <label className="text-neon-blue text-xs block mb-1">Region/Country:</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-1 bg-gray-800 text-neon-blue border border-neon-blue/20 rounded text-xs"
            >
              {availableRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-neon-blue text-xs">Year: {selectedGdpYear}</span>
            <span className="text-neon-blue text-xs">GDP per Capita</span>
          </div>
          <input
            type="range"
            min={Math.min(...gdpYears)}
            max={Math.max(...gdpYears)}
            value={selectedGdpYear}
            onChange={(e) => setSelectedGdpYear(+e.target.value)}
            step="1"
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{Math.min(...gdpYears)}</span>
            <span>{Math.max(...gdpYears)}</span>
          </div>
        </div>
      )}

      {/* Globe Reset Button */}
      {!isGlobeReset && !showGraph && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handleResetGlobe}
            className="px-4 py-2 bg-gray-800/80 backdrop-blur-md text-neon-red
              border border-neon-red/30 rounded-lg hover:bg-gray-700/80 transition-colors
              flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 2v6h6"></path>
              <path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path>
            </svg>
            Reset Globe
          </button>
        </div>
      )}

      {/* BOTTOM HUD */}
      {mode !== 'chat' && mode !== 'settings' && mode !== 'ideologram' && !showFinancial && (
        <div
          style={{
            height: `${Math.min(dimensions.bottom, 15)}vh`,
            minHeight: '30px',
            left: !leftHidden ? `${sidebarWidths.left}vw` : '0',
            right: !rightHidden ? `${sidebarWidths.right}vw` : '0',
            margin: '0 5px',
            bottom: '5px'
          }}
          className={`fixed z-20 ${
            glowEnabled
              ? 'bg-gray-800/30 border-t border-neon-red/50'
              : 'bg-gray-900/50 border-t border-gray-600'
          } flex items-center justify-between px-4 backdrop-blur-lg rounded-lg transition-all duration-300`}
        >
          <div className="text-xs sm:text-sm md:text-xl flex flex-wrap gap-1 sm:gap-2 md:gap-8 p-1 sm:p-2">
            <span className="text-orange-900">⚠️ CRITICAL:</span>
            <span className="text-red-900">THERMAL</span>
            <span className="text-red-900">BIOSPHERE</span>
            <span className="text-red-900">RESOURCES</span>
          </div>
          <div className="flex space-x-4 ml-4">
            <button onClick={() => setMode('settings')} className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700">
              Settings
            </button>
            <button onClick={() => setShowFinancial(true)} className="px-2 py-1 bg-neon-blue text-black rounded hover:bg-neon-blue/80">
              Financial Mode
            </button>
          </div>
          <div
            className="resize-handle-vertical"
            style={{
              position: 'absolute',
              top: '-6px',
              left: 0,
              right: 0,
              height: '12px',
              cursor: 'ns-resize'
            }}
            onMouseDown={() => setIsResizing({ ...isResizing, bottom: true })}
          />
        </div>
      )}
      {/* LEFT SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full z-30 ${
          leftHidden ? '-translate-x-full' : 'translate-x-0'
        } backdrop-blur-lg rounded-r-lg`}
        style={{
          width: `${sidebarWidths.left}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.left ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full flex flex-col" style={{ userSelect: isResizing.left ? 'none' : 'auto' }}>
          {!leftHidden && (
            <>
              {/* Left Sidebar Header */}
              <div
                className="flex justify-between items-center p-2"
                style={{
                  background: glowEnabled
                    ? 'linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent)'
                    : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled
                    ? '1px solid rgba(0, 230, 255, 0.3)'
                    : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setHamburgerOpen(open => !open)}
                    className="p-1 text-white hover:text-neon-blue"
                    aria-label="Menu"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {(warRoomMode || showFinancial || mode === 'financial') && (
                    <button
                      onClick={() => { setMode('home'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
                      className="p-1 text-white hover:text-neon-blue"
                      aria-label="Home"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9z" />
                      </svg>
                    </button>
                  )}
                  {mode === 'home' ? (
                    <button
                      onClick={() => setMode('chat')}
                      className="p-1 text-white hover:text-neon-blue"
                      aria-label="Chat"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.8-4.2A8.963 8.963 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => setMode('home')}
                      className="p-1 text-white hover:text-neon-blue"
                      aria-label="Home"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a1 1 0 01-1 1h-5v-6h-6v6H4a 1 1 0 01-1-1V9z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setLeftHidden(true)}
                    className="p-1 text-gray-400 hover:text-white"
                    aria-label="Collapse sidebar"
                  >
                    <span className="text-xl">‹</span>
                  </button>
                </div>
                <button
                  onClick={() => setLeftHidden(true)}
                  className="p-1 text-gray-400 hover:text-white"
                  aria-label="Collapse sidebar"
                >
                  <span className="text-xl">‹</span>
                </button>
              </div>
              {/* Hamburger Dropdown */}
              {hamburgerOpen && (
                <div className="absolute top-12 left-2 bg-gray-800 rounded shadow-lg z-40 w-36">
                  <button
                    onClick={() => { setHamburgerOpen(false); setMode('settings'); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Account
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setMode('chat'); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setShowSettings(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Other Settings
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setMode('ideologram'); setShowFinancial(false); setShowGraph(false); setWarRoomMode(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Ideologram
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setShowFinancial(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    Financial Mode
                  </button>
                  <button
                    onClick={() => { setHamburgerOpen(false); setWarRoomMode(v => !v); }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                  >
                    {warRoomMode ? 'Exit War Room' : 'War Room'}
                  </button>
                </div>
              )}
              {/* Sidebar content */}
              {mode === 'chat' ? (
                <div className="flex-1 overflow-y-auto">
                  <h3 className="text-sm font-bold text-neon-blue mb-2">Past Conversations</h3>
                  <button onClick={handleNewChat} className="mb-2 p-2 bg-neon-blue rounded text-black">New Chat</button>
                  <ul className="overflow-y-auto flex-1">
                    {chatHistory.map(c => (
                      <li key={c.id}>
                        <button
                          className="w-full text-left text-white hover:text-neon-blue py-1"
                          onClick={() => openConversation(c.id)}
                        >{c.id}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div ref={leftSidebarContentRef} className="flex-1 overflow-y-auto relative flex flex-col">
                  {mode !== 'ideologram' && renderDatasetSelector()}
                  {/* Unified Dataset/Country Search */}
                  {mode !== 'ideologram' && (
                  <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
                    <h3 className="text-sm font-bold text-neon-blue mb-2">Dataset Search</h3>
                    <div className="flex mb-2">
                      <input
                        className="flex-1 p-2 rounded bg-gray-800 text-white"
                        placeholder="Type category like GDP or Country/Region"
                        value={datasetQuery}
                        onChange={e => setDatasetQuery(e.target.value)}
                      />
                      <button
                        onClick={handleSearch}
                        className="ml-2 px-3 py-1 bg-neon-blue rounded text-black"
                      >Go</button>
                    </div>
                    {datasetSearchResults.length > 0 ? (
                      <ul className="max-h-32 overflow-auto text-sm text-white">
                        {datasetSearchResults.map(ind => (
                          <li key={ind.id} className="flex justify-between items-center py-1 border-b border-gray-700">
                            <span>{ind.name}</span>
                            <button className="ml-2 px-2 py-1 bg-neon-blue rounded text-black text-xs" onClick={() => handleProcessDataset(ind.id)}>
                              Process Dataset
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : countryList.length > 0 ? (
                      <ul className="max-h-32 overflow-auto text-sm text-white">
                        {countryList.map(c => (
                          <li key={c.id} className="flex justify-between items-center py-1 border-b border-gray-700">
                            <span>{c.name}</span>
                            <button className="ml-2 px-2 py-1 bg-neon-purple rounded text-black text-xs" onClick={() => setSelectedRegion(c.id)}>
                              Select
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  )}
                  {mode === 'ideologram' && (
                    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Ideologram Files</h3>
                      <button className="mb-2 px-2 py-1 bg-gray-700 rounded" onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          if (token && token !== 'DUMMY_TOKEN') {
                            const res = await API.get('/api/ideologram/fs');
                            setFileTree(res.data || null);
                          } else {
                            const lib = localStorage.getItem('ideologram:library');
                            const enr = localStorage.getItem('ideologram:enriched');
                            const sc = localStorage.getItem('ideologram:scores:v1');
                            function sz(s){return s? s.length:0}
                            const tree = { name: (user && user.email) || 'local', type: 'dir', children: [
                              { name: 'library.json', type: 'file', updatedAt: JSON.parse(lib||'{}').updatedAt || null, size: sz(lib) },
                              { name: 'enriched.json', type: 'file', updatedAt: JSON.parse(enr||'{}').updatedAt || null, size: sz(enr) },
                              { name: 'scores.json', type: 'file', updatedAt: JSON.parse(sc||'{}').updatedAt || null, size: sz(sc) },
                            ]};
                            setFileTree(tree);
                          }
                        } catch {}
                      }}>Refresh</button>
                      <div className="text-gray-300" style={{ maxHeight: 160, overflow: 'auto' }}>
                        {renderFileTreeList()}
                      </div>
                    </div>
                  )}
                  {mode === 'ideologram' && (
                    <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 mb-4">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Saved Scores</h3>
                      <button className="mb-2 px-2 py-1 bg-gray-700 rounded" onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          if (token && token !== 'DUMMY_TOKEN') {
                            const res = await API.get('/api/ideologram/scores');
                            setIdeoScores(Array.isArray(res.data?.entries) ? res.data.entries : []);
                          } else {
                            const raw = localStorage.getItem('ideologram:scores:v1');
                            const db = raw ? JSON.parse(raw) : { entries: [] };
                            setIdeoScores(Array.isArray(db.entries) ? db.entries : []);
                          }
                        } catch {}
                      }}>Reload</button>
                      <div className="text-xs text-gray-300" style={{ maxHeight: 160, overflow: 'auto' }}>
                        {ideoScores.length === 0 ? (
                          <div className="text-gray-500">No saved entries</div>
                        ) : (
                          <ul className="list-none m-0 p-0">
                            {ideoScores.slice().reverse().map((e, i) => (
                              <li key={i} className="py-1 border-b border-gray-800">
                                <div className="flex gap-2 items-baseline flex-wrap">
                                  <strong>{e.title || 'Untitled'}</strong>
                                  {e.author && <span className="text-gray-400">by {e.author}</span>}
                                  <span className="ml-auto text-gray-400 text-[10px]">{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <div className="text-[11px] text-gray-300">
                                  Politicalness: {Math.round((e.metrics?.politicalness||0)*100)}% · econ_lr: {Math.round((e.axes?.econ_lr||0)*100)}%
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Year slider for globe data */}
                  {activeGlobeDataset === 'population' && populationYears.length > 0 && (
                    <div id="population-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Population Year</h3>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={Math.min(...populationYears)}
                          max={Math.max(...populationYears)}
                          value={selectedPopulationYear}
                          onChange={(e) => setSelectedPopulationYear(+e.target.value)}
                        />
                        <span className="ml-2 text-neon-blue">{selectedPopulationYear}</span>
                      </div>
                    </div>
                  )}
                  {activeGlobeDataset === 'life-expectancy' && lifeExpYears.length > 0 && (
                    <div id="life-expectancy-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">Life Exp. Year</h3>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={Math.min(...lifeExpYears)}
                          max={Math.max(...lifeExpYears)}
                          value={selectedLifeExpYear}
                          onChange={(e) => setSelectedLifeExpYear(+e.target.value)}
                        />
                        <span className="ml-2 text-neon-blue">{selectedLifeExpYear}</span>
                      </div>
                    </div>
                  )}
                  {activeGlobeDataset === 'NY.GDP.PCAP.PP.KD' && gdpYears.length > 0 && (
                    <div id="gdp-controls" className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
                      <h3 className="text-sm font-bold text-neon-blue mb-2">GDP Year</h3>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={Math.min(...gdpYears)}
                          max={Math.max(...gdpYears)}
                          value={selectedGdpYear}
                          onChange={(e) => setSelectedGdpYear(+e.target.value)}
                        />
                        <span className="ml-2 text-neon-blue">{selectedGdpYear}</span>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 transition-all">
                    <p className="text-lg">
                      Dominant Species: <br />
                      <span className="text-2xl font-bold text-blue-900">Homo Sapiens</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xl font-bold text-gray-400">System Stats</h4>
                    <p className="text-lg">Age of Civilization: <span className="font-bold">{civAge}×10³y</span></p>
                    <p className="text-lg">Population: <span className="font-bold">8×10⁹</span></p>
                    <input
                      type="range"
                      min={0}
                      max={20000}
                      value={civAge}
                      onChange={(e) => setCivAge(+e.target.value)}
                      className="w-full h-2 bg-gray-700 rounded-lg mt-2"
                    />
                    <span className="text-sm text-neon-blue">Year: {civAge}</span>
                  </div>
                  {isLoggedIn && (
                    <button
                      onClick={() => setWarRoomMode(v => !v)}
                      className="w-full mt-4 p-2 bg-red-600 text-white rounded hover:bg-red-500"
                    >
                      {warRoomMode ? 'Exit War Room' : 'War Room'}
                    </button>
                  )}
                  {isLoggedIn && (
                    <button
                      onClick={() => { setShowFinancial(true); setHamburgerOpen(false); }}
                      className="w-full mt-2 p-2 bg-neon-blue text-black rounded hover:bg-neon-blue/80"
                    >
                      Financial Mode
                    </button>
                  )}
                  {/* Mini Chat (visible for all modes except 'chat') - at bottom by default (sticky), draggable when grabbed */}
                  <div
                    ref={miniChatRef}
                    className={`${miniDrag.floating ? 'z-50' : 'sticky bottom-2'} p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 m-2`}
                    style={miniDrag.floating ? { position: 'absolute', left: miniDrag.x, top: miniDrag.y, right: 'auto' } : undefined}
                  >
                    <div className="flex items-center justify-between mb-2 cursor-move select-none" onMouseDown={startMiniDrag}>
                      <h3 className="text-sm font-bold text-neon-blue">Mini Chat</h3>
                      <button
                        onClick={() => setMode('chat')}
                        className="text-xs text-neon-blue hover:underline"
                      >Open</button>
                    </div>
                    {!hasKey ? (
                      <div className="space-y-2">
                        <input
                          type="password"
                          className="w-full p-2 rounded bg-gray-800 text-white"
                          placeholder="Enter OpenAI API Key"
                          value={miniKeyInput}
                          onChange={(e) => setMiniKeyInput(e.target.value)}
                        />
                        <button
                          onClick={saveMiniKey}
                          className="w-full px-3 py-1 bg-neon-blue text-black rounded"
                        >Save Key</button>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-1 mb-2 max-h-24 overflow-auto text-xs">
                          {currentConversation.slice(-3).map((m, i) => (
                            <li key={i} className="flex">
                              <span className="mr-1 text-gray-400">{m.role === 'assistant' ? 'AI:' : 'You:'}</span>
                              <span className="truncate">{m.content}</span>
                            </li>
                          ))}
                          {currentConversation.length === 0 && (
                            <li className="text-gray-400 text-xs">Start the conversation...</li>
                          )}
                        </ul>
                        <div className="flex">
                          <input
                            className="flex-1 p-1 rounded-l bg-gray-800 text-white border border-gray-700"
                            value={miniInput}
                            onChange={(e) => setMiniInput(e.target.value)}
                            placeholder="Ask..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && miniInput.trim()) {
                                handleChatSend(miniInput.trim());
                                setMiniInput('');
                              }
                            }}
                          />
                          <button
                            className="px-2 bg-neon-blue text-black rounded-r disabled:opacity-50"
                            disabled={!miniInput.trim()}
                            onClick={() => {
                              if (!miniInput.trim()) return;
                              handleChatSend(miniInput.trim());
                              setMiniInput('');
                            }}
                          >Send</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Resize handle for left sidebar */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{ transform: 'translateX(50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing((prev) => ({ ...prev, left: true }));
                }}
              />
            </>
          )}
          {/* Resize handle for left sidebar */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
            style={{ transform: 'translateX(50%)' }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing((prev) => ({ ...prev, left: true }));
            }}
          />
        </div>
      </div>
      {leftHidden && (
        <button
          onClick={() => setLeftHidden(false)}
          className="fixed left-1 top-1/2 -translate-y-1/2 bg-gray-800/90 p-2 sm:p-3
            rounded-r-md shadow-lg hover:bg-gray-700 transition-colors z-40
            border border-neon-blue/30"
        >
          &gt;
        </button>
      )}

      {/* RIGHT SIDEBAR */}
      <div
        className={`fixed top-0 right-0 h-full z-30 ${
          rightHidden ? 'translate-x-full' : 'translate-x-0'
        } backdrop-blur-lg rounded-l-lg`}
        style={{
          width: `${sidebarWidths.right}vw`,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          transition: isResizing.right ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <div className="relative h-full flex flex-col" style={{ userSelect: isResizing.right ? 'none' : 'auto' }}>
          {!rightHidden && (
            <>
              {/* Right Sidebar Header */}
              <div
                className="flex justify-between items-center cursor-pointer p-2"
                onClick={() => setRightHidden(true)}
                style={{
                  background: glowEnabled
                    ? 'linear-gradient(to left, rgba(0, 0, 0, 0.5), transparent)'
                    : 'rgba(0, 0, 0, 0.3)',
                  borderBottom: glowEnabled
                    ? '1px solid rgba(0, 230, 255, 0.3)'
                    : '1px solid rgba(128, 128, 128, 0.3)'
                }}
              >
                <h2 className={`text-2xl font-bold ${glowEnabled ? 'text-white glow-text' : 'text-gray-400'}`}>
                  {mode === 'ideologram' ? 'Ideologram' : 'MISSION CONTROL'}
                </h2>
                <span className={`text-xl ${glowEnabled ? 'text-neon-blue glow-text' : 'text-gray-400'}`}>
                  –
                </span>
              </div>
              <div className="p-6 space-y-6">
                {[
                  { label: 'I. Quantum Gravity Theory', color: 'neon-purple', progress: 40 },
                  { label: 'II. Genomic Decryption', color: 'neon-orange', progress: 65 },
                  { label: 'III. Fusion Ignition', color: 'neon-red', progress: 80 },
                  { label: 'IV. Neural Singularity', color: 'neon-green', progress: 25 },
                ].map((quest, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.2 }}
                    className={`group relative p-4 rounded-lg border transition-all ${
                      glowEnabled
                        ? 'border-neon-purple/20 hover:border-neon-purple/50'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <p className={`text-lg ${glowEnabled ? 'text-neon-blue' : 'text-blue-900'}`}>
                      <span className={`${glowEnabled ? 'glow-text' : ''}`}>
                        {quest.label}
                      </span>
                    </p>
                    <div className="h-1 bg-gray-700 rounded-full">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          glowEnabled ? `bg-gradient-to-r from-${quest.color}` : 'bg-gray-500'
                        }`}
                        style={{ width: `${quest.progress}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="text-xl font-bold text-gray-400">TECHNOLOGY</h4>
                {/* Example bars */}
                <div>
                  <p className={`${glowEnabled ? 'text-neon-purple' : 'text-gray-400'} text-lg mb-2`}>
                    Kardashev Type: 0.4
                  </p>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        glowEnabled
                          ? 'bg-gradient-to-r from-neon-purple to-purple-800'
                          : 'bg-gray-500'
                      }`}
                      style={{ width: '40%' }}
                    />
                  </div>
                </div>
                <div>
                  <p className={`${glowEnabled ? 'text-neon-red' : 'text-gray-400'} text-lg mb-2`}>
                    Energy: 49GW/day
                  </p>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        glowEnabled
                          ? 'bg-gradient-to-r from-neon-red to-red-800'
                          : 'bg-gray-500'
                      }`}
                      style={{ width: '65%' }}
                    />
                  </div>
                </div>
              </motion.div>
              {/* Resize handle for right sidebar */}
              <div
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-neon-blue/30 z-50"
                style={{ transform: 'translateX(-50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing((prev) => ({ ...prev, right: true }));
                }}
              />
            </>
          )}
          {!rightHidden && <ScannerEffect show={showScanner} glowIntensity={glowIntensity} />}
        </div>
      </div>
      {rightHidden && (
        <button
          onClick={() => setRightHidden(false)}
          className="fixed right-1 top-1/2 -translate-y-1/2 bg-gray-800/90 p-2 sm:p-3
            rounded-l-md shadow-lg hover:bg-gray-700 transition-colors z-40
            border border-neon-blue/30"
        >
          &lt;
        </button>
      )}

      {/* Glow overlay */}
      <GlowOverlay enabled={glowEnabled} />

      {/* Settings Gear */}
      <div className="fixed top-4 right-4 z-[9999]">
        <motion.button
          onClick={() => setShowSettings(!showSettings)}
          onMouseEnter={() => setSettingsHoverCount(c => c + 1)}
          className={`p-1 rounded-full hover:bg-gray-900/20 backdrop-blur-lg transition-all ${
            glowEnabled ? '' : 'text-gray-400'
          }`}
          title={settingsHoverCount < 3 ? 'Change FPS + Other Settings' : 'Settings'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke={glowEnabled ? '#00f3ff' : '#94a3b8'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 
                     2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 
                     1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 
                     2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4
                     a1.65 1.65 0 0 0-1.82.33l-.06.06
                     a2 2 0 0 1-2.83 0 
                     2 2 0 0 1 0-2.83l.06-.06
                     a1.65 1.65 0 0 0 .33-1.82
                     1.65 1.65 0 0 0-1.51-1H3
                     a2 2 0 0 1-2-2
                     2 2 0 0 1 2-2h.09
                     A1.65 1.65 0 0 0 4.6 9
                     a1.65 1.65 0 0 0-.33-1.82l-.06-.06
                     a2 2 0 0 1 0-2.83
                     2 2 0 0 1 2.83 0l.06.06
                     a1.65 1.65 0 0 0 1.82.33H9
                     a1.65 1.65 0 0 0 1-1.51V3
                     a2 2 0 0 1 2-2
                     2 2 0 0 1 2 2v.09
                     a1.65 1.65 0 0 0 1 1.51
                     1.65 1.65 0 0 0 1.82-.33l.06-.06
                     a2 2 0 0 1 2.83 0
                     2 2 0 0 1 0 2.83l-.06.06
                     a1.65 1.65 0 0 0-.33 1.82V9
                     a1.65 1.65 0 0 0 1.51 1H21
                     a2 2 0 0 1 2 2
                     2 2 0 0 1-2 2h-.09
                     a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>
        </motion.button>

        {showSettings && (
          <Portal>
            <div
              className={`fixed top-[3.5rem] right-4 w-64 max-w-[90vw] ${
                glowEnabled ? 'border border-neon-blue/50' : 'border border-gray-600'
              } bg-gray-900/95 rounded-lg shadow-2xl backdrop-blur-xl p-4 z-[99999]`}
              style={{ maxHeight: '80vh', overflowY: 'auto' }}
            >
              {/* Login status */}
              <div className="mb-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {/* User Avatar */}
                  {user && userAvatarUrl && (
                    <div className="relative">
                      <img 
                        src={userAvatarUrl} 
                        alt="User Avatar" 
                        className="w-10 h-10 rounded-full border-2 border-neon-blue/50"
                      />
                      {/* Worldview Assessment Score Badge */}
                      {mode === 'ideologram' && assessmentHistory.length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full border-2 border-white shadow-lg">
                          {(() => {
                            const weightedScores = computeWeightedAverage(assessmentHistory);
                            if (weightedScores && Object.keys(weightedScores).length > 0) {
                              const avgScore = Object.values(weightedScores).reduce((sum, data) => sum + data.score, 0) / Object.keys(weightedScores).length;
                              return `${Math.round(avgScore * 100)}%`;
                            }
                            return 'N/A';
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-white">
                      {user ? `Signed in as ${user.email}` : 'Not signed in'}
                    </span>
                    {/* Worldview Assessment Summary */}
                    {mode === 'ideologram' && assessmentHistory.length > 0 && (
                      <div className="text-xs text-gray-300 mt-1">
                        {(() => {
                          const weightedScores = computeWeightedAverage(assessmentHistory);
                          if (weightedScores && Object.keys(weightedScores).length > 0) {
                            const dimensions = Object.keys(weightedScores).length;
                            const lastAssessment = Math.max(...Object.values(weightedScores).map(data => new Date(data.lastAssessment).getTime()));
                            return `${dimensions} dimensions • Last: ${new Date(lastAssessment).toLocaleDateString()}`;
                          }
                          return 'No assessments yet';
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                {user && (
                  <button onClick={logout} className="px-2 py-1 bg-red-600 text-white rounded">
                    Logout
                  </button>
                )}
                {!user && (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={loginWithGoogle}
                      className="px-2 py-1 bg-neon-blue text-black rounded"
                    >
                      Continue with Google
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-2 py-1 bg-neon-purple text-black rounded"
                    >
                      Login with Email
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {/* Glow Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Glow Effects</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={glowEnabled}
                      onChange={(e) => setGlowEnabled(e.target.checked)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                {/* Update FPS */}
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Update Rate</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUpdateFPS(1)}
                      className={`flex-1 p-2 rounded-lg ${
                        updateFPS === 1 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      1 FPS
                    </button>
                    <button
                      onClick={() => setUpdateFPS(24)}
                      className={`flex-1 p-2 rounded-lg ${
                        updateFPS === 24 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      24 FPS
                    </button>
                    <button
                      onClick={() => setUpdateFPS(60)}
                      className={`flex-1 p-2 rounded-lg ${
                        updateFPS === 60 ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      60 FPS
                    </button>
                  </div>
                </div>
                {/* Scanner & Particles */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Scanner Effect</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showScanner}
                      onChange={(e) => setShowScanner(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Particles</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showParticles}
                      onChange={(e) => setShowParticles(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Particles Density</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={particlesOpacity}
                    onChange={(e) => setParticlesOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-neon-purple">{Math.round(particlesOpacity * 100)}%</span>
                </div>
                {/* Rotation & CPU */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Auto Rotation</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rotationEnabled}
                      onChange={(e) => setRotationEnabled(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">CPU Monitor</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={enableCpuMonitor}
                      onChange={(e) => setEnableCpuMonitor(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                {enableCpuMonitor && (
                  <div className="text-xs text-neon-purple">
                    System Load: {cpuUsage.toFixed(1)}%
                  </div>
                )}
                {/* Globe */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Visibility</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showGlobe}
                      onChange={(e) => setShowGlobe(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Power Save Mode</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={lowPowerMode}
                      onChange={(e) => setLowPowerMode(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Texture</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showGlobeTexture}
                      onChange={(e) => setShowGlobeTexture(e.target.checked)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Globe Opacity</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globeOpacity > 0.5}
                      onChange={(e) => setGlobeOpacity(e.target.checked ? 1 : 0.5)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-neon-blue block">Globe Material</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMaterialType('phong')}
                      className={`flex-1 p-2 rounded-lg ${
                        materialType === 'phong' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      Phong
                    </button>
                    <button
                      onClick={() => setMaterialType('lambert')}
                      className={`flex-1 p-2 rounded-lg ${
                        materialType === 'lambert' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      Lambert
                    </button>
                    <button
                      onClick={() => setMaterialType('basic')}
                      className={`flex-1 p-2 rounded-lg ${
                        materialType === 'basic' ? 'bg-neon-red/20 text-neon-red' : 'bg-gray-800/40 text-gray-300'
                      }`}
                    >
                      Basic
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Lat/Lon Grid</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showGraticules}
                      onChange={(e) => setShowGraticules(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neon-blue">Atmosphere Glow</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showAtmosphere}
                      onChange={(e) => setShowAtmosphere(e.target.checked)}
                      disabled={lowPowerMode}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* Enrichment Detail Modal */}
        {enrichmentDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold">
                  Enrichment Details: {enrichmentDetail.book.title}
                  {enrichmentDetail.book.author && ` by ${enrichmentDetail.book.author}`}
                </h3>
                <button 
                  onClick={() => setEnrichmentDetail(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                {/* Debug: Show raw data structure */}
                <div className="mb-4 p-3 bg-gray-800 rounded text-xs">
                  <div className="text-yellow-400 font-semibold mb-2">🔍 Debug: Raw Data Structure</div>
                  <pre className="text-gray-300 overflow-auto max-h-32">
                    {JSON.stringify(enrichmentDetail.currentInfo, null, 2)}
                  </pre>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Open Library Column */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-blue-400 border-b border-blue-600 pb-2">
                      📚 Open Library Data
                    </h4>
                    <div className="space-y-3">
                      {enrichmentDetail.currentInfo.meta?.openLibrary ? (
                        <>
                          {enrichmentDetail.currentInfo.meta.openLibrary.sources?.openLibrary?.workKey && (
                            <div className="text-sm">
                              <div className="text-gray-400">Work Key:</div>
                              <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                                {enrichmentDetail.currentInfo.meta.openLibrary.sources.openLibrary.workKey}
                              </div>
                            </div>
                          )}
                          
                          {enrichmentDetail.currentInfo.meta.openLibrary.sources?.openLibrary?.editionKey && (
                            <div className="text-sm">
                              <div className="text-gray-400">Edition Key:</div>
                              <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                                {enrichmentDetail.currentInfo.meta.openLibrary.sources.openLibrary.editionKey}
                              </div>
                            </div>
                          )}
                          
                          {Array.isArray(enrichmentDetail.currentInfo.meta.openLibrary.subjects) && enrichmentDetail.currentInfo.meta.openLibrary.subjects.length > 0 && (
                            <div className="text-sm">
                              <div className="text-gray-400">Subjects ({enrichmentDetail.currentInfo.meta.openLibrary.subjects.length}):</div>
                              <div className="flex flex-wrap gap-1">
                                {enrichmentDetail.currentInfo.meta.openLibrary.subjects.map((subject, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">
                                    {subject}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {enrichmentDetail.currentInfo.meta.openLibrary.classifications && (
                            <div className="text-sm">
                              <div className="text-gray-400">Classifications:</div>
                              <div className="space-y-1">
                                {enrichmentDetail.currentInfo.meta.openLibrary.classifications.lcc && (
                                  <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                                    LCC: {enrichmentDetail.currentInfo.meta.openLibrary.classifications.lcc}
                                  </div>
                                )}
                                {enrichmentDetail.currentInfo.meta.openLibrary.classifications.ddc && (
                                  <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                                    DDC: {enrichmentDetail.currentInfo.meta.openLibrary.classifications.ddc}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {enrichmentDetail.currentInfo.meta.openLibrary.isFictionInferred !== undefined && (
                            <div className="text-sm">
                              <div className="text-gray-400">Fiction Classification:</div>
                              <div className={`px-2 py-1 rounded text-xs ${enrichmentDetail.currentInfo.meta.openLibrary.isFictionInferred ? 'bg-purple-900 text-purple-200' : 'bg-green-900 text-green-200'}`}>
                                {enrichmentDetail.currentInfo.meta.openLibrary.isFictionInferred ? 'Fiction' : 'Non-fiction'}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">No Open Library data available</div>
                      )}
                    </div>
                  </div>

                  {/* Wikidata Column */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-green-400 border-b border-green-600 pb-2">
                      🌐 Wikidata Data
                    </h4>
                    <div className="space-y-3">
                      {enrichmentDetail.currentInfo.meta?.sources?.wikidata && (
                        <div className="text-sm">
                          <div className="text-gray-400">QID:</div>
                          <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                            {enrichmentDetail.currentInfo.meta.sources.wikidata.qid || 'N/A'}
                          </div>
                        </div>
                      )}
                      
                      {Array.isArray(enrichmentDetail.currentInfo.meta?.mainSubjects) && enrichmentDetail.currentInfo.meta.mainSubjects.length > 0 && (
                        <div className="text-sm">
                          <div className="text-gray-400">Main Subjects:</div>
                          <div className="flex flex-wrap gap-1">
                            {enrichmentDetail.currentInfo.meta.mainSubjects.map((subject, i) => (
                              <span key={i} className="px-2 py-1 bg-green-900 text-green-200 rounded text-xs">
                                {subject}
                              </span>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      {Array.isArray(enrichmentDetail.currentInfo.meta?.genres) && enrichmentDetail.currentInfo.meta.genres.length > 0 && (
                        <div className="text-sm">
                          <div className="text-gray-400">Genres:</div>
                          <div className="flex flex-wrap gap-1">
                            {enrichmentDetail.currentInfo.meta.genres.map((genre, i) => (
                              <span key={i} className="px-2 py-1 bg-green-700 text-green-200 rounded text-xs">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {Array.isArray(enrichmentDetail.currentInfo.meta?.instanceOf) && enrichmentDetail.currentInfo.meta.instanceOf.length > 0 && (
                        <div className="text-sm">
                          <div className="text-gray-400">Instance Of:</div>
                          <div className="flex flex-wrap gap-1">
                            {enrichmentDetail.currentInfo.meta.instanceOf.map((instance, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-700 text-gray-200 rounded text-xs">
                                {instance}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Enrichment Results */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h4 className="text-md font-semibold text-yellow-400 mb-3">📊 Enhanced Enrichment Results</h4>
                  
                  {/* Combined Topics */}
                  {enrichmentDetail.currentInfo.topics && enrichmentDetail.currentInfo.topics.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-300 mb-2">Combined Topics ({enrichmentDetail.currentInfo.topics.length}):</div>
                      <div className="flex flex-wrap gap-1">
                        {enrichmentDetail.currentInfo.topics.map((topic, i) => (
                          <span key={i} className="px-2 py-1 bg-yellow-900 text-yellow-200 rounded text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Enrichment Quality */}
                  {enrichmentDetail.currentInfo.enrichmentQuality && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-300 mb-2">Enrichment Quality:</div>
                      <div className="flex gap-4 text-xs">
                        <span className={`px-2 py-1 rounded ${enrichmentDetail.currentInfo.enrichmentQuality.openLibrary ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                          Open Library: {enrichmentDetail.currentInfo.enrichmentQuality.openLibrary ? '✓' : '✗'}
                        </span>
                        <span className={`px-2 py-1 rounded ${enrichmentDetail.currentInfo.enrichmentQuality.wikidata ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                          Wikidata: {enrichmentDetail.currentInfo.enrichmentQuality.wikidata ? '✓' : '✗'}
                        </span>
                        <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded">
                          Total Topics: {enrichmentDetail.currentInfo.enrichmentQuality.totalTopics}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Debug: Show axes data structure */}
                  <div className="mb-4 p-2 bg-gray-800 rounded text-xs">
                    <div className="text-yellow-400 font-semibold mb-1">🔍 Axes Debug:</div>
                    <div className="text-gray-300">
                      Axes object: {JSON.stringify(enrichmentDetail.currentInfo.axes)}
                    </div>
                    <div className="text-gray-300">
                      Axes type: {typeof enrichmentDetail.currentInfo.axes}
                    </div>
                    <div className="text-gray-300">
                      Axes keys: {enrichmentDetail.currentInfo.axes ? Object.keys(enrichmentDetail.currentInfo.axes).join(', ') : 'none'}
                    </div>
                  </div>
                  
                  {/* Computed Axes */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-300 mb-2">Computed Axes:</div>
                    {enrichmentDetail.currentInfo.axes && Object.keys(enrichmentDetail.currentInfo.axes).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(enrichmentDetail.currentInfo.axes).map(([axis, value]) => (
                          <div key={axis} className="text-sm">
                            <div className="text-gray-400 capitalize">{axis.replace(/_/g, ' ')}:</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${value > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.abs(value) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono w-12 text-right">
                                {Math.round(value * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400">No axes computed yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Comprehensive Worldview Assessment Modal */}
        {worldviewQuizOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold">🌍 Comprehensive Worldview Assessment</h3>
                <button 
                  onClick={() => setWorldviewQuizOpen(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                <div className="mb-6">
                  <p className="text-gray-300 mb-4">
                    This assessment evaluates your worldview across multiple dimensions including economic literacy, 
                    philosophical sophistication, scientific understanding, psychological insight, and historical perspective.
                  </p>
                  
                  {/* Current Assessment Results */}
                  <div className="mb-6 p-4 bg-gray-800 rounded">
                    <h4 className="text-md font-semibold text-yellow-400 mb-3">📊 Current Assessment Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(computeWorldviewScore(ideoBooks, worldviewResponses, userCredentials, selfAssessment)).map(([dimension, data]) => (
                        <div key={dimension} className="p-3 bg-gray-700 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold capitalize">{dimension.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-gray-400">Confidence: {Math.round(data.overallConfidence * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                            <div 
                              className={`h-2 rounded-full ${data.score >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.abs(data.score) * 100 / 2}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-300">
                            Score: {Math.round(data.score * 100)}% • Sources: {data.sources.length}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Assessment Metadata */}
                    {currentAssessment && (
                      <div className="mt-4 p-3 bg-gray-700 rounded">
                        <h5 className="text-sm font-semibold text-blue-400 mb-2">Assessment Quality Metrics</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">Vector Resolution:</span>
                            <div className="font-mono">{currentAssessment.metadata.vectorResolution} dimensions</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Total Data Points:</span>
                            <div className="font-mono">{currentAssessment.metadata.totalDataPoints}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Avg Confidence:</span>
                            <div className="font-mono">{Math.round(currentAssessment.metadata.averageConfidence * 100)}%</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Reliability:</span>
                            <div className="font-mono">{Math.round(currentAssessment.metadata.reliabilityScore * 100)}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Assessment History */}
                  {assessmentHistory.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-800 rounded">
                      <h4 className="text-md font-semibold text-green-400 mb-3">📈 Assessment History & Weighted Averages</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(computeWeightedAverage(assessmentHistory) || {}).map(([dimension, data]) => (
                          <div key={dimension} className="p-3 bg-gray-700 rounded">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold capitalize">{dimension.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-gray-400">Weighted Avg</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                              <div 
                                className={`h-2 rounded-full ${data.score >= 0 ? 'bg-green-500' : 'bg-orange-500'}`}
                                style={{ width: `${Math.abs(data.score) * 100 / 2}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-300">
                              Score: {Math.round(data.score * 100)}% • {data.assessmentCount} assessments
                            </div>
                            <div className="text-xs text-gray-500">
                              Last: {new Date(data.lastAssessment).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Quiz Questions */}
                <div className="space-y-6">
                  {worldviewQuiz.map((question) => (
                    <div key={question.id} className="p-4 bg-gray-800 rounded">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-blue-400 capitalize">{question.category.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-gray-400">Weight: {question.weight}</span>
                        </div>
                        <h4 className="text-sm font-medium">{question.question}</h4>
                      </div>
                      
                      {question.type === 'scale' ? (
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <label key={index} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={question.id}
                                value={index}
                                checked={worldviewResponses[question.id] === index}
                                onChange={(e) => setWorldviewResponses(prev => ({ ...prev, [question.id]: parseInt(e.target.value) }))}
                                className="text-blue-500"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : question.type === 'text' ? (
                        <input
                          type="text"
                          placeholder={question.placeholder}
                          value={worldviewResponses[question.id] || ''}
                          onChange={(e) => setWorldviewResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={async () => {
                      const scores = computeWorldviewScore(ideoBooks, worldviewResponses, userCredentials, selfAssessment, ideoChatHistory);
                      setConfidenceScores(scores);
                      
                      // Save assessment results
                      const assessment = await saveAssessment(scores, worldviewResponses, ideoBooks, ideoChatHistory);
                      console.log('Worldview Assessment Results:', assessment);
                      
                      // Scroll to top of results
                      const modalContent = document.querySelector('.overflow-auto');
                      if (modalContent) {
                        modalContent.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                  >
                    🧮 Compute Assessment
                  </button>
                  <button 
                    onClick={() => setWorldviewQuizOpen(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
