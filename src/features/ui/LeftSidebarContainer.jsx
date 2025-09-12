import React from 'react';
import LeftSidebar from './LeftSidebar';
import SidebarHeader from './SidebarHeader';
import ChatSidebar from './ChatSidebar';
import LeftSidebarContent from './LeftSidebarContent';

export default function LeftSidebarContainer(props) {
  const {
    leftHidden,
    sidebarWidthVw,
    glowEnabled,
    isResizingLeft,
    onStartResizeLeft,
    // Header controls
    hamburgerOpen,
    onToggleHamburger,
    showHomeButton,
    onGoHome,
    onGoChat,
    isHomeMode,
    onCollapseLeft,
    onOpenAccount,
    onOpenChat,
    onOpenOtherSettings,
    onOpenIdeologram,
    onOpenFinancial,
    onToggleAvatarRig,
    onToggleWarRoom,
    warRoomMode,
    // Chat sidebar
    mode,
    chatHistory,
    onNewChat,
    onOpenConversation,
    // Left content
    renderDatasetSelector,
    datasetQuery,
    setDatasetQuery,
    handleSearch,
    datasetSearchResults,
    countryList,
    setSelectedRegion,
    user,
    fileTree,
    filePreviews,
    onFileClick,
    onRefreshFiles,
    ideoScores,
    setIdeoScores,
    API,
    activeGlobeDataset,
    populationYears,
    selectedPopulationYear,
    setSelectedPopulationYear,
    lifeExpYears,
    selectedLifeExpYear,
    setSelectedLifeExpYear,
    gdpYears,
    selectedGdpYear,
    setSelectedGdpYear,
    civAge,
    setCivAge,
    isLoggedIn,
    setShowFinancial,
    leftSidebarContentRef,
    currentConversation,
    handleChatSend,
    setMode,
    handleProcessDataset,
  } = props;

  return (
    <LeftSidebar
      leftHidden={leftHidden}
      sidebarWidthVw={sidebarWidthVw}
      glowEnabled={glowEnabled}
      isResizingLeft={isResizingLeft}
      onStartResizeLeft={onStartResizeLeft}
    >
      {!leftHidden && (
        <>
          <SidebarHeader
            glowEnabled={glowEnabled}
            hamburgerOpen={hamburgerOpen}
            onToggleHamburger={onToggleHamburger}
            showHomeButton={showHomeButton}
            onGoHome={onGoHome}
            onGoChat={onGoChat}
            isHomeMode={isHomeMode}
            onCollapseLeft={onCollapseLeft}
            onOpenAccount={onOpenAccount}
            onOpenChat={onOpenChat}
            onOpenOtherSettings={onOpenOtherSettings}
            onOpenIdeologram={onOpenIdeologram}
            onOpenFinancial={onOpenFinancial}
            onToggleAvatarRig={onToggleAvatarRig}
            onToggleWarRoom={onToggleWarRoom}
            warRoomMode={warRoomMode}
          />

          {mode === 'chat' ? (
            <ChatSidebar
              chatHistory={chatHistory}
              onNewChat={onNewChat}
              onOpenConversation={onOpenConversation}
            />
          ) : (
            <LeftSidebarContent
              mode={mode}
              renderDatasetSelector={renderDatasetSelector}
              datasetQuery={datasetQuery}
              setDatasetQuery={setDatasetQuery}
              handleSearch={handleSearch}
              datasetSearchResults={datasetSearchResults}
              countryList={countryList}
              setSelectedRegion={setSelectedRegion}
              user={user}
              fileTree={fileTree}
              fileOpen={null}
              filePreviews={filePreviews}
              onFileClick={onFileClick}
              onRefreshFiles={onRefreshFiles}
              ideoScores={ideoScores}
              setIdeoScores={setIdeoScores}
              API={API}
              activeGlobeDataset={activeGlobeDataset}
              populationYears={populationYears}
              selectedPopulationYear={selectedPopulationYear}
              setSelectedPopulationYear={setSelectedPopulationYear}
              lifeExpYears={lifeExpYears}
              selectedLifeExpYear={selectedLifeExpYear}
              setSelectedLifeExpYear={setSelectedLifeExpYear}
              gdpYears={gdpYears}
              selectedGdpYear={selectedGdpYear}
              setSelectedGdpYear={setSelectedGdpYear}
              civAge={civAge}
              setCivAge={setCivAge}
              isLoggedIn={isLoggedIn}
              setShowFinancial={setShowFinancial}
              leftSidebarContentRef={leftSidebarContentRef}
              currentConversation={currentConversation}
              handleChatSend={handleChatSend}
              setMode={setMode}
              handleProcessDataset={handleProcessDataset}
            />
          )}
        </>
      )}
    </LeftSidebar>
  );
}



