import React, { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Utility function to format numbers
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatBTC = (amount) => {
  return `₿${amount.toFixed(8)}`;
};

const formatPercentage = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// Dashboard Component
const Dashboard = ({ bitcoinData, onNavigate }) => {
  const priceChangeColor = bitcoinData?.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400';
  const volatilityLevel = bitcoinData?.volatility > 0.05 ? 'High' : bitcoinData?.volatility > 0.02 ? 'Medium' : 'Low';
  const volatilityColor = bitcoinData?.volatility > 0.05 ? 'text-red-400' : bitcoinData?.volatility > 0.02 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">UVQ Oracle Agent</h1>
        <p className="text-gray-400">UniversifiQuant - Bitcoin Payment Timing Intelligence</p>
      </div>

      {/* Bitcoin Price Card */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Bitcoin Price</h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {bitcoinData ? formatCurrency(bitcoinData.price) : 'Loading...'}
            </div>
            <div className={`text-sm ${priceChangeColor}`}>
              {bitcoinData && bitcoinData.price_change_24h ? formatPercentage(bitcoinData.price_change_24h) : '...'} 24h
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Volatility:</span>
            <div className={`font-semibold ${volatilityColor}`}>
              {volatilityLevel} ({bitcoinData?.volatility ? (bitcoinData.volatility * 100).toFixed(2) : '0.00'}%)
            </div>
          </div>
          <div>
            <span className="text-gray-400">Volume 24h:</span>
            <div className="text-white font-semibold">
              {bitcoinData?.volume_24h ? formatCurrency(bitcoinData.volume_24h) : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Network Fees:</span>
            <div className="text-white font-semibold">
              {bitcoinData?.network_fees ? `${bitcoinData.network_fees.medium} sat/vB` : 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Timing Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
          onClick={() => onNavigate('retirement')}
        >
          <div className="text-blue-400 text-2xl mb-2">🏦</div>
          <h3 className="text-lg font-semibold text-white mb-2">Retirement Planning</h3>
          <p className="text-gray-400 text-sm">Calculate Bitcoin allocation for retirement with inflation hedging</p>
        </div>
        
        <div 
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 cursor-pointer transition-colors"
          onClick={() => onNavigate('health')}
        >
          <div className="text-green-400 text-2xl mb-2">🏥</div>
          <h3 className="text-lg font-semibold text-white mb-2">Health Plans</h3>
          <p className="text-gray-400 text-sm">Optimize Bitcoin payments for healthcare expenses</p>
        </div>
        
        <div 
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 cursor-pointer transition-colors"
          onClick={() => onNavigate('university')}
        >
          <div className="text-purple-400 text-2xl mb-2">🎓</div>
          <h3 className="text-lg font-semibold text-white mb-2">University Savings</h3>
          <p className="text-gray-400 text-sm">Plan Bitcoin savings for education costs over 10 years</p>
        </div>
        
        <div 
          className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 cursor-pointer transition-colors"
          onClick={() => onNavigate('daily')}
        >
          <div className="text-yellow-400 text-2xl mb-2">🍽️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Daily Expenses</h3>
          <p className="text-gray-400 text-sm">Best timing for restaurants, trips, and daily Bitcoin payments</p>
        </div>
      </div>

      {/* Quick Analysis */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Market Timing Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm text-gray-400">Current Timing</div>
            <div className="text-lg font-semibold text-white">
              {bitcoinData?.volatility > 0.05 ? 'Wait' : bitcoinData?.price_change_24h < -3 ? 'Good Time' : 'Neutral'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-sm text-gray-400">Network Status</div>
            <div className="text-lg font-semibold text-white">
              {bitcoinData?.network_fees?.medium < 15 ? 'Low Fees' : 'High Fees'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm text-gray-400">Recommendation</div>
            <div className="text-lg font-semibold text-white">
              {bitcoinData?.volatility > 0.05 ? 'DCA Strategy' : 'Lump Sum OK'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Payment Calculator Component
const PaymentCalculator = ({ scenarioType, bitcoinData, onBack }) => {
  const [formData, setFormData] = useState({
    amount_usd: '',
    target_date: '',
    risk_tolerance: 'medium',
    inflation_rate: 0.07
  });
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scenarioConfig = {
    retirement: {
      title: 'Retirement Planning Calculator',
      icon: '🏦',
      description: 'Calculate optimal Bitcoin allocation for retirement with 7% inflation hedge',
      defaultAmount: 50000,
      timeframe: '10-30 years'
    },
    health: {
      title: 'Health Plan Calculator', 
      icon: '🏥',
      description: 'Optimize Bitcoin payments for healthcare expenses',
      defaultAmount: 10000,
      timeframe: '1-5 years'
    },
    university: {
      title: 'University Savings Calculator',
      icon: '🎓', 
      description: 'Plan Bitcoin savings for education costs over 10 years',
      defaultAmount: 100000,
      timeframe: '10 years'
    },
    daily: {
      title: 'Daily Expenses Calculator',
      icon: '🍽️',
      description: 'Optimal timing for restaurants, trips, and daily Bitcoin payments',
      defaultAmount: 500,
      timeframe: 'Immediate'
    }
  };

  const config = scenarioConfig[scenarioType];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create scenario
      const scenarioData = {
        scenario_type: scenarioType,
        amount_usd: parseFloat(formData.amount_usd),
        target_date: formData.target_date || null,
        risk_tolerance: formData.risk_tolerance,
        inflation_rate: formData.inflation_rate
      };

      const scenarioResponse = await axios.post(`${API}/scenarios`, scenarioData);
      const scenario = scenarioResponse.data;

      // Get analysis
      const analysisResponse = await axios.post(`${API}/analyze/${scenario.id}`);
      setRecommendation(analysisResponse.data);
    } catch (err) {
      setError('Failed to generate recommendation. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="text-center mb-8">
        <div className="text-4xl mb-2">{config.icon}</div>
        <h1 className="text-3xl font-bold text-white mb-2">{config.title}</h1>
        <p className="text-gray-400">{config.description}</p>
        <p className="text-sm text-gray-500 mt-2">Typical timeframe: {config.timeframe}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (USD)
            </label>
            <input
              type="number"
              value={formData.amount_usd}
              onChange={(e) => setFormData({...formData, amount_usd: e.target.value})}
              placeholder={config.defaultAmount.toString()}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {scenarioType !== 'daily' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Risk Tolerance
            </label>
            <select
              value={formData.risk_tolerance}
              onChange={(e) => setFormData({...formData, risk_tolerance: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low - Conservative approach</option>
              <option value="medium">Medium - Balanced strategy</option>
              <option value="high">High - Aggressive timing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expected Inflation Rate
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.inflation_rate}
              onChange={(e) => setFormData({...formData, inflation_rate: parseFloat(e.target.value)})}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Enter as decimal (0.07 for 7%)</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Generate Recommendation'}
          </button>

          {error && (
            <div className="text-red-400 text-sm mt-2">{error}</div>
          )}
        </form>

        {recommendation && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">AI Recommendation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400">Recommended Bitcoin Amount</div>
                <div className="text-2xl font-bold text-white">
                  {formatBTC(recommendation.recommended_btc_amount)}
                </div>
                <div className="text-sm text-gray-400">
                  ≈ {formatCurrency(recommendation.recommended_btc_amount * bitcoinData.price)}
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400">Optimal Timing</div>
                <div className="text-2xl font-bold text-white capitalize">
                  {recommendation.optimal_timing.replace('_', ' ')}
                </div>
                <div className="text-sm text-gray-400">
                  Confidence: {(recommendation.confidence_score * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-300 mb-2">Analysis & Reasoning</div>
                <div className="bg-gray-700 rounded-lg p-3 text-gray-200 text-sm">
                  {recommendation.reasoning}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400">Risk Level</div>
                  <div className={`font-semibold capitalize ${
                    recommendation.risk_assessment === 'low' ? 'text-green-400' :
                    recommendation.risk_assessment === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {recommendation.risk_assessment}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400">Volatility Forecast</div>
                  <div className="font-semibold text-white">
                    {(recommendation.volatility_forecast * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400">Projected Savings</div>
                  <div className="font-semibold text-white">
                    {recommendation.projected_savings ? formatCurrency(recommendation.projected_savings) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [bitcoinData, setBitcoinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBitcoinData = async () => {
    try {
      const response = await axios.get(`${API}/bitcoin/current`);
      setBitcoinData(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch Bitcoin data');
      console.error('Bitcoin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitcoinData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchBitcoinData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const handleBack = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white">Loading UVQ Oracle Agent...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {currentView === 'dashboard' && (
          <Dashboard bitcoinData={bitcoinData} onNavigate={handleNavigate} />
        )}
        
        {['retirement', 'health', 'university', 'daily'].includes(currentView) && (
          <PaymentCalculator 
            scenarioType={currentView} 
            bitcoinData={bitcoinData}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}

export default App;
