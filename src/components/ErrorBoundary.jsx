import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999999] bg-black/80 text-white p-4 overflow-auto">
          <div className="max-w-3xl mx-auto bg-gray-900 border border-red-600/40 rounded-lg p-4">
            <h2 className="text-lg font-bold text-red-400 mb-2">A runtime error occurred</h2>
            <div className="text-sm text-red-300 mb-3">{this.state.error?.message || String(this.state.error)}</div>
            {this.state.errorInfo?.componentStack && (
              <pre className="text-xs whitespace-pre-wrap bg-black/40 p-3 rounded border border-gray-700 overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <div className="mt-3 text-xs text-gray-400">This is a temporary error screen to help diagnose the issue.</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



