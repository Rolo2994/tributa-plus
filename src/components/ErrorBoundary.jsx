import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary atrapó:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, color: '#C8102E', background: '#fff', height: '100%', overflow: 'auto' }}>
          <b>Algo se rompió en esta pantalla.</b>
          <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{String(this.state.error.message || this.state.error)}</p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 12, padding: '8px 12px', background: '#0B3A60', color: '#fff', borderRadius: 8, border: 'none' }}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}