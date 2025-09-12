import React from 'react';
import GraphComponent from '../../components/GraphComponent';

export default function GraphView({ dataset, onClose, rightMargin }) {
  return (
    <GraphComponent dataset={dataset} onClose={onClose} rightMargin={rightMargin} />
  );
}



