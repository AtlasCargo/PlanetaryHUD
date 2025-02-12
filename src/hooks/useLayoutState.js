import { useReducer, useEffect } from 'react';

// Function to calculate initial dimensions based on screen size
const getInitialDimensions = () => {
  const isMobile = window.innerWidth <= 768;
  const isLandscape = window.innerWidth > window.innerHeight;

  return {
    leftSidebarWidth: isMobile ? (isLandscape ? 15 : 0) : 18,    // Width in percentage
    rightSidebarWidth: isMobile ? (isLandscape ? 15 : 0) : 18,   // Width in percentage
    topDivHeight: isMobile ? 80 : 120,       // Height in pixels
    bottomDivHeight: isMobile ? 40 : 60,     // Height in pixels
    isResizingTop: false,
    isResizingBottom: false,
    activeDataset: null
  };
};

const initialState = getInitialDimensions();

const layoutReducer = (state, action) => {
  switch (action.type) {
    case 'START_RESIZE':
      return {
        ...state,
        [`isResizing${action.direction}`]: true
      };
    case 'STOP_RESIZE':
      return {
        ...state,
        [`isResizing${action.direction}`]: false
      };
    case 'UPDATE_WIDTH':
      return {
        ...state,
        [`${action.side}SidebarWidth`]: action.width
      };
    case 'UPDATE_HEIGHT':
      return {
        ...state,
        [`${action.direction}DivHeight`]: action.height
      };
    case 'SET_ACTIVE_DATASET':
      return {
        ...state,
        activeDataset: action.dataset
      };
    case 'RESIZE_FOR_SCREEN':
      return {
        ...state,
        ...getInitialDimensions()
      };
    default:
      return state;
  }
};

const useLayoutState = () => {
  const [state, dispatch] = useReducer(layoutReducer, initialState);

  const handleResize = (direction, e) => {
    if (direction === 'top') {
      const maxHeight = window.innerHeight * 0.3; // 30% of viewport height
      const minHeight = window.innerWidth <= 768 ? 60 : 80;
      const newHeight = Math.min(Math.max(minHeight, e.clientY), maxHeight);
      dispatch({ type: 'UPDATE_HEIGHT', direction: 'top', height: newHeight });
    } else if (direction === 'bottom') {
      const windowHeight = window.innerHeight;
      const minHeight = window.innerWidth <= 768 ? 30 : 40;
      const maxHeight = window.innerWidth <= 768 ? 80 : 120;
      const newHeight = Math.min(Math.max(minHeight, windowHeight - e.clientY), maxHeight);
      dispatch({ type: 'UPDATE_HEIGHT', direction: 'bottom', height: newHeight });
    }
  };

  // Add window resize listener
  useEffect(() => {
    const handleWindowResize = () => {
      dispatch({ type: 'RESIZE_FOR_SCREEN' });
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, []);

  return { 
    state, 
    dispatch,
    handleResize
  };
};

export default useLayoutState;