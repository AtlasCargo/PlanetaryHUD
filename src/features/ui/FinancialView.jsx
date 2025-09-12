import React from 'react';
import FinancialDashboard from '../../components/FinancialDashboard';

export default function FinancialView({ onExit }) {
  return (
    <div className="relative w-full h-full overflow-auto">
      <FinancialDashboard onExit={onExit} />
    </div>
  );
}



