// Supabase service functions for Ideologram data
import { supabase, isSupabaseAvailable, getFallbackStorage } from './supabaseClient';

// Database table names
const TABLES = {
  USERS: 'users',
  IDEOLOGRAM_LIBRARY: 'ideologram_library',
  IDEOLOGRAM_ENRICHED: 'ideologram_enriched',
  IDEOLOGRAM_SCORES: 'ideologram_scores',
  IDEOLOGRAM_ASSESSMENTS: 'ideologram_assessments',
  IDEOLOGRAM_CHAT_HISTORY: 'ideologram_chat_history'
};

// Fallback storage for when Supabase is not available
const fallbackStorage = getFallbackStorage();

// Helper function to get user-specific key
const getUserKey = (userId, type) => `user_${userId}_${type}`;

// Library operations
export const supabaseLibrary = {
  // Get user's library
  async get(userId) {
    if (isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from(TABLES.IDEOLOGRAM_LIBRARY)
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }
        
        return data?.books || [];
      } catch (error) {
        console.error('Supabase library get error:', error);
        return [];
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'library');
      return fallbackStorage.get(key) || [];
    }
  },

  // Save user's library
  async save(userId, books) {
    if (isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from(TABLES.IDEOLOGRAM_LIBRARY)
          .upsert({
            user_id: userId,
            books: books,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Supabase library save error:', error);
        return false;
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'library');
      return fallbackStorage.set(key, books);
    }
  }
};

// Enriched data operations
export const supabaseEnriched = {
  // Get user's enriched data
  async get(userId) {
    if (isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from(TABLES.IDEOLOGRAM_ENRICHED)
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        return data?.items || [];
      } catch (error) {
        console.error('Supabase enriched get error:', error);
        return [];
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'enriched');
      return fallbackStorage.get(key) || [];
    }
  },

  // Save user's enriched data
  async save(userId, items) {
    if (isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from(TABLES.IDEOLOGRAM_ENRICHED)
          .upsert({
            user_id: userId,
            items: items,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Supabase enriched save error:', error);
        return false;
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'enriched');
      return fallbackStorage.set(key, items);
    }
  }
};

// Scores operations
export const supabaseScores = {
  // Get user's scores
  async get(userId) {
    if (isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from(TABLES.IDEOLOGRAM_SCORES)
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        return data?.entries || [];
      } catch (error) {
        console.error('Supabase scores get error:', error);
        return [];
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'scores');
      return fallbackStorage.get(key) || [];
    }
  },

  // Save user's scores
  async save(userId, entries) {
    if (isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from(TABLES.IDEOLOGRAM_SCORES)
          .upsert({
            user_id: userId,
            entries: entries,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Supabase scores save error:', error);
        return false;
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'scores');
      return fallbackStorage.set(key, entries);
    }
  }
};

// Assessments operations
export const supabaseAssessments = {
  // Get user's assessments
  async get(userId) {
    if (isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from(TABLES.IDEOLOGRAM_ASSESSMENTS)
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        return data?.entries || [];
      } catch (error) {
        console.error('Supabase assessments get error:', error);
        return [];
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'assessments');
      return fallbackStorage.get(key) || [];
    }
  },

  // Save user's assessments
  async save(userId, entries) {
    if (isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from(TABLES.IDEOLOGRAM_ASSESSMENTS)
          .upsert({
            user_id: userId,
            entries: entries,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Supabase assessments save error:', error);
        return false;
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'assessments');
      return fallbackStorage.set(key, entries);
    }
  }
};

// Chat history operations
export const supabaseChatHistory = {
  // Get user's chat history
  async get(userId) {
    if (isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from(TABLES.IDEOLOGRAM_CHAT_HISTORY)
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        return data?.messages || [];
      } catch (error) {
        console.error('Supabase chat history get error:', error);
        return [];
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'chat_history');
      return fallbackStorage.get(key) || [];
    }
  },

  // Save user's chat history
  async save(userId, messages) {
    if (isSupabaseAvailable()) {
      try {
        const { error } = await supabase
          .from(TABLES.IDEOLOGRAM_CHAT_HISTORY)
          .upsert({
            user_id: userId,
            messages: messages,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Supabase chat history save error:', error);
        return false;
      }
    } else {
      // Fallback to localStorage
      const key = getUserKey(userId, 'chat_history');
      return fallbackStorage.set(key, messages);
    }
  }
};
