import React, { useEffect, useState } from 'react';
import ResizablePanel from './UI/ResizablePanel';
import { getIndicatorData } from '../services/worldBankApi';
import { getHistoricalMarketCap } from '../services/financialApi';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend
);

export default function FinancialDashboard({ onExit }) {
  const [corpData, setCorpData] = useState([]);
  const [gdpData, setGdpData] = useState({});
  const [years, setYears] = useState([]);
  const [compMap, setCompMap] = useState({});
  const [compYears, setCompYears] = useState([]);

  useEffect(() => {
    (async () => {
      const now = new Date().getFullYear();
      const startYear = now - 15;
      // Corporate market cap ratio
      const corpMap = await getIndicatorData('WLD', 'CM.MKT.LCAP.GD.ZS', startYear, now);
      const corpSeries = (corpMap['WLD'] || []).map(d => ({ year: +d.date, value: +d.value })).sort((a,b) => a.year - b.year);
      setCorpData(corpSeries);

      // Fetch top 10 companies' market cap
      const companyNames = { AAPL:'Apple', MSFT:'Microsoft', NVDA:'NVIDIA', GOOGL:'Alphabet', AMZN:'Amazon', TSLA:'Tesla', META:'Meta', JPM:'JPMorgan', UNH:'UnitedHealth', V:'Visa' };
      const topCompanies = Object.keys(companyNames);
      const years15 = corpSeries.map(d=>d.year);
      setCompYears(years15);
      const seriesArr = await Promise.all(topCompanies.map(async sym => {
        try {
          return await getHistoricalMarketCap(sym, startYear);
        } catch (err) {
          console.error(`Error fetching market cap for ${sym}:`, err);
          return [];
        }
      }));
      const compObj = {};
      topCompanies.forEach((sym,i)=> compObj[sym]= seriesArr[i]);
      setCompMap(compObj);

      // World GDP top 20 economies
      const top20 = ['US','CN','JP','DE','IN','GB','FR','IT','BR','CA','RU','KR','AU','ES','MX','ID','NL','CH','SA','TR'];
      const gdpMap = await getIndicatorData(top20, 'NY.GDP.MKTP.CD', now - 150, now);
      const allYears = Array.from(new Set(Object.values(gdpMap).flat().map(d => +d.date))).sort((a,b) => a - b);
      setYears(allYears);
      const obj = {};
      top20.forEach(code => {
        const series = gdpMap[code] || [];
        obj[code] = { name: series[0]?.country?.value || code, data: allYears.map(y => {
          const e = series.find(x => +x.date === y);
          return e && e.value != null ? +e.value : null;
        }) };
      });
      setGdpData(obj);
    })();
  }, []);

  const corpChart = { labels: corpData.map(d=>d.year), datasets: [{ label: '% GDP', data: corpData.map(d=>d.value), backgroundColor: 'rgba(53,162,235,0.7)' }] };
  const gdpChart = {
    labels: years,
    datasets: Object.entries(gdpData).map(([c,{name,data}], idx, arr) => {
      const hue = idx * (360 / arr.length);
      const color = `hsl(${hue},70%,50%)`;
      return {
        label: name,
        data,
        fill: false,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2
      };
    })
  };
  const compChart = { 
    labels: compYears, 
    datasets: Object.entries(compMap).map(([sym,data],idx,arr)=>{ 
      const name = { AAPL:'Apple', MSFT:'Microsoft', NVDA:'NVIDIA', GOOGL:'Alphabet', AMZN:'Amazon', TSLA:'Tesla', META:'Meta', JPM:'JPMorgan', UNH:'UnitedHealth', V:'Visa' }[sym]||sym; 
      const hue=idx*(360/arr.length); 
      const color=`hsl(${hue},70%,60%)`; 
      return { 
        label:name, 
        data: compYears.map(y=>{ 
          const rec=(data||[]).find(d=>d.year===y); 
          return rec?rec.value:null; 
        }), 
        borderColor:color, 
        backgroundColor:color, 
        pointRadius:3,
        pointHoverRadius:6,
        fill:false, 
        borderWidth:2 
      }; 
    }) 
  };

  const corpOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Corporate Market Cap (% of GDP)' },
      tooltip: { callbacks: { label: ctx => ctx.parsed.y != null ? `${ctx.parsed.y.toFixed(2)}%` : 'N/A' } },
      legend: { display: false },
    },
    scales: {
      x: { title: { display: true, text: 'Year' } },
      y: { title: { display: true, text: '% of GDP' }, beginAtZero: true },
    }
  };

  const gdpOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'World GDP of Top 20 Economies (Constant USD)' },
      tooltip: { callbacks: { label: ctx => Intl.NumberFormat('en-US', { notation:'compact', style:'currency', currency:'USD' }).format(ctx.parsed.y) } },
    },
    scales: {
      x: { title: { display: true, text: 'Year' } },
      y: {
        title: { display: true, text: 'GDP (USD)' },
        type: 'logarithmic',
        ticks: { callback: val => Intl.NumberFormat('en-US', { notation:'compact' }).format(Number(val)) }
      }
    }
  };

  const compOptions = { 
    responsive:true, 
    maintainAspectRatio:false, 
    plugins:{ 
      title:{display:true,text:'Top 10 Companies Market Cap (Last 15 Years)'}, 
      tooltip:{callbacks:{label:ctx=>Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact'}).format(ctx.parsed.y)}}, 
      legend:{
        position:'bottom',
        labels:{
          color:'#fff',
          font:{ size: 10 },
          boxWidth: 10,
          padding: 8
        }
      }
    }, 
    scales:{ 
      x:{title:{display:true,text:'Year'}}, 
      y:{title:{display:true,text:'Market Cap (USD)'}, type:'logarithmic', ticks:{callback:val=>Intl.NumberFormat('en-US',{notation:'compact'}).format(Number(val))}} 
    } 
  };

  const hasCompData = compYears.length > 0 && Object.values(compMap).some(arr => arr && arr.length > 0);

  // Test scraper input & chart state
  const [testSymbol, setTestSymbol] = useState('AAPL');
  const [testSeries, setTestSeries] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);
  const fetchTestData = async () => {
    setTestLoading(true);
    setTestError(null);
    try {
      const now = new Date().getFullYear();
      const data = await getHistoricalMarketCap(testSymbol, now - 15);
      setTestSeries(data);
    } catch (e) {
      console.error('Test scrape failed', e);
      setTestError(e.message);
      setTestSeries([]);
    } finally {
      setTestLoading(false);
    }
  };
  useEffect(() => { fetchTestData(); }, []);

  const testChart = {
    labels: testSeries.map(d => d.year),
    datasets: [{
      label: `${testSymbol} Market Cap`,
      data: testSeries.map(d => d.value),
      borderColor: 'hsl(200,70%,50%)',
      backgroundColor: 'hsl(200,70%,50%)',
      borderWidth: 2,
      pointRadius: 3,
      fill: false
    }]
  };
  const testOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { title: { display: true, text: `${testSymbol} Market Cap (Scraped)` }, legend: { display: false } },
    scales: { x: { title: { display: true, text: 'Year' } }, y: { title: { display: true, text: 'Market Cap (USD)' }, ticks: { callback: val => Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'USD' }).format(val) } } }
  };

  return (
    <div className="w-full h-full p-4 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-neon-blue">Financial Mode</h2>
        <button
          onClick={onExit}
          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
        >
          Exit Financial Mode
        </button>
      </div>

      {/* FinTech Simulator (Docked, Resizable) */}
      <div className="mb-4">
        <div className="p-3 pb-2 text-neon-blue font-semibold">FinTech Feedback Loop Simulator</div>
        <ResizablePanel
          initial={{ h: 60 }}
          min={{ h: 30 }}
          max={{ h: 90 }}
          persistKey="fintech-panel"
          className="rounded-xl border border-neon-blue/20 bg-gray-900/40"
        >
          <iframe
            src="/fintech/feedback_loop_simulator.html"
            title="FinTech"
            className="w-full h-full border-0"
          />
        </ResizablePanel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 h-80">
          <h3 className="text-lg font-bold text-neon-blue mb-2">Corporate Market Cap (% GDP) - Last 15 Years</h3>
          <Bar data={corpChart} options={corpOptions} height={300} />
        </div>
        <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 h-80">
          <h3 className="text-lg font-bold text-neon-blue mb-2">Top 10 Companies Market Cap - Last 15 Years</h3>
          {hasCompData ? (
            <Line data={compChart} options={compOptions} height={300} />
          ) : (
            <div className="mt-4 text-center text-gray-300 italic">No company data – set REACT_APP_FMP_API_KEY in .env</div>
          )}
        </div>
        <div className="p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20 md:col-span-2 h-96">
          <h3 className="text-lg font-bold text-neon-blue mb-2">World GDP of Top 20 Economies (150 Years)</h3>
          <Line data={gdpChart} options={gdpOptions} height={400} />
        </div>
      </div>
      {/* Test Scraper Section */}
      <div className="mt-8 p-4 bg-gray-900/40 rounded-xl border border-neon-blue/20">
        <h3 className="text-lg font-bold text-neon-blue mb-2">Test Scrape</h3>
        {testLoading && <div className="text-gray-300">Loading...</div>}
        {testError && <div className="text-red-500">Error: {testError}</div>}
        <form onSubmit={e => { e.preventDefault(); fetchTestData(); }} className="flex items-center mb-4 space-x-2">
          <input
            type="text"
            value={testSymbol}
            onChange={e => setTestSymbol(e.target.value.toUpperCase())}
            className="px-2 py-1 rounded bg-gray-800 text-white"
            placeholder="Symbol"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-neon-blue text-black rounded hover:bg-neon-blue/80"
          >
            Scrape
          </button>
        </form>
        {testSeries.length > 0 && !testLoading && (
          <Line data={testChart} options={testOptions} height={200} />
        )}
        {!testSeries.length && !testLoading && !testError && (
          <div className="text-gray-300 italic">Enter a ticker and click Scrape</div>
        )}
      </div>
    </div>
  );
}
