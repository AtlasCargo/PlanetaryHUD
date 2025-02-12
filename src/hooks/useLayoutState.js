import { useReducer } from 'react';

// Initial state configuration for layout dimensions and interactions
const initialState = {
  leftSidebarWidth: 18,    // Width in percentage
  rightSidebarWidth: 18,   // Width in percentage
  topDivHeight: 120,       // Height in pixels
  bottomDivHeight: 60,     // Height in pixels
  isResizingTop: false,    // Tracks top div resize state
  isResizingBottom: false, // Tracks bottom div resize state
  activeDataset: null      // Currently displayed dataset
};

/* IMPROVEMENT SUGGESTIONS:
 * 1. Add min/max constraints as constants
 * 2. Consider adding responsive breakpoints
 * 3. Add transition states for smooth animations
 * 4. Implement localStorage persistence for user preferences
 * 5. Add resize history for undo/redo functionality
 */

const layoutReducer = (state, action) => {
  switch (action.type) {
    case 'START_RESIZE':
      return {
        ...state,
        [`isResizing${action.direction}`]: true
      };
    case 'END_RESIZE':
      // Reset all resize states to prevent stuck states
      return {
        ...state,
        isResizingTop: false,
        isResizingBottom: false
      };
    case 'UPDATE_HEIGHT':
      // Ensure height stays within acceptable range
      return {
        ...state,
        [`${action.direction}DivHeight`]: Math.max(40, action.height)
      };
    case 'SET_DATASET':
      return {
        ...state,
        activeDataset: action.dataset
      };
    default:
      return state;
  }
};

/* IMPROVEMENT SUGGESTIONS:
 * 1. Add error boundaries for invalid state updates
 * 2. Implement state validation middleware
 * 3. Add debug logging in development mode
 * 4. Consider adding state compression for complex datasets
 */

export const useLayoutState = () => {
  const [state, dispatch] = useReducer(layoutReducer, initialState);
  
  // Centralized resize handler to maintain consistent behavior
  const handleResize = (e, direction) => {
    if (direction === 'top') {
      // Calculate new height within constraints for top div
      const newHeight = Math.min(Math.max(80, e.clientY), 200);
      dispatch({ type: 'UPDATE_HEIGHT', direction: 'top', height: newHeight });
    } else if (direction === 'bottom') {
      // Calculate new height within constraints for bottom div
      const windowHeight = window.innerHeight;
      const newHeight = Math.min(Math.max(40, windowHeight - e.clientY), 120);
      dispatch({ type: 'UPDATE_HEIGHT', direction: 'bottom', height: newHeight });
    }
  };

  return { 
    state, 
    dispatch,
    handleResize
  };
}; 