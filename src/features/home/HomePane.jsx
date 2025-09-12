import React from 'react';
import GraphViewContainer from './GraphViewContainer';
import HomeGlobeView from './HomeGlobeView';

export default function HomePane({
  mode,
  showGraph,
  activeDataset,
  onCloseGraph,
  rightHidden,
  sidebarWidths,
  homeProps,
}) {
  return (
    <>
      <GraphViewContainer
        visible={mode === 'home' && showGraph && !!activeDataset}
        dataset={activeDataset}
        onClose={onCloseGraph}
        rightMargin={!rightHidden ? `${sidebarWidths.right}vw` : '0'}
      />
      <HomeGlobeView
        visible={mode === 'home' && !showGraph && !homeProps.showFinancial}
        {...homeProps}
      />
    </>
  );
}


