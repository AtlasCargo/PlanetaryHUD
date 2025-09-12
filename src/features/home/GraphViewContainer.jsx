import React from 'react';
import GraphView from '../../components/GraphComponent.jsx';

export default function GraphViewContainer({ visible, dataset, onClose, rightMargin }) {
  if (!visible || !dataset) return null;
  return (
    <GraphView
      dataset={dataset}
      onClose={onClose}
      rightMargin={rightMargin}
    />
  );
}



