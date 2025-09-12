import { useCallback, useState } from 'react';

export default function useViewController({ setMode }) {
  const [showFinancial, setShowFinancial] = useState(false);
  const [warRoomMode, setWarRoomMode] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  const goHome = useCallback(() => {
    setMode && setMode('home');
    setShowFinancial(false);
    setWarRoomMode(false);
  }, [setMode]);

  const openFinancial = useCallback(() => {
    setShowFinancial(true);
  }, []);

  const toggleWarRoom = useCallback(() => {
    setWarRoomMode((v) => !v);
  }, []);

  const onExitFinancial = useCallback(() => setShowFinancial(false), []);

  return {
    showFinancial,
    setShowFinancial,
    warRoomMode,
    setWarRoomMode,
    hamburgerOpen,
    setHamburgerOpen,
    goHome,
    openFinancial,
    toggleWarRoom,
    onExitFinancial,
  };
}


